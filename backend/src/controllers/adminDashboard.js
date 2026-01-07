const { AppDataSource } = require("../config/dataSource");
const { getCache, setCache } = require("../config/cache");

const terminalRepo = AppDataSource.getRepository("Terminal");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");
const neighborhoodRepo = AppDataSource.getRepository("Neighborhood");
const alertRepo = AppDataSource.getRepository("Alert");
const postRescueRepo = AppDataSource.getRepository("PostRescueForm");

const getAdminDashboardStats = async (req, res) => {
    try {
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
        // We count all post rescue forms as they represent completed operations
        const completedOperations = await postRescueRepo.count();

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

    } catch (err) {
        console.error("Error fetching admin dashboard stats:", err);
        return res.status(500).json({ message: "Server Error" });
    }
};

const getAggregatedMapData = async (req, res) => {
    try {
        const cacheKey = "adminDashboard:aggregatedMap";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        // Subquery for latest alert time per terminal
        const latestAlertSQ = alertRepo
            .createQueryBuilder("a")
            .select("a.terminalID", "terminalID")
            .addSelect("MAX(a.dateTimeSent)", "lastTime")
            .groupBy("a.terminalID");

        // Subquery for alert count per terminal
        const alertCountSQ = alertRepo
            .createQueryBuilder("ac")
            .select("ac.terminalID", "terminalID")
            .addSelect("COUNT(ac.id)", "totalAlerts")
            .groupBy("ac.terminalID");

        const data = await neighborhoodRepo
            .createQueryBuilder("n")
            .leftJoin("Terminal", "t", "t.id = n.terminalID")
            .leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
            .leftJoin(
                "(" + latestAlertSQ.getQuery() + ")",
                "latestAlert",
                "latestAlert.terminalID = t.id"
            )
            .leftJoin("Alert", "alert", "alert.terminalID = t.id AND alert.dateTimeSent = latestAlert.lastTime")
            .leftJoin(
                "(" + alertCountSQ.getQuery() + ")",
                "alertCounts",
                "alertCounts.terminalID = t.id"
            )
            .setParameters(latestAlertSQ.getParameters())
            .select([
                "n.id AS neighborhoodID",
                "t.id AS terminalID",
                "t.name AS terminalName",
                "t.status AS terminalStatus",
                "alert.dateTimeSent AS latestAlertTime",
                "fp.firstName AS firstName",
                "fp.lastName AS lastName",
                "fp.address AS address",
                "fp.contactNumber AS contactNumber",
                "COALESCE(alertCounts.totalAlerts, 0) AS totalAlerts"
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

    } catch (err) {
        console.error("Error fetching aggregated map data:", err);
        return res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getAdminDashboardStats,
    getAggregatedMapData
};
