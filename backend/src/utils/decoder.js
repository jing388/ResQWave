// utils/decoder.js
function decodePayloadFromLMS(lmsData) {
  if (!lmsData || !lmsData.DevEUI_uplink || !lmsData.DevEUI_uplink.payload_hex) {
    console.error("[Decoder] Invalid LMS data structure received:");
    console.error(JSON.stringify(lmsData, null, 2));
    throw new Error("Invalid LMS JSON: payload_hex not found");
  }

  const payloadHex = lmsData.DevEUI_uplink.payload_hex.trim();
  const devEUI = lmsData.DevEUI_uplink.DevEUI;
  const bytes = Buffer.from(payloadHex, "hex");

  // Alert Payload (6 Bytes)
  if (bytes.length === 6) {
    const terminalID = bytes[0];
    const alertTypeNum = bytes[1];
    const timestamp = bytes.readUInt32BE(2);

    return {
      type: "ALERT",
      devEUI,
      rawHex: payloadHex,
      decoded: {
        terminalID: terminalID.toString(),
        alertType: alertTypeNum === 1 ? "Critical" : "User-Initiated",
        timestamp,
        dateTimeSent: new Date(timestamp * 1000),
      },
    };
  }

  // Battery Payload (2 Bytes)
  if (bytes.length === 2) {
    const terminalID = bytes[0];
    const batteryPercent = bytes[1];

    return {
      type: "BATTERY",
      devEUI,
      rawHex: payloadHex,
      decoded: {
        terminalID: terminalID.toString(),
        batteryPercent, // Decimal
      },
    };
  }

  // Unknown Payload
  throw new Error(`Unknown Payload Format: ${payloadHex}`);

}

module.exports = { decodePayloadFromLMS };
