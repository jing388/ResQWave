const { AppDataSource } = require("../config/dataSource");
const { deleteCache } = require("../config/cache");

function toJSONSafe(v) {
  try {
    if (v == null) return null;
    if (Buffer.isBuffer(v)) return "[BLOB]";
    // If it's a string, check if it's already valid JSON
    if (typeof v === "string") {
      try {
        const parsed = JSON.parse(v);
        // If it parses successfully and is an array, return a readable format
        if (Array.isArray(parsed)) {
          return parsed.length > 0 ? parsed.join(", ") : "None";
        }
        return v;
      } catch {
        // Not JSON, return as-is
        return v;
      }
    }
    if (typeof v === "object") {
      // If it's an array, return comma-separated string
      if (Array.isArray(v)) {
        return v.length > 0 ? v.join(", ") : "None";
      }
      return JSON.stringify(v);
    }
    return String(v);
  } catch { return null; }
}

function isNumericLike(v) { if (v == null) return false; if (typeof v === "number") return Number.isFinite(v); if (typeof v === "string" && v.trim() !== "") return !isNaN(Number(v)); return false; }
function equalWithCoercion(a, b) { if (isNumericLike(a) && isNumericLike(b)) return Number(a) === Number(b); if (a && b && typeof a === "object" && typeof b === "object") { try { return JSON.stringify(a) === JSON.stringify(b); } catch { } } return a === b; }

function diffFields(before = {}, after = {}, fields = []) {
  const changes = [];
  for (const f of fields) {
    const oldVal = before?.[f] ?? null;
    const newVal = after?.[f] ?? null;
    if (!equalWithCoercion(oldVal, newVal)) {
      // Check if field was deleted (had value before, now null)
      const wasDeleted = oldVal !== null && oldVal !== "" && (newVal === null || newVal === "");
      changes.push({
        field: f,
        oldValue: toJSONSafe(oldVal),
        newValue: wasDeleted ? "Deleted" : toJSONSafe(newVal)
      });
    }
  }
  return changes;
}

async function addLogs(params) {
  // Accept both styles from callers
  const entityType = params.entityType;
  const entityID = params.entityID ?? params.entityId ?? null;
  const actorID = params.actorID ?? params.actorId ?? null;
  const actorRole = params.actorRole ?? null;
  const changes = params.changes ?? [];

  if (!entityType || !entityID || !changes.length) return 0;

  const repo = AppDataSource.getRepository("Log");
  const rows = changes.map(c => ({
    entityType,
    entityID: String(entityID),
    field: c.field,
    oldValue: c.oldValue ?? toJSONSafe(c.oldValue),
    newValue: c.newValue ?? toJSONSafe(c.newValue),
    actorID: actorID != null ? String(actorID) : null,
    actorRole,
  }));
  await repo.insert(rows);

  // Invalidate cache for this actor so logs update immediately
  if (actorID) {
    const cacheKey = `logs:own:${actorID}`;
    await deleteCache(cacheKey);
    console.log(`[addLogs] Invalidated cache: ${cacheKey}`);
  }

  return rows.length;
}

module.exports = { diffFields, addLogs, toJSONSafe };