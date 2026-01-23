const weatherService = require('../services/weatherService');
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
 * GET /api/weather/complete?lat=14.7565&lon=121.0174
 */
const getCompleteWeather = catchAsync(async (req, res) => {
    const { lat, lon } = req.query;
    console.log('🌤️ Weather API called - lat:', lat, 'lon:', lon);

    // Convert to numbers if provided, otherwise use defaults
    const latitude = lat ? parseFloat(lat) : undefined;
    const longitude = lon ? parseFloat(lon) : undefined;

    const weatherData = await weatherService.getCompleteWeatherData(latitude, longitude);
    console.log('✅ Weather data fetched successfully');

    res.status(200).json({
        status: 'success',
        data: weatherData
    });
});

module.exports = {
    getCurrentWeather,
    getHourlyForecast,
    getWeeklyForecast,
    getCompleteWeather
};
