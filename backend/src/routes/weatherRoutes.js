const express = require('express');
const weatherController = require('../controllers/weatherController');

const router = express.Router();

// Weather routes
router.get('/current', weatherController.getCurrentWeather);
router.get('/hourly', weatherController.getHourlyForecast);
router.get('/weekly', weatherController.getWeeklyForecast);
router.get('/complete', weatherController.getCompleteWeather);

// Cache management routes
router.post('/refresh', weatherController.refreshWeatherCache);
router.get('/cache/stats', weatherController.getCacheStats);
router.post('/toggle-check', weatherController.toggleWeatherCheck);
router.post('/toggle-manual-block', weatherController.toggleManualBlock);

// IoT weather risk check (public endpoint for IoT devices)
router.get('/iot/check', weatherController.checkIoTWeatherRisk);

module.exports = router;
