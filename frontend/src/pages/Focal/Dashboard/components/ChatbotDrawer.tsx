import { useState, useEffect, useRef } from "react";
import { Send, X, MessageCircle } from "lucide-react";
import { apiFetch } from "../../../../lib/api";

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
  const [greetingShown, setGreetingShown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle translation to Tagalog
  const handleTranslate = async (messageId: number) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message || message.sender === "user") return;

    // Toggle visibility if already translated
    if (message.translatedText) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, showTranslation: !m.showTranslation } : m
        )
      );
      return;
    }

    // Set translating state
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isTranslating: true } : m))
    );

    try {
      const data = await apiFetch<{ translatedText?: string }>('/chatbot/translate', {
        method: 'POST',
        body: JSON.stringify({ text: message.text }),
      });
      const translatedText = data.translatedText || '[Translation unavailable]';

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
              ...m,
              translatedText,
              showTranslation: true,
              isTranslating: false,
            }
            : m
        )
      );
    } catch (error) {
      console.error("Translation error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isTranslating: false } : m
        )
      );
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

      const greetingText = "Hi there! I'm ResQWave Assistant. How can I help you today?";

      // Fetch quick actions from backend in parallel
      (async () => {
        try {
          const data = await apiFetch<{ quickActions?: string[] }>('/chatbot/chat', {
            method: 'POST',
            body: JSON.stringify({ text: 'Generate quick actions for greeting', mode: 'quickActions' }),
          });
          if (Array.isArray(data.quickActions) && data.quickActions.length) {
            setQuickActions(data.quickActions.slice(0, 3));
          }
        } catch (_err) {
          console.error("Quick actions error:", _err);
          setQuickActions([]);
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
      // Main bot response via apiFetch
      const data = await apiFetch<{ response?: string }>('/chatbot/chat', {
        method: 'POST',
        body: JSON.stringify({ text: textToSend, mode: 'main' }),
      });
      const aiResponse = (data && (data as any).response) || (data as any) || '[No response]';

      const botMessage: Message = {
        id: messages.length + 2,
        text: aiResponse,
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);

      // Quick actions (fire-and-forget and update when available)
      (async () => {
        try {
          const qaData = await apiFetch<{ quickActions?: string[] }>('/chatbot/chat', {
            method: 'POST',
            body: JSON.stringify({ text: textToSend, mode: 'quickActions' }),
          });
          if (Array.isArray(qaData.quickActions)) setQuickActions(qaData.quickActions.slice(0, 3));
        } catch (err) {
          console.error("Quick actions error:", err);
        }
      })();
    } catch (error) {
      console.error("Error calling backend chatbot:", error);
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
            opacity: isOpen ? 1 : 0,
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
          flexDirection: "column",
        }}
      >
        {/* Drawer content - always rendered for animation */}
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
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
              flexShrink: 0,
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
                  justifyContent: "center",
                }}
              >
                <MessageCircle size={24} style={{ color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "#fff", fontSize: 18 }}>
                  ResQWave Assistant
                </div>
                <div
                  style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.8)" }}
                >
                  Always here to help
                </div>
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
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")
              }
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
              background: "rgba(20, 20, 25, 0.4)",
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-3 flex ${message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
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
                    {message.sender === "bot" &&
                      message.showTranslation &&
                      message.translatedText
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
              flexShrink: 0,
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
