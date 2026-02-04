const { decodePayloadFromLMS } = require("../utils/decoder");
const { AppDataSource } = require("../config/dataSource");
const Alert = require("../models/Alert");
const Terminal = require("../models/Terminal");
const Neighborhood = require("../models/Neighborhood");
const FocalPerson = require("../models/FocalPerson");
const { getOrFetchWeather } = require("../services/weatherCacheService");
const { sendDownlink } = require("./downlink");
const { handleBatteryAlarm, clearAlarm } = require("../services/alarmService");
const { getIO } = require("../realtime/socket");
const { deleteCache } = require("../config/cache");


// Helper: generate incremental Alert ID like ALRT001
async function generateAlertId() {
  const last = await AppDataSource.getRepository(Alert)
    .createQueryBuilder("alert")
    .orderBy("alert.id", "DESC")
    .getOne();

  let newNumber = 1;
  if (last) {
    const match = String(last.id).match(/(\d+)$/);
    if (match) newNumber = parseInt(match[1], 10) + 1;
  }
  return "ALRT" + String(newNumber).padStart(3, "0");
}

// Convert LMS terminal integer -> RESQWAVE format
function mapTerminal(rawId) {
  return "RESQWAVE" + String(rawId).padStart(3, "0");
}

const handleUplink = async (req, res) => {
  try {
    console.log('[LMS Uplink] Received webhook data:', JSON.stringify(req.body, null, 2));
    
    const result = decodePayloadFromLMS(req.body);

    const mappedTerminalId = mapTerminal(result.decoded.terminalID);

    // GLOBAL: Any Uplink (Battery OR Alert) means the device is alive
    // 1. Update Last Seen 
    await AppDataSource.getRepository(Terminal).update(
        { id: mappedTerminalId },
        { lastSeenAt: new Date() }
    );
    // 2. Clear "Extended Downtime" if it exists
    await clearAlarm(mappedTerminalId, "Extended Downtime");


    // Battery Payload - No Alert Logic
    if (result.type === "BATTERY") {
      await handleBatteryAlarm({
        terminalID: mappedTerminalId,
        batteryPercent: result.decoded.batteryPercent
      });

      return res.status(200).json({
        success: true,
        type: "BATTERY",
        decoded: result.decoded
      });
    }

    const alertType = result.decoded.alertType;

    // find the terminal object
    const terminal = await AppDataSource.getRepository(Terminal)
      .findOne({ where: { id: mappedTerminalId } });

    if (!terminal) {
      throw new Error(`Terminal not found: ${mappedTerminalId}`);
    }

    // --- CONTEXT & VERIFICATION START ---
    // Checks Manual Block (for ALL alerts) and Weather Risks (for Critical alerts)
    try {
        // 1. Fetch Context (Neighborhood/FocalPerson) for Coordinates
        let LAT = 14.7565;
        let LON = 121.0174;

        try {
            const neighborhood = await AppDataSource.getRepository(Neighborhood).findOne({
                where: { terminalID: mappedTerminalId }
            });

            if (neighborhood && neighborhood.focalPersonID) {
                const focalPerson = await AppDataSource.getRepository(FocalPerson).findOne({
                    where: { id: neighborhood.focalPersonID }
                });

                if (focalPerson && focalPerson.address) {
                    try {
                        const addressData = JSON.parse(focalPerson.address);
                        if (addressData.coordinates) {
                            const parts = addressData.coordinates.split(',').map(s => s.trim());
                            if (parts.length === 2) {
                                const parsedLon = parseFloat(parts[0]);
                                const parsedLat = parseFloat(parts[1]);
                                if (!isNaN(parsedLon) && !isNaN(parsedLat)) {
                                    LON = parsedLon;
                                    LAT = parsedLat;
                                    console.log(`[Uplink] Using dynamic coordinates for ${mappedTerminalId} (FP): ${LAT}, ${LON}`);
                                }
                            }
                        }
                    } catch (parseErr) { /* ignore */ }
                }
            }
        } catch (dbErr) {
            console.error("[Uplink] Error fetching neighborhood/focal person:", dbErr.message);
        }

        // 2. CHECK: Manual Block & Weather Verification
        // Get Weather Data (needed for both Manual Block check and Weather Risk)
        const weatherData = await getOrFetchWeather(mappedTerminalId, LAT, LON);

        // A. Manual Block (Dispatcher Override) - Blocks ALL alerts (Critical & User-Initiated)
        if (weatherData.manualBlockEnabled) {
            console.log(`[Uplink] 🚫 Manual Block ENABLED for terminal ${mappedTerminalId}. Blocking alert.`);
            
            const devEUI = result.devEUI || terminal.devEUI;
            if (devEUI) await sendDownlink(devEUI, "FalseAlarm");
            
            return res.status(200).json({
                success: true,
                status: "ignored_manual_block",
                message: "Alert blocked by dispatcher manual override."
            });
        }

        // B. Weather Verification (Only for Critical/Sensor alerts)
        if (alertType === "Critical" || alertType === "User-Initiated") {
            let isWeatherRisky = false;

            if (weatherData.weatherCheckEnabled === false) {
                 console.log(`[Uplink] ⚠️ Weather Check DISABLED for terminal ${mappedTerminalId}. Allowing alert regardless of weather.`);
                 isWeatherRisky = true; // Bypass check
            } else {
                // Simplified Risk Analysis
                const currentDescription = weatherData.current.description.toLowerCase();
                const isCurrentlyRaining = currentDescription.includes('rain') || 
                                           currentDescription.includes('drizzle') || 
                                           currentDescription.includes('thunderstorm');

                const nextForecast = weatherData.hourly[0];
                const precipitationProbability = nextForecast?.precipitation || 0;
                
                isWeatherRisky = isCurrentlyRaining || precipitationProbability >= 50;
                console.log(`[Uplink] Weather Check: ${isWeatherRisky ? "RISKY" : "NORMAL"} (IsRaining: ${isCurrentlyRaining}, RainProb: ${precipitationProbability}%)`);
            }

            if (!isWeatherRisky) {
                console.log(`[Uplink] False Alarm detected for ${mappedTerminalId}. Sending Downlink (FalseAlarm).`);
                
                const devEUI = result.devEUI || terminal.devEUI;
                if (devEUI) await sendDownlink(devEUI, "FalseAlarm");

                return res.status(200).json({
                    success: true,
                    status: "ignored_false_alarm",
                    message: "Alert blocked by weather verification. Downlink sent."
                });
            }
        }

    } catch (weatherErr) {
        console.error("\n[Uplink] ⚠️ WEATHER VERIFICATION ERROR:", weatherErr.message);
        console.error("Defaulting to ALLOW ALERT to ensure safety during system failure.\n");
    }
    // --- CONTEXT & VERIFICATION END ---

    const alertId = await generateAlertId();

    const newAlert = AppDataSource.getRepository(Alert).create({
      id: alertId,
      terminal: terminal,   // <-- relation, not terminalID
      alertType: alertType,
      sentThrough: "LMS",
      dateTimeSent: result.decoded.dateTimeSent,
      status: "Waitlist",
    });

    await AppDataSource.getRepository(Alert).save(newAlert);

    // --- REALTIME BROADCAST & CACHE INVALIDATION ---
    try {
        // Fetch neighborhood & focal person for the payload
        const neighborhood = await AppDataSource.getRepository(Neighborhood).findOne({
            where: { terminalID: mappedTerminalId }
        });

        let focalPerson = null;
        if (neighborhood && neighborhood.focalPersonID) {
            focalPerson = await AppDataSource.getRepository(FocalPerson).findOne({
                where: { id: neighborhood.focalPersonID }
            });
        }

        const livePayload = {
            alertId: alertId,
            terminalId: mappedTerminalId,
            communityGroupName: null, 
            alertType: alertType,
            status: "Waitlist",
            lastSignalTime: result.decoded.dateTimeSent,
            address: focalPerson?.address || null,
        };

        const mapPayload = {
            alertId: alertId,
            alertType: alertType,
            timeSent: result.decoded.dateTimeSent,
            alertStatus: "Waitlist",
            terminalId: terminal.id,
            terminalName: terminal.name || `Terminal ${mappedTerminalId}`,
            terminalStatus: terminal.status || 'Offline',
            focalPersonId: focalPerson?.id || null,
            focalFirstName: focalPerson?.firstName || 'N/A',
            focalLastName: focalPerson?.lastName || '',
            focalAddress: focalPerson?.address || null,
            focalContactNumber: focalPerson?.contactNumber || 'N/A',
        };

        const io = getIO();
        io.to("alerts:all").emit("liveReport:new", livePayload);
        io.to("alerts:all").emit("mapReport:new", mapPayload);
        io.to(`terminal:${mappedTerminalId}`).emit("liveReport:new", livePayload);
        io.to(`terminal:${mappedTerminalId}`).emit("mapReport:new", mapPayload);

        console.log(`[LMS Uplink] Broadcasted socket events for ${alertId}`);

        await deleteCache("adminDashboardStats");
        await deleteCache("adminDashboard:aggregatedMap");
        await deleteCache("mapAlerts:allOccupied");

    } catch (realtimeErr) {
        console.error("[LMS Uplink] Realtime update failed:", realtimeErr.message);
        // Continue, do not fail the request
    }
    // -----------------------------------------------

    res.status(200).json({
      success: true,
      decoded: result.decoded,
      alertId,
      mappedTerminalId,
      alertType
    });

  } catch (err) {
    console.error("[LMS Uplink] Error decoding or saving:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = { handleUplink };
