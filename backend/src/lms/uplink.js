const { decodePayloadFromLMS } = require("../utils/decoder");
const { AppDataSource } = require("../config/dataSource");
const Alert = require("../models/Alert");

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

// Map LMS alert type to string
function mapAlertType(rawType) {
  return rawType === 1 ? "User-Initiated" : "Critical";
}

const handleUplink = async (req, res) => {
  try {
    const result = decodePayloadFromLMS(req.body);

    // Convert terminal + alert type
    const mappedTerminalId = mapTerminal(result.decoded.terminalID);
    const mappedAlertType = mapAlertType(result.decoded.alertType);

    // Generate sequential alert ID
    const alertId = await generateAlertId();

    const newAlert = AppDataSource.getRepository(Alert).create({
      id: alertId,
      terminalID: mappedTerminalId,
      alertType: mappedAlertType,
      sentThrough: "LMS",
      dateTimeSent: result.decoded.dateTimeSent,
      status: "Waitlist",
    });

    await AppDataSource.getRepository(Alert).save(newAlert);

    res.status(200).json({
      success: true,
      decoded: result.decoded,
      mapped: {
        terminalID: mappedTerminalId,
        alertType: mappedAlertType,
      },
      alertId,
    });

  } catch (err) {
    console.error("[LMS Uplink] Error decoding or saving:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = { handleUplink };
