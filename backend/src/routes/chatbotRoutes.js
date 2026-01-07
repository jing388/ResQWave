const express = require("express");
const router = express.Router();
const {
    generateAIResponse,
    translateMessage,
} = require("../controllers/chatbotController");

// Chatbot Routes
router.post("/chat", generateAIResponse);
router.post("/translate", translateMessage);

module.exports = router;