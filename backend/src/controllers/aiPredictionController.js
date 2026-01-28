const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY || null;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Rate limiting - track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000; // 3 seconds between requests

/**
 * Generate AI-powered flood/emergency predictions
 * Uses Gemini 2.5 Flash to analyze weather, rescue history, and community data
 */
const generatePrediction = async (req, res) => {
    try {
        const { weatherData, rescueRecords, communityData, additionalContext } = req.body;

        if (!weatherData || !rescueRecords || !communityData) {
            return res.status(400).json({
                error: "Missing required data: weatherData, rescueRecords, and communityData are required"
            });
        }

        if (!genAI) {
            return res.status(503).json({
                error: "AI service unavailable - GEMINI_API_KEY not configured"
            });
        }

        // Rate limiting check
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            const waitTime = Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
            return res.status(429).json({
                error: `Please wait ${waitTime} seconds before generating another prediction`,
                retryAfter: waitTime
            });
        }
        lastRequestTime = now;

        // Build additional context section if provided
        const additionalContextSection = additionalContext
            ? `\n\nADDITIONAL CONTEXT FROM DISPATCHER/ADMIN:\n${additionalContext}\n\nIMPORTANT: Consider this additional context heavily in your analysis as it represents real-time local conditions not captured in the data.`
            : '';

        // Construct comprehensive prompt for Gemini
        const prompt = `You are an expert flood risk analyst for ResQWave emergency response system.

CURRENT WEATHER DATA:
Temperature: ${weatherData.current.temperature}°C
Humidity: ${weatherData.current.humidity}%
Pressure: ${weatherData.current.pressure} hPa
Wind Speed: ${weatherData.current.windSpeed} km/h
Conditions: ${weatherData.current.description}

24-HOUR FORECAST:
${weatherData.hourly.slice(0, 24).map(h => `${h.time}: ${h.temperature}°C, ${h.description}`).join('\n')}

7-DAY FORECAST:
${weatherData.weekly.map(w => `${w.day}: ${w.high}°C/${w.low}°C - ${w.condition}`).join('\n')}

COMMUNITY INFORMATION (${communityData.groupName}):
- Terminal Address: ${communityData.address || 'N/A'}
- Households: ${communityData.stats?.noOfHouseholds || 'N/A'}
- Residents: ${communityData.stats?.noOfResidents || 'N/A'}
- Flood Subsidence Duration: ${communityData.floodwaterSubsidenceDuration || 'N/A'}
- Known Hazards: ${communityData.hazards?.join(', ') || 'N/A'}
- Other Info: ${communityData.otherInfo?.join(', ') || 'N/A'}
${additionalContextSection}

RECENT RESCUE HISTORY (${rescueRecords.length} records analyzed):
${rescueRecords.slice(0, 10).map(r => `- ${r.alertType}: ${r.noOfPersonnel || 0} personnel, Response time: ${getResponseTime(r)}, Water level: ${r.waterLevel || 'N/A'}, Urgency: ${r.urgencyOfEvacuation || 'N/A'}`).join('\n')}

Based on this data, provide a comprehensive flood/emergency risk assessment in JSON format:

{
  "riskLevel": "low|medium|high|critical",
  "confidence": <number 0-100>,
  "summary": "<2-3 sentence overview>",
  "estimatedResponseTime": "<time range like '2-4 hours', '30-60 minutes', '4-6 hours'>",
  "timeWindow": "<action deadline like 'Next 6-12 hours', 'Within 24 hours', 'Immediate (0-2 hours)'>",
  "predictions": [
    {
      "title": "<prediction title>",
      "impact": "low|medium|high|critical",
      "description": "<brief description>",
      "confidence": <number 0-100>,
      "timeframe": "<when this might occur>"
    }
  ],
  "recommendations": [
    {
      "priority": "low|medium|high|critical",
      "action": "<specific action to take>",
      "rationale": "<why this action is recommended>"
    }
  ],
  "resourceAllocation": {
    "personnelNeeded": <estimated number>,
    "equipmentSuggestions": ["<equipment 1>", "<equipment 2>"],
    "evacuationReadiness": "<none|standby|prepare|immediate>"
  }
}

IMPORTANT: 
- estimatedResponseTime should be realistic based on rescue history and severity
- timeWindow should indicate when action must be taken
- Return ONLY valid JSON, no markdown formatting, no code fences, no explanations outside the JSON structure.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let result, response, rawText;
        try {
            result = await model.generateContent(prompt);
            response = await result.response;
            rawText = response.text().trim();
        } catch (geminiError) {
            console.error("Gemini API error:", geminiError.message);

            // Handle rate limiting / overload
            if (geminiError.message.includes('503') || geminiError.message.includes('overloaded')) {
                return res.status(503).json({
                    error: "AI service is currently overloaded. Please try again in 1-2 minutes.",
                    retryAfter: 60
                });
            }

            // Handle other Gemini errors
            return res.status(503).json({
                error: "AI service error: " + geminiError.message,
                retryAfter: 30
            });
        }

        // Strip markdown code fences if present
        rawText = rawText
            .replace(/```json\s*/gi, "")
            .replace(/```/g, "")
            .replace(/^json\s*/i, "")
            .trim();

        // Parse and validate JSON
        let prediction;
        try {
            prediction = JSON.parse(rawText);
        } catch (parseError) {
            console.error("Failed to parse Gemini response:", rawText);
            return res.status(500).json({
                error: "AI generated invalid response format",
                raw: rawText
            });
        }

        return res.json({
            prediction,
            generatedAt: new Date().toISOString(),
        });

    } catch (err) {
        console.error("AI Prediction error:", err);
        return res.status(500).json({
            error: "Failed to generate prediction",
            details: err.message
        });
    }
};

// Helper to calculate response time from rescue record
function getResponseTime(record) {
    if (!record.completionDate || !record.dateTimeOccurred) return 'N/A';
    const start = new Date(record.dateTimeOccurred);
    const end = new Date(record.completionDate);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
}

module.exports = {
    generatePrediction,
};
