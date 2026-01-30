const weatherService = require('../services/weatherService');
const weatherCacheService = require('../services/weatherCacheService');
const { AppDataSource } = require('../config/dataSource');
const catchAsync = require('../utils/catchAsync');

/**
 * Get current weather
 * GET /api/weather/current
 */
const getCurrentWeather = catchAsync(async (req, res) => {
    const weatherData = await weatherService.getCurrentWeather();

    res.status(200).json({
        status: 'success',
        data: weatherData
    });
});

/**
 * Get hourly forecast
 * GET /api/weather/hourly
 */
const getHourlyForecast = catchAsync(async (req, res) => {
    const forecastData = await weatherService.getHourlyForecast();

    res.status(200).json({
        status: 'success',
        data: forecastData
    });
});

/**
 * Get weekly forecast
 * GET /api/weather/weekly
 */
const getWeeklyForecast = catchAsync(async (req, res) => {
    const forecastData = await weatherService.getWeeklyForecast();

    res.status(200).json({
        status: 'success',
        data: forecastData
    });
});

/**
 * Get complete weather data (current + hourly + weekly)
 * Now uses caching by terminal ID
 * GET /api/weather/complete?terminalID=RSQW-001&lat=14.7565&lon=121.0174
 */
const getCompleteWeather = catchAsync(async (req, res) => {
    const { terminalID, lat, lon } = req.query;
    console.log('🌤️ Weather API called - terminalID:', terminalID, 'lat:', lat, 'lon:', lon);

    // Validate terminal ID
    if (!terminalID) {
        return res.status(400).json({
            status: 'error',
            message: 'terminalID is required'
        });
    }

    // Convert coordinates to numbers if provided
    const latitude = lat ? parseFloat(lat) : null;
    const longitude = lon ? parseFloat(lon) : null;

    // Get weather data (from cache or fresh API call)
    const weatherData = await weatherCacheService.getOrFetchWeather(
        terminalID,
        latitude,
        longitude
    );

    console.log(`✅ Weather data ${weatherData.cached ? 'retrieved from cache' : 'fetched fresh'}`);

    res.status(200).json({
        status: 'success',
        data: weatherData,
        meta: {
            cached: weatherData.cached,
            fetchedAt: weatherData.fetchedAt,
            expiresAt: weatherData.expiresAt
        }
    });
});

/**
 * Manually refresh weather cache for a terminal (bypass cache)
 * POST /api/weather/refresh
 * Body: { terminalID, lat, lon }
 */
const refreshWeatherCache = catchAsync(async (req, res) => {
    const { terminalID, lat, lon } = req.body;

    if (!terminalID || !lat || !lon) {
        return res.status(400).json({
            status: 'error',
            message: 'terminalID, lat, and lon are required'
        });
    }

    const weatherData = await weatherCacheService.refreshWeatherCache(
        terminalID,
        parseFloat(lat),
        parseFloat(lon)
    );

    res.status(200).json({
        status: 'success',
        message: 'Weather cache refreshed successfully',
        data: weatherData
    });
});

/**
 * Get cache statistics (admin endpoint)
 * GET /api/weather/cache/stats
 */
const getCacheStats = catchAsync(async (req, res) => {
    const stats = await weatherCacheService.getCacheStats();

    res.status(200).json({
        status: 'success',
        data: stats
    });
});

/**
 * IoT Weather Check - Determines if weather is risky enough to send alerts
 * GET /api/weather/iot/check?terminalID=RSQW-001
 * 
 * Conservative thresholds:
 * - Day: 40%+ rain = risky
 * - Night: 30%+ rain = risky (more sensitive)
 * - Recent alerts in area = always allow
 */
const checkIoTWeatherRisk = catchAsync(async (req, res) => {
    const { terminalID } = req.query;

    if (!terminalID) {
        return res.status(400).json({
            status: 'error',
            message: 'terminalID is required'
        });
    }

    console.log(`🤖 IoT weather check for terminal: ${terminalID}`);

    // Get weather data from cache
    const weatherData = await weatherCacheService.getOrFetchWeather(terminalID);

    if (!weatherData || !weatherData.current || !weatherData.hourly) {
        return res.status(404).json({
            status: 'error',
            message: 'Weather data not available for this terminal. Ensure terminal has coordinates configured.',
            allowAlert: false // Default to blocking if no weather data
        });
    }

    // Check rescue history with tiered sensitivity based on recency
    const alertRepo = AppDataSource.getRepository('Alert');
    
    // Define time windows
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    // Count alerts in different time windows
    const alertsLastWeek = await alertRepo
        .createQueryBuilder('alert')
        .where('alert.terminalID = :terminalID', { terminalID })
        .andWhere('alert.dateTimeSent >= :oneWeekAgo', { oneWeekAgo })
        .getCount();

    const alertsLastMonth = await alertRepo
        .createQueryBuilder('alert')
        .where('alert.terminalID = :terminalID', { terminalID })
        .andWhere('alert.dateTimeSent >= :oneMonthAgo', { oneMonthAgo })
        .andWhere('alert.dateTimeSent < :oneWeekAgo', { oneWeekAgo })
        .getCount();

    // Tiered sensitivity system
    let sensitivityMultiplier = 1.0; // Default: normal
    let sensitivityLevel = 'normal';

    if (alertsLastWeek > 0) {
        // High sensitivity: Rescues within last 7 days (soil still saturated, high risk)
        sensitivityMultiplier = 0.7; // 30% stricter
        sensitivityLevel = 'high';
    } else if (alertsLastMonth > 0) {
        // Moderate sensitivity: Rescues 1 week - 1 month ago (some residual risk)
        sensitivityMultiplier = 0.85; // 15% stricter
        sensitivityLevel = 'moderate';
    }
    // Else: Normal sensitivity (no recent rescues or >1 month old)

    // Determine time of day
    const currentHour = new Date().getHours();
    const isNightTime = currentHour >= 22 || currentHour < 6; // 10 PM - 6 AM

    // Get next 3-hour forecast (first hourly entry)
    const nextForecast = weatherData.hourly[0];
    const precipitationProbability = nextForecast?.precipitation || 0;

    // Check current conditions
    const currentDescription = weatherData.current.description.toLowerCase();
    const isCurrentlyRaining = currentDescription.includes('rain') || currentDescription.includes('drizzle');
    const windSpeed = weatherData.current.windSpeed;

    // Risk thresholds (adjusted by sensitivity if recent flooding)
    const baseRainThreshold = isNightTime ? 30 : 40; // Night: 30%, Day: 40%
    const rainThreshold = baseRainThreshold * sensitivityMultiplier; // Lowers to 22.5% (night) or 30% (day) if recent rescues
    
    const baseWindThreshold = 50; // km/h
    const windThreshold = baseWindThreshold * sensitivityMultiplier; // Lowers to 37.5 km/h if recent rescues

    // Determine if weather is risky
    let isRisky = false;
    let reasons = [];

    // Detailed condition checks for response
    const conditionChecks = {
        currentRain: {
            isRisky: isCurrentlyRaining,
            value: weatherData.current.description,
            threshold: 'Any rain',
            passed: !isCurrentlyRaining,
            explanation: isCurrentlyRaining 
                ? `Currently ${weatherData.current.description} - immediate flood risk`
                : 'Not raining currently'
        },
        rainForecast: {
            isRisky: precipitationProbability >= rainThreshold,
            value: `${precipitationProbability}%`,
            threshold: `${rainThreshold.toFixed(1)}%`,
            passed: precipitationProbability < rainThreshold,
            explanation: precipitationProbability >= rainThreshold
                ? `Rain probability ${precipitationProbability}% exceeds threshold ${rainThreshold.toFixed(1)}%`
                : `Rain probability ${precipitationProbability}% below threshold ${rainThreshold.toFixed(1)}%`
        },
        windSpeed: {
            isRisky: windSpeed > windThreshold,
            value: `${windSpeed.toFixed(1)} km/h`,
            threshold: `${windThreshold.toFixed(1)} km/h`,
            passed: windSpeed <= windThreshold,
            explanation: windSpeed > windThreshold
                ? `Wind ${windSpeed.toFixed(1)} km/h exceeds threshold ${windThreshold.toFixed(1)} km/h`
                : `Wind ${windSpeed.toFixed(1)} km/h below threshold ${windThreshold.toFixed(1)} km/h`
        }
    };

    // Check precipitation forecast
    if (precipitationProbability >= rainThreshold) {
        isRisky = true;
        const sensitivityNote = sensitivityLevel !== 'normal' 
            ? ` - ${sensitivityLevel} sensitivity (${alertsLastWeek > 0 ? alertsLastWeek + ' rescues in past week' : alertsLastMonth + ' rescues in past month'})`
            : '';
        reasons.push(`${precipitationProbability}% rain probability in next 3 hours (threshold: ${rainThreshold.toFixed(1)}%${sensitivityNote})`);
    }

    // Check current rain
    if (isCurrentlyRaining) {
        isRisky = true;
        reasons.push(`Currently raining: ${weatherData.current.description}`);
    }

    // Check wind
    if (windSpeed > windThreshold) {
        isRisky = true;
        const sensitivityNote = sensitivityLevel !== 'normal'
            ? ` - ${sensitivityLevel} sensitivity`
            : '';
        reasons.push(`High wind speed: ${windSpeed} km/h (threshold: ${windThreshold.toFixed(1)} km/h${sensitivityNote})`);
    }

    // Build response
    const riskLevel = isRisky ? 'RISKY' : 'NORMAL';
    const timeContext = isNightTime ? 'nighttime (more sensitive)' : 'daytime';

    console.log(`🌤️ Weather risk assessment: ${riskLevel}`);
    console.log(`📍 Terminal: ${terminalID} | Time: ${timeContext}`);
    console.log(`📊 Rain forecast: ${precipitationProbability}% | Currently: ${weatherData.current.description}`);
    console.log(`💨 Wind: ${windSpeed} km/h`);
    console.log(`⚠️ Sensitivity: ${sensitivityLevel.toUpperCase()} (multiplier: ${sensitivityMultiplier})`);
    if (alertsLastWeek > 0) {
        console.log(`🚨 ${alertsLastWeek} rescue(s) in past 7 days - HIGH SENSITIVITY`);
    } else if (alertsLastMonth > 0) {
        console.log(`⚠️ ${alertsLastMonth} rescue(s) in past month - MODERATE SENSITIVITY`);
    }
    console.log(`✅ Allow alert: ${isRisky}`);

    res.status(200).json({
        status: 'success',
        allowAlert: isRisky,
        riskLevel: riskLevel,
        reasons: reasons.length > 0 ? reasons : ['Weather conditions are normal'],
        conditionChecks: conditionChecks,
        weatherSummary: {
            currentCondition: weatherData.current.description,
            temperature: weatherData.current.temperature,
            rainProbability: precipitationProbability,
            windSpeed: windSpeed,
            isNightTime: isNightTime,
            alertsLastWeek: alertsLastWeek,
            alertsLastMonth: alertsLastMonth,
            sensitivityLevel: sensitivityLevel
        },
        thresholds: {
            rainThreshold: `${rainThreshold.toFixed(1)}% (${timeContext}, ${sensitivityLevel} sensitivity)`,
            baseRainThreshold: `${baseRainThreshold}%`,
            windThreshold: `${windThreshold.toFixed(1)} km/h`,
            baseWindThreshold: `${baseWindThreshold} km/h`,
            sensitivityMultiplier: sensitivityMultiplier,
            sensitivityLevel: sensitivityLevel
        }
    });
});

module.exports = {
    getCurrentWeather,
    getHourlyForecast,
    getWeeklyForecast,
    getCompleteWeather,
    refreshWeatherCache,
    getCacheStats,
    checkIoTWeatherRisk
};
