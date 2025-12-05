// utils/decoder.js
function decodePayloadFromLMS(lmsData) {
  if (!lmsData || !lmsData.DevEUI_uplink || !lmsData.DevEUI_uplink.payload_hex) {
    throw new Error("Invalid LMS JSON: payload_hex not found");
  }

  const payloadHex = lmsData.DevEUI_uplink.payload_hex.trim();
  const devEUI = lmsData.DevEUI_uplink.DevEUI;

  if (payloadHex.length !== 12) {
    throw new Error("Invalid payload_hex length. Expected 12 hex characters.");
  }

  const bytes = Buffer.from(payloadHex, "hex");

  // Decode fields
  const terminalID = bytes[0]; // first byte
  const alertTypeNum = bytes[1]; // second byte
  const timestamp = bytes.readUInt32BE(2); // last 4 bytes as 32-bit unsigned int

  // Map alertType number to string
  const alertType = alertTypeNum === 1 ? "Critical" : "User-Initiated";

  // Convert timestamp to JS Date
  const dateTimeSent = new Date(timestamp * 1000);

  return {
    devEUI,
    rawHex: payloadHex,
    decoded: {
      terminalID: terminalID.toString(),
      alertType,
      timestamp,
      dateTimeSent,
    },
  };
}

module.exports = { decodePayloadFromLMS };
