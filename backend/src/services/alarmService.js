const { AppDataSource } = require("../config/dataSource");
const alarmRepo = AppDataSource.getRepository("Alarm");
const terminalRepo = AppDataSource.getRepository("Terminal");

// Create or Update an Active Alarm
async function createOrUpdateAlarm({ terminalID, name, status = "Active", severity}) {
    const existing = await alarmRepo.findOne({
        where: {
            terminalID,
            name,
            status: "Active"
        }
    });

    // Update Severity if Alarm Already Exists
    if (existing) {
        if (existing.severity !== severity) {
            existing.severity = severity;
            await alarmRepo.save(existing);
        }
        return existing;
    }

    // Create New Alarm
    let terminalName = null;
    try {
        const terminal = await terminalRepo.findOne({ where: { id: terminalID } });
        if (terminal) terminalName = terminal.name;
    } catch (err) {
        console.error("Error fetching terminal name for alarm:", err);
    }

    const newAlarm = alarmRepo.create({
        terminalID,
        terminalName,
        name, 
        status,
        severity
    });

    return await alarmRepo.save(newAlarm);
}


// Clear an active Alarm
async function clearAlarm(terminalID, name) {
    const alarm = await alarmRepo.findOne({
        where: {
            terminalID,
            name,
            status: "Active"
        }
    });

    if (!alarm) return null;

    alarm.status = "Cleared";
    alarm.clearedAt = new Date();

    return await alarmRepo.save(alarm);
}

async function handleBatteryAlarm(result) {
    const { terminalID, batteryPercent } = result;

    let severity = null;

    if (batteryPercent <= 10) {
        severity = "Major";
    } else if (batteryPercent <= 20) {
        severity = "Minor";
    }

    // Battery Recovered -> Clear Alarm
    if (!severity) {
        await clearAlarm(terminalID, "Critical Battery Level");
        return;
    }

    await createOrUpdateAlarm({
        terminalID,
        name: "Critical Battery Level",
        status: "Active",
        severity
    });
}

// Periodic check for offline terminals
async function checkExtendedDowntime() {
    console.log("[Cron] Checking for Extended Downtime...");
    const terminals = await terminalRepo.find({ where: { archived: false } });
    const now = Date.now();

    for (const terminal of terminals) {
        if (!terminal.lastSeenAt) continue; // Skip if never seen

        const lastSeen = new Date(terminal.lastSeenAt).getTime();
        const diffDays = (now - lastSeen) / (1000 * 60 * 60 * 24);

        if (diffDays >= 5) {
            await createOrUpdateAlarm({
                terminalID: terminal.id,
                name: "Extended Downtime",
                severity: "Major"
            });
        } else if (diffDays >= 3) {
            await createOrUpdateAlarm({
                terminalID: terminal.id,
                name: "Extended Downtime",
                severity: "Minor"
            });
        } else {
            // If they have been seen recently (< 3 days), clear any downtime alarm
            await clearAlarm(terminal.id, "Extended Downtime");
        }
    }
}

module.exports = {
    createOrUpdateAlarm,
    clearAlarm,
    handleBatteryAlarm,
    checkExtendedDowntime
}