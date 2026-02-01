const express = require('express');
const router = express.Router();
const { alertFocalPerson } = require('../controllers/focalAlertController');

// POST /api/focal-alert - Send alert to focal person
// Note: This route is protected by authMiddleware in index.js (all routes after authMiddleware are protected)
router.post('/', alertFocalPerson);

module.exports = router;
