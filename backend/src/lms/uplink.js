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

const handleUplink = async (req, res) => {
  try {
    const result = decodePayloadFromLMS(req.body);

    // Generate sequential Alert ID
    const alertId = await generateAlertId();

    const newAlert = AppDataSource.getRepository(Alert).create({
      id: alertId,
      terminalID: result.decoded.terminalID.toString(),
      alertType: result.decoded.alertType,
      sentThrough: "LMS",
      dateTimeSent: result.decoded.dateTimeSent,
      status: "Waitlist", // automatic
    });

    await AppDataSource.getRepository(Alert).save(newAlert);

    res.status(200).json({ success: true, decoded: result.decoded, alertId });
  } catch (err) {
    console.error("[LMS Uplink] Error decoding or saving:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = { handleUplink };
