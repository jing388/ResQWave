const crypto = require('crypto');

/**
 * Generates the SHA-256 Token required by ThingPark
 */
function generateToken(queryString, asKey) {
    return crypto
        .createHash('sha256')
        .update(queryString + asKey)
        .digest('hex');
}

function mapPayloadByStatus(status) {
    switch (status) {
        case "Waitlisted": return "01";
        case "Dispatched": return "02";
        case "Completed": return "03";
    }
}

/**
 * 1. SEND DOWNLINK (POST)
 */
async function sendDownlink(devEUI, status) {
    const payload = mapPayloadByStatus(status);
    const fPort = "2";
    const asId = process.env.THINGPARK_AS_ID;
    const asKey = process.env.THINGPARK_AS_KEY;
    const time = new Date().toISOString();

    const queryString = `DevEUI=${devEUI}&FPort=${fPort}&Payload=${payload}&AS_ID=${asId}&Time=${time}`;
    const token = generateToken(queryString, asKey);

    const url = new URL("https://lns.packetworx.net/thingpark/lrc/rest/v2/downlink");
    url.search = new URLSearchParams({
        DevEUI: devEUI,
        FPort: fPort,
        Payload: payload,
        AS_ID: asId,
        Time: time,
        Token: token
    });

    const response = await fetch(url.toString(), { method: "POST" });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ThingPark Downlink Failed: ${errorText}`);
    }

    console.log(`[Downlink] Successfully queued payload "${payload}" for DevEUI: ${devEUI}`);
    
    // Optional: Immediately check the status
    await checkDownlinkStatus(devEUI);
    
    return { payloadSent: payload, statusCode: response.status };
}

/**
 * 2. CHECK QUEUE STATUS (GET)
 * This verifies if the message is still waiting for an uplink.
 */
async function checkDownlinkStatus(devEUI) {
    const asId = process.env.THINGPARK_AS_ID;
    const asKey = process.env.THINGPARK_AS_KEY;
    const time = new Date().toISOString();

    const queryString = `DevEUI=${devEUI}&AS_ID=${asId}&Time=${time}`;
    const token = generateToken(queryString, asKey);

    const url = new URL("https://lns.packetworx.net/thingpark/lrc/rest/v2/downlink");
    url.search = new URLSearchParams({
        DevEUI: devEUI,
        AS_ID: asId,
        Time: time,
        Token: token
    });

    try {
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: { 'Accept': 'application/json' }
        });

        const rawResponse = await response.text(); // Get raw text first

        // Check if the response is actually JSON
        try {
            const data = JSON.parse(rawResponse);
            if (data.downlinkStatus) {
                console.log(`[Queue Status] Device: ${devEUI} | State: ${data.downlinkStatus.state}`);
            } else {
                console.log(`[Queue Status] No pending downlink for ${devEUI}.`);
            }
            return data;
        } catch (e) {
            // If it's not JSON, it's likely an HTML error page or XML
            console.error(`[Queue Status] Server returned non-JSON response.`);
            console.log(`[Queue Status] Raw Response: ${rawResponse.substring(0, 200)}...`); 
            return null;
        }
    } catch (err) {
        console.error(`[Queue Status] Fetch error: ${err.message}`);
    }
}

module.exports = { sendDownlink, checkDownlinkStatus };