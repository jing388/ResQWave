const { AppDataSource } = require('../config/dataSource');
const weatherService = require('./weatherService');

const CACHE_DURATION_HOURS = 6;

/**
 * Get weather cache repository
 */
const getWeatherCacheRepository = () => {
    return AppDataSource.getRepository('WeatherCache');
};

/**
 * Check if cache entry is still valid (not expired)
 * @param {Object} cacheEntry - Weather cache database entry
 * @returns {boolean}
 */
const isCacheValid = (cacheEntry) => {
    if (!cacheEntry || !cacheEntry.expiresAt) return false;
    const now = new Date();
    const expiresAt = new Date(cacheEntry.expiresAt);
    return now < expiresAt;
};

/**
 * Get or fetch weather data for a terminal
 * Uses cache if valid, otherwise fetches fresh data from OpenWeather API
 * @param {string} terminalID - Terminal ID
 * @param {number} lat - Latitude (required if cache doesn't exist)
 * @param {number} lon - Longitude (required if cache doesn't exist)
 * @returns {Promise<Object>} Weather data
 */
const getOrFetchWeather = async (terminalID, lat = null, lon = null) => {
    const repository = getWeatherCacheRepository();

    try {
        // Try to get cached data
        const cachedWeather = await repository.findOne({
            where: { terminalID }
        });

        // If cache exists and is valid, return it
        if (cachedWeather && isCacheValid(cachedWeather)) {
            console.log(`✅ Weather cache HIT for terminal ${terminalID}`);

            // Update last accessed timestamp
            await repository.update(
                { terminalID },
                { lastAccessedAt: new Date() }
            );

            // 🔧 Calculate "current" weather from hourly forecast (closest 3-hour interval)
            const now = new Date();
            const nowTimestamp = Math.floor(now.getTime() / 1000); // Convert to Unix timestamp
            const hourlyForecast = cachedWeather.hourlyForecast;

            let currentWeather = null;

            if (hourlyForecast && Array.isArray(hourlyForecast) && hourlyForecast.length > 0) {
                // Find forecast entry closest to current time using Unix timestamps
                let closestForecast = hourlyForecast[0];
                let minTimeDiff = Math.abs(hourlyForecast[0].timestamp - nowTimestamp);

                for (const forecast of hourlyForecast) {
                    const timeDiff = Math.abs(forecast.timestamp - nowTimestamp);

                    if (timeDiff < minTimeDiff) {
                        minTimeDiff = timeDiff;
                        closestForecast = forecast;
                    }
                }

                // Use the closest forecast as "current" weather
                currentWeather = {
                    temperature: closestForecast.temperature,
                    feelsLike: closestForecast.feelsLike || closestForecast.temperature,
                    humidity: closestForecast.humidity,
                    pressure: closestForecast.pressure,
                    windSpeed: closestForecast.windSpeed,
                    description: closestForecast.description,
                    icon: closestForecast.icon,
                    location: { lat, lon }
                };

                console.log(`🕐 Using hourly forecast from ${closestForecast.time} (${Math.round(minTimeDiff / 60)} min difference) as current weather`);
            } else {
                throw new Error('No hourly forecast data available in cache');
            }

            return {
                current: currentWeather,
                hourly: cachedWeather.hourlyForecast,
                weekly: cachedWeather.weeklyForecast,
                location: { lat, lon },
                cached: true,
                fetchedAt: cachedWeather.fetchedAt,
                expiresAt: cachedWeather.expiresAt
            };
        }

        // Cache miss or expired - fetch fresh data
        console.log(`❌ Weather cache MISS for terminal ${terminalID} - fetching fresh data`);

        if (!lat || !lon) {
            throw new Error('Coordinates (lat, lon) are required to fetch weather data');
        }

        return await fetchAndStoreWeather(terminalID, lat, lon);

    } catch (error) {
        console.error('Error in getOrFetchWeather:', error.message);
        throw error;
    }
};

/**
 * Fetch weather from API and store in cache
 * @param {string} terminalID - Terminal ID
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Weather data
 */
const fetchAndStoreWeather = async (terminalID, lat, lon) => {
    const repository = getWeatherCacheRepository();

    try {
        // Fetch fresh weather data from OpenWeather API
        const weatherData = await weatherService.getCompleteWeatherData(lat, lon);

        const now = new Date();
        const expiresAt = new Date(now.getTime() + CACHE_DURATION_HOURS * 60 * 60 * 1000);

        // Use raw query for upsert to avoid race conditions
        // PostgreSQL's INSERT ... ON CONFLICT is atomic
        await repository.query(`
            INSERT INTO weather_cache ("terminalID", "hourlyForecast", "weeklyForecast", "fetchedAt", "expiresAt", "apiCallCount", "lastAccessedAt")
            VALUES ($1, $2, $3, $4, $5, 1, $6)
            ON CONFLICT ("terminalID") 
            DO UPDATE SET
                "hourlyForecast" = EXCLUDED."hourlyForecast",
                "weeklyForecast" = EXCLUDED."weeklyForecast",
                "fetchedAt" = EXCLUDED."fetchedAt",
                "expiresAt" = EXCLUDED."expiresAt",
                "apiCallCount" = weather_cache."apiCallCount" + 1,
                "lastAccessedAt" = EXCLUDED."lastAccessedAt"
        `, [
            terminalID,
            JSON.stringify(weatherData.hourly),
            JSON.stringify(weatherData.weekly),
            now,
            expiresAt,
            now
        ]);

        console.log(`💾 Upserted weather cache for terminal ${terminalID}`);

        return {
            current: weatherData.current,
            hourly: weatherData.hourly,
            weekly: weatherData.weekly,
            location: { lat, lon },
            cached: false,
            fetchedAt: now,
            expiresAt: expiresAt
        };

    } catch (error) {
        console.error('Error in fetchAndStoreWeather:', error.message);
        throw error;
    }
};

/**
 * Manually refresh weather cache for a terminal (bypass cache)
 * @param {string} terminalID - Terminal ID
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Fresh weather data
 */
const refreshWeatherCache = async (terminalID, lat, lon) => {
    console.log(`🔄 Manual refresh requested for terminal ${terminalID}`);
    return await fetchAndStoreWeather(terminalID, lat, lon);
};

/**
 * Get cache statistics (for monitoring/admin dashboard)
 * @returns {Promise<Object>} Cache statistics
 */
const getCacheStats = async () => {
    const repository = getWeatherCacheRepository();

    try {
        const allCaches = await repository.find();
        const now = new Date();

        const stats = {
            totalCaches: allCaches.length,
            validCaches: allCaches.filter(c => isCacheValid(c)).length,
            expiredCaches: allCaches.filter(c => !isCacheValid(c)).length,
            totalApiCalls: allCaches.reduce((sum, c) => sum + (c.apiCallCount || 0), 0),
            oldestCache: allCaches.length > 0
                ? new Date(Math.min(...allCaches.map(c => new Date(c.fetchedAt))))
                : null,
            newestCache: allCaches.length > 0
                ? new Date(Math.max(...allCaches.map(c => new Date(c.fetchedAt))))
                : null
        };

        return stats;
    } catch (error) {
        console.error('Error getting cache stats:', error.message);
        throw error;
    }
};

/**
 * Delete weather cache for a terminal
 * @param {string} terminalID - Terminal ID
 */
const deleteWeatherCache = async (terminalID) => {
    const repository = getWeatherCacheRepository();
    await repository.delete({ terminalID });
    console.log(`🗑️ Deleted weather cache for terminal ${terminalID}`);
};

/**
 * Clean up expired caches (can be run periodically)
 * @returns {Promise<number>} Number of deleted entries
 */
const cleanExpiredCaches = async () => {
    const repository = getWeatherCacheRepository();
    const now = new Date();

    try {
        const result = await repository
            .createQueryBuilder()
            .delete()
            .where('expiresAt < :now', { now })
            .execute();

        const deletedCount = result.affected || 0;
        console.log(`🧹 Cleaned up ${deletedCount} expired weather caches`);
        return deletedCount;
    } catch (error) {
        console.error('Error cleaning expired caches:', error.message);
        throw error;
    }
};

module.exports = {
    getOrFetchWeather,
    fetchAndStoreWeather,
    refreshWeatherCache,
    getCacheStats,
    deleteWeatherCache,
    cleanExpiredCaches,
    isCacheValid
};
