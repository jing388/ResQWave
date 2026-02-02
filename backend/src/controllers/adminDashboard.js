const { AppDataSource } = require("../config/dataSource");
const { getCache, setCache } = require("../config/cache");
const catchAsync = require("../utils/catchAsync");
const { BadRequestError, NotFoundError } = require("../exceptions");

const terminalRepo = AppDataSource.getRepository("Terminal");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");
const neighborhoodRepo = AppDataSource.getRepository("Neighborhood");
const alertRepo = AppDataSource.getRepository("Alert");
const postRescueRepo = AppDataSource.getRepository("PostRescueForm");
const rescueFormRepo = AppDataSource.getRepository("RescueForm");

const getAdminDashboardStats = catchAsync(async (req, res) => {
        const cacheKey = "adminDashboardStats";
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // 1. Active Terminals
        const activeTerminals = await terminalRepo.count({
            where: { archived: false }
        });

        // 2. Active Dispatchers
        const activeDispatchers = await dispatcherRepo.count({
            where: { archived: false }
        });

        // 3. Active Neighborhoods
        const activeNeighborhoods = await neighborhoodRepo.count({
            where: { archived: false }
        });

        // 4. Completed Operations (Alerts with Post Rescue Form)
        // We count non-archived post rescue forms where rescue form status is "Completed"
        // This matches exactly what the Reports module shows in the completed tab
        const completedOperations = await postRescueRepo
            .createQueryBuilder("prf")
            .leftJoin("RescueForm", "rescueForm", "rescueForm.emergencyID = prf.alertID")
            .where("rescueForm.status = :status", { status: "Completed" })
            .andWhere("(prf.archived IS NULL OR prf.archived = :archived)", { archived: false })
            .getCount();

        // 5. Alert Types
        const criticalAlerts = await alertRepo.count({
            where: { alertType: "Critical" }
        });

        const userInitiatedAlerts = await alertRepo.count({
            where: { alertType: "User-Initiated" }
        });

        const payload = {
            payload: {
                activeTerminals,
                activeDispatchers,
                activeNeighborhoods,
                completedOperations,
                alertTypes: {
                    critical: criticalAlerts,
                    userInitiated: userInitiatedAlerts,
                    total: criticalAlerts + userInitiatedAlerts
                }
            }
        };

        await setCache(cacheKey, payload, 300);

        return res.json(payload);
});

const getAggregatedMapData = catchAsync(async (req, res) => {
        const cacheKey = "adminDashboard:aggregatedMap";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        // Subquery for latest alert time per terminal
        const latestAlertSQ = alertRepo
            .createQueryBuilder("a")
            .select("a.terminalID", "terminal_id")
            .addSelect("MAX(a.dateTimeSent)", "last_time")
            .groupBy("a.terminalID");

        // Subquery for alert count per terminal
        const alertCountSQ = alertRepo
            .createQueryBuilder("ac")
            .select("ac.terminalID", "terminal_id")
            .addSelect("COUNT(ac.id)", "total_alerts")
            .groupBy("ac.terminalID");

        const data = await neighborhoodRepo
            .createQueryBuilder("n")
            .leftJoin("Terminal", "t", "t.id = n.terminalID")
            .leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
            .leftJoin(
                "(" + latestAlertSQ.getQuery() + ")",
                "latest_alert",
                "latest_alert.terminal_id = t.id"
            )
            .leftJoin("Alert", "alert", "alert.terminalID = t.id AND alert.dateTimeSent = latest_alert.last_time")
            .leftJoin(
                "(" + alertCountSQ.getQuery() + ")",
                "alert_counts",
                "alert_counts.terminal_id = t.id"
            )
            .setParameters(latestAlertSQ.getParameters())
            .select([
                'n.id AS "neighborhoodID"',
                't.id AS "terminalID"',
                't.name AS "terminalName"',
                't.status AS "terminalStatus"',
                'alert.dateTimeSent AS "latestAlertTime"',
                'fp.firstName AS "firstName"',
                'fp.lastName AS "lastName"',
                'fp.address AS "address"',
                'fp.contactNumber AS "contactNumber"',
                'COALESCE(alert_counts.total_alerts, 0) AS "totalAlerts"'
            ])
            .where("n.archived = :archived", { archived: false })
            .getRawMany();

        const processedData = data.map(item => {
            let parsedAddress = item.address;
            try {
                if (typeof item.address === 'string' && (item.address.startsWith('{') || item.address.startsWith('['))) {
                    parsedAddress = JSON.parse(item.address);
                }
            } catch (e) {
                // keep as string if parse fails
            }

            return {
                neighborhoodID: item.neighborhoodID,
                terminalID: item.terminalID,
                terminalName: item.terminalName,
                terminalStatus: item.terminalStatus,
                latestAlertTime: item.latestAlertTime,
                totalAlerts: parseInt(item.totalAlerts || '0', 10),
                focalPerson: [item.firstName, item.lastName].filter(Boolean).join(" ").trim(),
                address: parsedAddress,
                contactNumber: item.contactNumber
            };
        });

        await setCache(cacheKey, processedData, 300);
        return res.json(processedData);

})
module.exports = {
    getAdminDashboardStats,
    getAggregatedMapData
};
