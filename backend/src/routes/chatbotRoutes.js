const express = require("express");
const router = express.Router();
const {
    generateAIResponse,
    translateMessage,
    refreshContext,
    getSettings,
} = require("../controllers/chatbotController");

// Chatbot Routes
router.post("/chat", generateAIResponse);
router.post("/translate", translateMessage);

// Admin/utility routes
router.post("/refresh-context", refreshContext); // Refresh context cache from Sanity
router.get("/settings", getSettings); // Get chatbot settings

module.exports = router;