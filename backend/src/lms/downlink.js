function mapPayloadByStatus(status) {
    switch (status) {
        case "Dispatched" || "dispatched" : return "01";
        case "Waitlist" : return "02";
        default: return "03";
    }
}

async function sendDownlink(devEUI, status) {
    const payload = mapPayloadByStatus(status);

    // --- LOG THE PAYLOAD BEFORE SENDING ---
    console.log(`[Downlink] Sending payload "${payload}" to DevEUI: ${devEUI} for status: ${status}`);

    const url = new URL(
        "https://lns.packetworx.net/thingpark/lrc/rest/v2/downlink"
    );

    url.search = new URLSearchParams({
        DevEUI: devEUI,
        FPort: "69",
        Payload: payload,
        AS_ID: process.env.THINGPARK_AS_ID,
        Time: new Date().toISOString(),
        Token: process.env.THINGPARK_TOKEN
    });

    const response = await fetch(url.toString(), { method: "POST" });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Downlink] Failed to send: ${errorText}`);
        throw new Error(`ThingPark Downlink Failed: ${errorText}`);
    }

    console.log(`[Downlink] Successfully sent payload "${payload}" to DevEUI: ${devEUI}`);

    return { payloadSent: payload, statusCode: response.status };
}


module.exports = {
    sendDownlink
};