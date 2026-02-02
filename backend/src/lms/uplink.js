const { decodePayloadFromLMS } = require("../utils/decoder");
const { AppDataSource } = require("../config/dataSource");
const Alert = require("../models/Alert");
const Terminal = require("../models/Terminal");
const Neighborhood = require("../models/Neighborhood");
const FocalPerson = require("../models/FocalPerson");
const { getOrFetchWeather } = require("../services/weatherCacheService");
const { sendDownlink } = require("./downlink");
const { handleBatteryAlarm, clearAlarm } = require("../services/alarmService");


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

    // --- WEATHER VERIFICATION START ---
    // Only verify "Critical" (Sensor) alerts. User-Initiated (Panic Button) are always valid.
    if (alertType === "Critical") {
        try {
            // Default coordinates for Caloocan if terminal has no location
            let LAT = 14.7565;
            let LON = 121.0174;

            try {
                // Fetch Neighborhood to get Focal Person
                const neighborhood = await AppDataSource.getRepository(Neighborhood).findOne({
                    where: { terminalID: mappedTerminalId }
                });

                if (neighborhood && neighborhood.focalPersonID) {
                    const focalPerson = await AppDataSource.getRepository(FocalPerson).findOne({
                        where: { id: neighborhood.focalPersonID }
                    });

                    // Parse coordinates from FocalPerson address (stored as JSON string)
                    // Format: {"address":"...", "coordinates":"LON, LAT"}
                    if (focalPerson && focalPerson.address) {
                        try {
                            const addressData = JSON.parse(focalPerson.address);
                            if (addressData.coordinates) {
                                const parts = addressData.coordinates.split(',').map(s => s.trim());
                                if (parts.length === 2) {
                                  // Assuming "121.xxx, 14.xxx" -> Lon, Lat
                                  const parsedLon = parseFloat(parts[0]);
                                  const parsedLat = parseFloat(parts[1]);
                                  if (!isNaN(parsedLon) && !isNaN(parsedLat)) {
                                      LON = parsedLon;
                                      LAT = parsedLat;
                                      console.log(`[Uplink] Using dynamic coordinates for ${mappedTerminalId} (FP): ${LAT}, ${LON}`);
                                  }
                                }
                            }
                        } catch (parseErr) {
                           // If address is not JSON, ignore (use defaults)
                        }
                    }
                }
            } catch (dbErr) {
                console.error("[Uplink] Error fetching neighborhood/focal person:", dbErr.message);
                // Continue with default generic coordinates
            }

            // 1. Get Weather Data (using Cache Service)
            const weatherData = await getOrFetchWeather(mappedTerminalId, LAT, LON);

            // 2. Simplified Risk Analysis (Is it raining?)
            const currentDescription = weatherData.current.description.toLowerCase();
            const isCurrentlyRaining = currentDescription.includes('rain') || 
                                       currentDescription.includes('drizzle') || 
                                       currentDescription.includes('thunderstorm');

            // Optional: Also check forecast probability (e.g., > 50%) if you want to be proactive
            const nextForecast = weatherData.hourly[0];
            const precipitationProbability = nextForecast?.precipitation || 0;
            
            // "Risky" if it is physically raining OR high probability of rain (>50%)
            const isWeatherRisky = isCurrentlyRaining || precipitationProbability >= 50;

            console.log(`[Uplink] Weather Check: ${isWeatherRisky ? "RISKY" : "NORMAL"} (IsRaining: ${isCurrentlyRaining}, RainProb: ${precipitationProbability}%)`);

            if (!isWeatherRisky) {
                console.log(`[Uplink] False Alarm detected for ${mappedTerminalId}. Sending Downlink (FalseAlarm).`);
                
                const devEUI = result.devEUI || terminal.devEUI;
                if (devEUI) {
                    await sendDownlink(devEUI, "FalseAlarm");
                }

                // STOP HERE: Return success but do NOT save to DB
                return res.status(200).json({
                    success: true,
                    status: "ignored_false_alarm",
                    message: "Alert blocked by weather verification. Downlink sent."
                });
            }

        } catch (weatherErr) {
            console.error("\n[Uplink] ⚠️ WEATHER VERIFICATION ERROR:", weatherErr.message);
            console.error("Defaulting to ALLOW ALERT to ensure safety during system failure.\n");
            // On error, we allow the alert to ensure safety

            return res.status(200).json({
              success: true,
              status: "ignored_weather_unverified",
              message: "Alert blocked due to the weather verification failure."
            })
        }
    }
    // --- WEATHER VERIFICATION END ---

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
