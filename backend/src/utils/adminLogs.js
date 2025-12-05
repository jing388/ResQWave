const { AppDataSource } = require("../config/dataSource");
const { deleteCache } = require("../config/cache");

const adminLogRepo = AppDataSource.getRepository("AdminLog");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");

async function addAdminLog({
    action,
    entityType,
    entityID,
    entityName = null,
    changes = [],
    dispatcherID,
    dispatcherName = null
}) {
    try {
        // Fetch dispatcher name if not provided
        if (!dispatcherName && dispatcherID) {
            const dispatcher = await dispatcherRepo.findOne({
                where: { id: dispatcherID },
                select: ["name"]
            });
            dispatcherName = dispatcher?.name || null;
        }

        // If no changes array (for create/archive/delete), create a single entry
        if (!changes || changes.length === 0) {
            await adminLogRepo.save({
                action,
                entityType,
                entityID,
                entityName,
                field: null,
                oldValue: null,
                newValue: null,
                dispatcherID,
                dispatcherName
            });
        } else {
            // Create a log entry for each field change
            const logs = changes.map(change => ({
                action,
                entityType,
                entityID,
                entityName,
                field: change.field || null,
                oldValue: change.oldValue !== undefined ? String(change.oldValue) : null,
                newValue: change.newValue !== undefined ? String(change.newValue) : null,
                dispatcherID,
                dispatcherName
            }));

            await adminLogRepo.save(logs);
        }

        // Invalidate cache so new logs appear immediately
        await deleteCache("admin:logs:all");
    } catch (err) {
        console.error("[addAdminLog] Error saving admin log:", err);
        // Don't throw - logging errors shouldn't break the main operation
    }
}

function diffFields(oldObj, newObj, fields) {
    const changes = [];
    for (const field of fields) {
        const oldVal = oldObj[field];
        const newVal = newObj[field];
        
        // Skip if both are null/undefined
        if ((oldVal === null || oldVal === undefined) && (newVal === null || newVal === undefined)) {
            continue;
        }
        
        // Compare values (convert to string for comparison)
        if (String(oldVal) !== String(newVal)) {
            changes.push({
                field,
                oldValue: oldVal,
                newValue: newVal
            });
        }
    }
    return changes;
}

module.exports = {
    addAdminLog,
    diffFields
};
