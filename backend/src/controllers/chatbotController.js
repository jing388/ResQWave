const { GoogleGenerativeAI } = require("@google/generative-ai");
const { buildChatbotContext, getChatbotSettings, getClarificationMessages } = require("../services/sanity-chatbot-service");

// Get context from Sanity (no caching - always fresh)
const getContext = async (userRole = null) => {
    return await buildChatbotContext(userRole);
};

const apiKey = process.env.GEMINI_API_KEY || null;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const stripCodeFences = (s) => {
    if (!s) return s;
    // Remove markdown code fences and language identifiers
    let cleaned = s.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    // Remove any leading "json" text that might remain
    cleaned = cleaned.replace(/^json\s*/i, "").trim();
    return cleaned;
};

const generateQuickActionsInternal = async (text, count = 3) => {
    const fallback = [
        "How do I send an SOS alert?",
        "What do the LED indicators mean?",
        "How can I access the dashboard?",
    ];

    if (!genAI) {
        return fallback.slice(0, count);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `User query: ${text}\n\nGenerate ${count} specific, clear follow-up questions (6-9 words each) a user might ask about ResQWave. Return ONLY a valid JSON array of strings, no markdown formatting, no explanations.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const raw = stripCodeFences(response.text());

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.slice(0, count);
        } catch (err) {
            // parsing failed, return fallback
            console.warn("Quick actions parse failed", err);
            console.warn("Raw response was:", response.text());
        }

        return fallback.slice(0, count);
    } catch (err) {
        // Gemini API error (503 overload, network error, etc.)
        console.warn("Gemini requests too fast, using fallback quick actions");
        return fallback.slice(0, count);
    }
};

const generateAIResponse = async (req, res) => {
    try {
        const { text, context, mode, userRole } = req.body;
        if (!text) return res.status(400).json({ error: "Missing text" });

        // Check maintenance mode first
        const settings = await getChatbotSettings();
        if (settings?.isMaintenanceMode) {
            const maintenanceMsg = settings.maintenanceMessage || "The chatbot is currently under maintenance. Please try again later.";
            return res.json({ response: maintenanceMsg });
        }

        // If client requested quick actions specifically
        if (mode === "quickActions") {
            const quickActionCount = settings?.quickActionCount || 3;
            const actions = await generateQuickActionsInternal(text, quickActionCount);
            return res.json({ quickActions: actions });
        }

        if (!genAI) {
            return res.json({ response: `ResQWave Assistant (offline): ${text}` });
        }

        // Get context from Sanity (filtered by user role)
        const sanityContext = await getContext(userRole);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Use client-provided context if available, otherwise use Sanity context
        const finalContext = context || sanityContext;

        // Add simple role context - guidance is already filtered by role in the service
        const roleContext = userRole
            ? `\n\nUser role: ${userRole}. When answering, adapt the response specifically for this role. If the guidance mentions different instructions for different roles, provide ONLY the information relevant to ${userRole}. If user asks about features not available to their role, politely inform them those features are only available for other roles.`
            : `\n\nUser role: resident. When answering, provide information relevant to residents only. If user asks about administrative or dashboard features, politely inform them those are only available for focal persons, dispatchers, or admins.`;

        // Use settings from maintenance check (already fetched)
        const maxSentences = settings?.maxResponseLength || 3;
        const defaultLanguage = settings?.defaultLanguage || 'en';

        // Add language instruction
        const languageInstruction = defaultLanguage === 'tl'
            ? '\n\nIMPORTANT: Respond in Tagalog (Filipino) language.'
            : '\n\nIMPORTANT: Respond in English.';

        const prompt = `${finalContext}${roleContext}${languageInstruction}\n\nAnswer concisely (${maxSentences} sentences max): ${text}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const out = response.text().trim();

        return res.json({ response: out });
    } catch (err) {
        console.error("Chatbot generate error:", err);
        return res.status(500).json({ error: "Chatbot error" });
    }
};

const translateMessage = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: "Missing text" });

        if (!genAI) {
            return res.json({ translatedText: `[Tagalog translation placeholder] ${text}` });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Translate the following English text to Tagalog (Filipino). Keep it natural and conversational. Return ONLY the Tagalog translation, no explanation:\n\n${text}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translated = response.text().trim();

        return res.json({ translatedText: translated });
    } catch (err) {
        console.error("Translation error:", err);
        return res.status(500).json({ error: "Translation error" });
    }
};

/**
 * Refresh the chatbot context (no cache, so this just confirms Sanity is accessible)
 */
const refreshContext = async (req, res) => {
    try {
        const context = await buildChatbotContext();
        return res.json({
            message: "Context fetched successfully (no cache)",
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Context refresh error:", err);
        return res.status(500).json({ error: "Failed to refresh context" });
    }
};

/**
 * Get current chatbot settings
 */
const getSettings = async (req, res) => {
    try {
        const settings = await getChatbotSettings();
        return res.json({ settings });
    } catch (err) {
        console.error("Get settings error:", err);
        return res.status(500).json({ error: "Failed to get settings" });
    }
};

module.exports = {
    generateAIResponse,
    translateMessage,
    generateQuickActionsInternal,
    refreshContext,
    getSettings,
};