import { useState, useEffect, useRef } from "react";
import { Send, X, MessageCircle } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI with token from environment variable
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ResQWave system context for consistent AI responses
const RESQWAVE_CONTEXT = `You are ResQWave Assistant, an AI helper for ResQWave - a LoRa-powered emergency communication system designed to help communities send SOS alerts, share updates, and guide rescuers during flood events. Our terminals work even when cellular networks fail.

Chatbot Capabilities:

1. Interpret Distress Signals
    - Understand SOS button triggers and auto-flood alerts from IoT terminals. (keywords: SOS, distress, alert, auto-flood, trigger, button, terminal)
    - LoRa-powered terminals enable continuous distress signaling and location reporting even during power or internet outages. (keywords: LoRa, continuous, signaling, location, outage, power, internet)
    - SOS button: Press and hold for 5 seconds to send a distress signal via LoRa. (keywords: SOS, button, press, hold, 5 seconds, distress, send, LoRa)
    - Water sensor module: Automatically triggers emergency alerts when rising flood levels are detected. (keywords: water sensor, flood, rising, emergency, alert, auto, trigger)
    - LED indicators: Green (powered), Red (sending distress), Yellow (signal received), Blue (rescue incoming). (keywords: LED, indicator, green, red, yellow, blue, status)
    - Decision support dashboard: Consolidates real-time distress signals and vulnerability data for rescue coordination. (keywords: dashboard, decision support, real-time, distress, vulnerability, rescue, coordination)
    - Community participation: Residents and focal persons can send localized alerts and updates directly through the terminal system. (keywords: community, participation, resident, focal person, alert, update, terminal)
    - Visualization map: Displays distress signals with community and focal person info, color-coded by status (Gray: offline, Green: online, Yellow: user-initiated, Red: auto-flood, Blue: rescue dispatched). (keywords: visualization, map, distress, color, status, offline, online, user-initiated, auto-flood, rescue)

2. Handle General Questions
    - Provide broad, high-level information about ResQWave's purpose, features, and system overview for both residents and focal persons.
    - Predefined answers for general questions (include which user role can access each feature):
        * Purpose (keywords: purpose, goal, mission): ResQWave is designed to provide reliable emergency communication and rescue coordination for communities during disasters, especially floods. (All roles: residents, focal persons, dispatchers)
        * Benefits (keywords: benefits, advantages, why use): It enables distress signaling even during power or internet outages, improves rescue coordination, and empowers community participation. (All roles)
        * Technology (keywords: technology, technical, how it works, LoRa, IoT): ResQWave uses LoRa-powered IoT terminals, water sensors, and a decision support dashboard to transmit and visualize emergency alerts. (All roles)
        * Operation (keywords: operation, how to use, process, workflow): Community terminals send alerts via LoRa, which are received by a gateway and displayed on a dashboard for responders. The system supports real-time tracking, reporting, and resource allocation. (Residents and focal persons can send alerts; dispatchers and focal persons can view dashboard)
        * Who can use (keywords: users, who, access): Barangay dispatchers, community focal persons, and residents in flood-prone areas. (Role-specific: residents use terminals, focal persons manage community info, dispatchers coordinate rescues)
        * Dashboard (keywords: dashboard, map, reports, management): The dashboard provides map-based visualization, live reports, and management tools for communities, dispatchers, and terminals. (Dashboard access: dispatchers and focal persons)
        * Community involvement (keywords: community, residents, focal persons, participation): Residents and focal persons can send alerts, updates, and requests directly through the terminal system. (Residents and focal persons)

3. User Guidance
    - Provide specific, step-by-step instructions or task-based guidance for users, especially in emergency contexts.
    - Use natural, varied phrasing and only mention roles when necessary.
    - Predefined answers for user guidance (conversational and concise):
        * How to send an SOS alert: Press and hold the SOS button on your terminal for 5 seconds until the LED turns red—this sends a distress signal. (Residents and focal persons use terminals; others can assist by notifying their community focal person or dispatcher.)
        * How to check dashboard status: Log in to the dashboard and view the map for real-time alerts, community statuses, and rescue operations. (Dashboard access is for dispatchers and focal persons. If you don't have access, request updates from your focal person or dispatcher.)
        * How to update community info: Go to your dashboard profile, select your community, and update details like household count, flood risk, and focal person information. (Only focal persons can update; others should contact their focal person for changes.)
        * What to do during a flood emergency: Send an SOS alert using your terminal, follow instructions from barangay officials, and stay updated via community announcements. (Residents take these actions; others should help share official instructions and support communication.)
        * How to acknowledge a received signal: Confirm the alert in the dashboard, dispatch rescue if needed, and send a response to the terminal to change the LED status to blue. (This is done by dispatchers; if you're not a dispatcher, notify your dispatcher or focal person about received alerts.)
        * How to manage system settings: Use the admin dashboard to manage system settings, user roles, and permissions. (Admins only; for changes or support, contact your system administrator.)

4. Clarification Requests Fallback (for unclear or unmatched inputs, choose one dynamically):
    * "I didn't quite catch that. Could you please clarify your question about ResQWave?"
    * "Can you rephrase or provide more details? I'm here to help with anything about ResQWave's system or features."
    * "I'm not sure I understand. Would you like to know about ResQWave's technology, operation, or benefits?"
    * "Could you tell me a bit more about what you're looking for regarding ResQWave?"
    * "Let me know if you want to ask about SOS alerts, the dashboard, or how ResQWave works!"

5. Safety Tips & Preparedness Guidance
    - Provide general disaster preparedness advice and safety instructions during emergencies.
    - Predefined answers for safety and preparedness:
        * Flood safety tips: Move to higher ground, avoid walking or driving through floodwaters, and keep emergency supplies ready (water, food, flashlight, radio, first aid kit).
        * Emergency kit checklist: Pack clean water, non-perishable food, flashlight, batteries, radio, first aid kit, important documents, and necessary medications.
        * Family emergency plan: Agree on a safe meeting place, share contact information, and make sure everyone knows how to use the ResQWave terminal for alerts.
        * Power outage safety: Use battery-powered lights, avoid candles, unplug electronics, and keep your phone charged for emergency updates.
        * Evacuation advice: Follow instructions from local officials, bring your emergency kit, and help neighbors who may need assistance.
        * Staying informed: Listen to official announcements, monitor the ResQWave dashboard or community updates, and avoid spreading rumors.

6. Contact Information
    - When users ask about contacting ResQWave, support, or need help, always provide:
        * Email: resqwaveinfo@gmail.com
        * Include this in responses about technical support, questions, or assistance
    - Example responses: "For additional support, you can reach us at resqwaveinfo@gmail.com" or "Contact our team at resqwaveinfo@gmail.com for further assistance"`;

interface Message {
    id: number;
    text: string;
    sender: "user" | "bot";
    timestamp: Date;
    translatedText?: string;
    showTranslation?: boolean;
    isTranslating?: boolean;
}

interface ChatbotDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChatbotDrawer({ isOpen, onClose }: ChatbotDrawerProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [quickActions, setQuickActions] = useState<string[]>([]);
    const [quickActionsLoading, setQuickActionsLoading] = useState(false);
    const [greetingShown, setGreetingShown] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Handle translation to Tagalog
    const handleTranslate = async (messageId: number) => {
        const message = messages.find(m => m.id === messageId);
        if (!message || message.sender === "user") return;

        // Toggle visibility if already translated
        if (message.translatedText) {
            setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, showTranslation: !m.showTranslation } : m
            ));
            return;
        }

        // Set translating state
        setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, isTranslating: true } : m
        ));

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `Translate the following English text to Tagalog (Filipino). Keep it natural and conversational. Return ONLY the Tagalog translation, no explanation:\n\n${message.text}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const translatedText = response.text().trim();

            setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, translatedText, showTranslation: true, isTranslating: false } : m
            ));
        } catch (error) {
            console.error('Translation error:', error);
            setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, isTranslating: false } : m
            ));
        }
    };

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Show initial greeting when chat opens
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Show initial greeting and fetch dynamic quick actions in parallel
            setIsTyping(true);
            setGreetingShown(false);

            // Start fetching quick actions immediately
            const initialContext = `You are ResQWave Assistant, an AI helper for ResQWave - a LoRa-powered emergency communication system designed to help communities send SOS alerts, share updates, and guide rescuers during flood events. Our terminals work even when cellular networks fail.`;
            const greetingText = "Hi there! I'm ResQWave Assistant. How can I help you today?";

            // Fetch quick actions in parallel (don't wait for timeout)
            (async () => {
                try {
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const prompt = `Generate 3 specific, clear questions about ResQWave. Each must be a complete question (6-9 words) that users would actually ask. Focus on: purpose, benefits, technology, who can use it, how it works. Return ONLY JSON array. Examples: ["What is the purpose of ResQWave?", "How does the LoRa technology work?", "Who can use the ResQWave system?", "What are the main benefits of ResQWave?"]`;
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    let text = response.text().trim();
                    // Remove markdown code blocks if present
                    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
                    const actions = JSON.parse(text);
                    if (Array.isArray(actions)) {
                        setQuickActions(actions.slice(0, 3));
                    }
                } catch (err) {
                    console.error('Quick actions error:', err);
                    setQuickActions([]);
                } finally {
                    setQuickActionsLoading(false);
                }
            })();

            setTimeout(() => {
                const greetingMessage: Message = {
                    id: 1,
                    text: greetingText,
                    sender: "bot",
                    timestamp: new Date(),
                };
                setMessages([greetingMessage]);
                setIsTyping(false);
                setGreetingShown(true);
            }, 1000);
        }
    }, [isOpen, messages.length]);

    // Function to get suggested actions from Gemini
    async function fetchQuickActions(context: string, lastBotMessage: string) {
        setQuickActionsLoading(true);
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            // Enhanced prompt for more diverse, creative, and contextually relevant Quick Actions
            const prompt = `You are ResQWave Assistant. Based on the following conversation context and the last bot response, suggest up to 3 unique, creative, and contextually relevant quick action button labels for the user to tap next. Avoid repeating the same suggestions every time, and vary your choices to cover different features, tips, and emergency actions. Only return a JSON array of strings, no explanation.

            Context:
            ${context}

            Last bot response:
            ${lastBotMessage}

            Example output: ["Send SOS alert", "Show safety tips", "Evacuation advice", "Check terminal status", "Update community info", "View dashboard map", "Family emergency plan", "Power outage safety", "Contact focal person", "Acknowledge received signal"]

            IMPORTANT: Each time you generate quick actions, make sure the suggestions are varied and not always the same. Prioritize diversity and relevance to the current context.`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            // Try to parse JSON array from Gemini response
            const actions = JSON.parse(text);
            if (Array.isArray(actions)) {
                setQuickActions(actions.slice(0, 3));
            }
        } catch (err) {
            setQuickActions([]); // No fallback, just empty if Gemini fails
        } finally {
            setQuickActionsLoading(false);
        }
    }

    const handleSendMessage = async (messageText?: string) => {
        const textToSend = messageText ?? inputValue;
        if (textToSend.trim() === "") return;

        const userMessage: Message = {
            id: messages.length + 1,
            text: textToSend,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsTyping(true);
        setQuickActions([]); // Hide quick actions immediately after user clicks one

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const context = `${RESQWAVE_CONTEXT}
    
            Answer the following question helpfully and concisely (2-3 sentences max): ${textToSend}`;

            // Start fetching quick actions immediately in parallel (don't wait for bot response)


            // Start fetching quick actions immediately in parallel (don't wait for bot response)
            const quickActionsPromise = (async () => {
                try {
                    const quickActionsModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const prompt = `User asked: "${textToSend}". Generate 3 specific follow-up questions (6-9 words each) related to ResQWave emergency system. Each must be a clear, complete question users would ask. Return ONLY valid JSON array. Examples: ["How do I send an SOS alert?", "What do the LED indicators mean?", "How can I access the dashboard?", "What features are available?"]`;
                    const result = await quickActionsModel.generateContent(prompt);
                    const response = await result.response;
                    let text = response.text().trim();
                    // Remove markdown code blocks if present
                    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
                    const actions = JSON.parse(text);
                    if (Array.isArray(actions)) {
                        return actions.slice(0, 3);
                    }
                    return [];
                } catch (err) {
                    console.error('Quick actions error:', err);
                    return [];
                }
            })();

            const result = await model.generateContent(context);
            const response = await result.response;
            const aiResponse = response.text();

            const botMessage: Message = {
                id: messages.length + 2,
                text: aiResponse,
                sender: "bot",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
            setIsTyping(false); // Hide typing indicator immediately after bot message

            // Wait for quick actions to finish and update UI
            const actions = await quickActionsPromise;
            setQuickActions(actions);
            setQuickActionsLoading(false);
        } catch (error) {
            console.error("Error calling Gemini AI:", error);
            console.error("Error details:", error instanceof Error ? error.message : String(error));

            // Fallback response if AI fails
            const botMessage: Message = {
                id: messages.length + 2,
                text: "I apologize, but I'm having trouble connecting right now. ResQWave is a LoRa-powered emergency communication system that helps communities during floods. Please try asking your question again, or contact our support team for immediate assistance.",
                sender: "bot",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMessage]);
            setQuickActions(["Send SOS alert", "Show safety tips", "Evacuation advice"]);
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            {/* Backdrop overlay */}
            {isOpen && (
                <div
                    onClick={onClose}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.4)",
                        zIndex: 9998,
                        backdropFilter: "blur(2px)",
                        transition: "opacity 0.3s",
                        opacity: isOpen ? 1 : 0
                    }}
                />
            )}

            {/* Right Drawer Chat */}
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    height: "100vh",
                    width: "420px",
                    maxWidth: "90vw",
                    background: "rgba(30, 30, 35, 0.98)",
                    backdropFilter: "blur(20px)",
                    boxShadow: isOpen ? "-8px 0 32px rgba(0, 0, 0, 0.5)" : "none",
                    zIndex: 9999,
                    transform: isOpen ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex",
                    flexDirection: "column"
                }}
            >
                {/* Drawer content - always rendered for animation */}
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    {/* Chat Header */}
                    <div
                        style={{
                            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                            padding: "24px 24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                            flexShrink: 0
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: "50%",
                                    background: "rgba(255, 255, 255, 0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <MessageCircle size={24} style={{ color: "#fff" }} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, color: "#fff", fontSize: 18 }}>ResQWave Assistant</div>
                                <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.8)" }}>Always here to help</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: "rgba(255, 255, 255, 0.15)",
                                border: "none",
                                borderRadius: "50%",
                                width: 36,
                                height: 36,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
                        >
                            <X size={20} style={{ color: "#fff" }} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "20px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                            background: "rgba(20, 20, 25, 0.4)"
                        }}
                    >
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`mb-3 flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${message.sender === "user"
                                        ? "bg-linear-to-br from-blue-600 to-blue-500 text-white"
                                        : "bg-gray-700/50 text-gray-100"
                                        }`}
                                    style={{
                                        boxShadow:
                                            message.sender === "user"
                                                ? "0 2px 8px rgba(59, 130, 246, 0.3)"
                                                : "0 2px 6px rgba(0, 0, 0, 0.2)",
                                    }}
                                >
                                    <p className="text-sm leading-relaxed">
                                        {message.sender === "bot" && message.showTranslation && message.translatedText
                                            ? message.translatedText
                                            : message.text}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                        <p
                                            className={`text-xs ${message.sender === "user"
                                                ? "text-blue-100"
                                                : "text-gray-400"
                                                }`}
                                        >
                                            {message.timestamp.toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                        {message.sender === "bot" && (
                                            <button
                                                onClick={() => handleTranslate(message.id)}
                                                className="text-xs text-blue-400 hover:text-blue-300 ml-2 underline"
                                                disabled={message.isTranslating}
                                            >
                                                {message.isTranslating
                                                    ? "Translating..."
                                                    : message.showTranslation
                                                        ? "Hide translation"
                                                        : "See translation"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="mb-3 flex justify-start">
                                <div
                                    className="bg-gray-700/50 rounded-2xl px-4 py-3"
                                    style={{ boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)" }}
                                >
                                    <div className="flex gap-1">
                                        <div
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: "0ms" }}
                                        />
                                        <div
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: "150ms" }}
                                        />
                                        <div
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: "300ms" }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area with Quick Actions */}
                    <div
                        style={{
                            padding: "18px 20px 22px",
                            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            background: "rgba(25, 25, 30, 0.6)",
                            flexShrink: 0
                        }}
                    >
                        <div className="flex flex-col gap-2">
                            {/* Quick Actions Buttons */}
                            {greetingShown && quickActions.length > 0 && (
                                <div className="flex flex-col gap-2 mb-2 w-full">
                                    {quickActions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSendMessage(action)}
                                            className="w-full bg-gray-700/50 text-white px-3 py-2 rounded-md text-[14.4px] font-medium shadow hover:bg-blue-600 hover:text-white transition-all duration-150"
                                            style={{ minWidth: "100%" }}
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-gray-800/50 text-white rounded-full px-4 py-2 text-sm outline-none border border-gray-700 focus:border-blue-500 transition-colors"
                                />
                                <button
                                    onClick={() => handleSendMessage()}
                                    className="bg-linear-to-br from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-full p-2 transition-all duration-200 hover:scale-105 active:scale-95"
                                    style={{ boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" }}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

