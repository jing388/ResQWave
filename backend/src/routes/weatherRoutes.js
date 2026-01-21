const express = require('express');
const weatherController = require('../controllers/weatherController');

const router = express.Router();

// Weather routes
router.get('/current', weatherController.getCurrentWeather);
router.get('/hourly', weatherController.getHourlyForecast);
router.get('/weekly', weatherController.getWeeklyForecast);
router.get('/complete', weatherController.getCompleteWeather);

module.exports = router;
