const { AppDataSource } = require("../config/dataSource");
const { getCache, setCache } = require("../config/cache");
const catchAsync = require("../utils/catchAsync");
const { ForbiddenError } = require("../exceptions");

const adminLogRepo = AppDataSource.getRepository("AdminLog");

const getAdminLogs = catchAsync(async (req, res) => {
    // Check if requester is admin
    if (req.user?.role !== "admin") {
        throw new ForbiddenError("Forbidden. Admin access required.");
    }

        const cacheKey = "admin:logs:all";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        // Fetch all admin logs ordered by most recent
        const logs = await adminLogRepo
            .createQueryBuilder("al")
            .orderBy("al.createdAt", "DESC")
            .getMany();

        const lastUpdated = logs[0]?.createdAt || null;

        // Group logs by date, then by action timestamp + dispatcher + entityType + entityID
        const byDay = {};

        for (const log of logs) {
            const d = new Date(log.createdAt);
            const dateLabel = d.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric"
            });

            const groupKey = `${log.createdAt.getTime()}|${log.dispatcherID}|${log.action}|${log.entityType}|${log.entityID}`;

            if (!byDay[dateLabel]) byDay[dateLabel] = {};
            if (!byDay[dateLabel][groupKey]) byDay[dateLabel][groupKey] = [];

            byDay[dateLabel][groupKey].push({
                time: d.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit"
                }),
                action: log.action,
                entityType: log.entityType,
                entityID: log.entityID,
                entityName: log.entityName,
                field: log.field,
                oldValue: log.oldValue,
                newValue: log.newValue,
                dispatcherID: log.dispatcherID,
                dispatcherName: log.dispatcherName,
                createdAt: log.createdAt,
            });
        }

        // Convert to array structure for frontend
        const days = Object.keys(byDay).map(date => {
            const actions = Object.keys(byDay[date])
                .sort()
                .reverse()
                .map(groupKey => {
                    const entries = byDay[date][groupKey];
                    const first = entries[0];

                    // Build action message
                    let message = "";
                    switch (first.action) {
                        case "create":
                            message = `created ${first.entityType.toLowerCase()} "${first.entityName || first.entityID}"`;
                            break;
                        case "edit":
                            message = `edited ${first.entityType.toLowerCase()} "${first.entityName || first.entityID}"`;
                            break;
                        case "archive":
                            message = `archived ${first.entityType.toLowerCase()} "${first.entityName || first.entityID}"`;
                            break;
                        case "unarchive":
                            message = `unarchived ${first.entityType.toLowerCase()} "${first.entityName || first.entityID}"`;
                            break;
                        case "delete":
                            message = `deleted ${first.entityType.toLowerCase()} "${first.entityName || first.entityID}"`;
                            break;
                        default:
                            message = `performed ${first.action} on ${first.entityType.toLowerCase()}`;
                    }

                    return {
                        time: first.time,
                        action: first.action,
                        entityType: first.entityType,
                        entityID: first.entityID,
                        entityName: first.entityName,
                        dispatcherID: first.dispatcherID,
                        dispatcherName: first.dispatcherName,
                        message,
                        timestamp: first.createdAt,
                        fields: entries.map(e => ({
                            field: e.field,
                            oldValue: e.oldValue,
                            newValue: e.newValue,
                        })).filter(f => f.field), // Only include entries with field changes
                    };
                });

            return {
                date,
                count: actions.length,
                actions,
            };
        });

        const payload = {
            lastUpdated,
            days,
            total: logs.length
        };

        await setCache(cacheKey, payload, 60);
        return res.json(payload);
});

module.exports = {
    getAdminLogs
};
