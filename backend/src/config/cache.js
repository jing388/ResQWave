const {LRUCache} = require("lru-cache");
const redis = require("./redis");

// Tiny in-process LRU for hottest keys
const lru = new LRUCache({
    max: 500,
    ttl: 1000 * 60,
});

let hits = 0;
let misses = 0;

async function getCache(key) {
  const v = lru.get(key);
  if (v !== undefined) {
    console.log("CACHE HIT:", key);
    return v;
  }
  const raw = await redis.get(key);
  if (!raw) {
    console.log("CACHE MISS:", key);
    return null;
  }
  console.log("CACHE HIT (redis):", key);
  const parsed = JSON.parse(raw);
  lru.set(key, parsed);
  return parsed;
}

async function setCache(key, value, ttl = 60) {
  console.log("CACHE SET:", key);
  lru.set(key, value, { ttl: ttl * 1000 });
  await redis.set(key, JSON.stringify(value), "EX", ttl);
}

async function deleteCache(patternOrKey) {
    if (!patternOrKey.includes("*")) {
        lru.delete(patternOrKey);
        await redis.del(patternOrKey);
        return;
    }
    const stream = redis.scanStream({match: patternOrKey, count: 100});
    for await (const keys of stream) {
        if (keys.length) {
            keys.forEach(k => lru.delete(k));
            await redis.del(keys);
        }
    }
}

async function getCacheWithStats(key) {
  const v = await getCache(key);
  if (v) hits++; else misses++;
  return v;
}
function cacheStats() {
  return { hits, misses, ratio: hits / Math.max(1, hits + misses) };
}
module.exports = { getCache, setCache, deleteCache, getCacheWithStats, cacheStats };