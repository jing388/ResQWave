const express = require("express");
const router = express.Router();
const { generatePrediction } = require("../controllers/aiPredictionController");
const { authMiddleware } = require("../middleware/authMiddleware");

// AI Prediction Routes
router.post("/generate", authMiddleware, generatePrediction);

module.exports = router;
