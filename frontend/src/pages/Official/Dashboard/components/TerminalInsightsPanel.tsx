import {
    X,
    Sun,
    Cloud,
    CloudRain,
    CloudSnow,
    CloudDrizzle,
    Moon,
    Droplets,
    Gauge,
    Wind,
    Eye,
    Thermometer,
    FileText,
    TrendingUp,
    CheckCircle,
    AlertTriangle,
    AlertCircle,
    Shield,
    Brain,
    Loader2,
    Zap,
} from "lucide-react";
// Mock recent logs for rescue records
const recentLogs = [
    { id: 1, type: "Water Rescue", status: "resolved", timestamp: "2h ago" },
    { id: 2, type: "Storm Alert", status: "alert", timestamp: "5h ago" },
    { id: 3, type: "Flood Warning", status: "alert", timestamp: "1d ago" },
];

// Mock AI predictions
const predictions = [
    {
        title: "Flash Flood Risk",
        impact: "high",
        description: "Heavy rainfall in next 24h",
        confidence: 78,
    },
    {
        title: "Wind Advisory",
        impact: "medium",
        description: "Gusts up to 45km/h coastal",
        confidence: 85,
    },
];

// Mock analyzing state
const isAnalyzing = false;
import { useEffect, useState } from "react";

interface TerminalInsightsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    terminalID: string;
    terminalName: string;
}

export function TerminalInsightsPanel({
    isOpen,
    onClose,
    terminalID,
    terminalName,
}: TerminalInsightsPanelProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Mock hourly weather data (will be replaced with API data)
    const hourlyForecast = [
        { time: "12 AM", temp: 23, icon: <Moon className="w-8 h-8 text-blue-300" /> },
        { time: "01 AM", temp: 22, icon: <Cloud className="w-8 h-8 text-gray-400" /> },
        { time: "02 AM", temp: 21, icon: <CloudDrizzle className="w-8 h-8 text-blue-400" /> },
        { time: "03 AM", temp: 20, icon: <CloudRain className="w-8 h-8 text-blue-500" /> },
        { time: "04 AM", temp: 19, icon: <CloudRain className="w-8 h-8 text-blue-500" /> },
        { time: "05 AM", temp: 20, icon: <CloudDrizzle className="w-8 h-8 text-blue-400" /> },
        { time: "06 AM", temp: 22, icon: <Cloud className="w-8 h-8 text-gray-400" /> },
        { time: "07 AM", temp: 24, icon: <Sun className="w-8 h-8 text-yellow-400" /> },
        { time: "08 AM", temp: 26, icon: <Sun className="w-8 h-8 text-yellow-400" /> },
        { time: "09 AM", temp: 28, icon: <Sun className="w-8 h-8 text-yellow-400" /> },
        { time: "10 AM", temp: 30, icon: <Sun className="w-8 h-8 text-yellow-400" /> },
        { time: "11 AM", temp: 31, icon: <Sun className="w-8 h-8 text-yellow-400" /> },
    ];

    // Mock weekly forecast
    const weeklyForecast = [
        { day: "Today", high: 31, low: 19, condition: "Partly Cloudy", icon: <Cloud className="w-6 h-6 text-gray-400" /> },
        { day: "Tomorrow", high: 30, low: 20, condition: "Light Rain", icon: <CloudRain className="w-6 h-6 text-blue-400" /> },
        { day: "Wednesday", high: 29, low: 21, condition: "Rainy", icon: <CloudRain className="w-6 h-6 text-blue-500" /> },
        { day: "Thursday", high: 28, low: 20, condition: "Cloudy", icon: <Cloud className="w-6 h-6 text-gray-400" /> },
        { day: "Friday", high: 30, low: 22, condition: "Sunny", icon: <Sun className="w-6 h-6 text-yellow-400" /> },
        { day: "Saturday", high: 32, low: 23, condition: "Sunny", icon: <Sun className="w-6 h-6 text-yellow-400" /> },
        { day: "Sunday", high: 31, low: 22, condition: "Partly Cloudy", icon: <Cloud className="w-6 h-6 text-gray-400" /> },
    ];

    // Handle slide animation
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed z-40 transition-opacity bg-black/50"
                style={{
                    top: 0,
                    bottom: 0,
                    left: "80px", // Sidebar width (collapsed state)
                    right: 0,
                    opacity: isVisible ? 1 : 0,
                }}
                onClick={onClose}
            />

            {/* Bottom Panel - Full map width with shadcn dark theme */}
            <div
                className="fixed bottom-0 bg-[#171717] border-t border-border z-[9999] transition-transform duration-300 ease-out"
                style={{
                    left: "80px", // Sidebar width (collapsed state)
                    right: 0,
                    height: "60vh",
                    transform: isVisible ? "translateY(0)" : "translateY(100%)",
                    boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.5)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-[#171717]">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Thermometer className="w-5 h-5 text-muted-foreground" />
                            AI Decision Support - {terminalName}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Terminal ID: {terminalID}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-accent"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="overflow-y-auto h-[calc(60vh-64px)] p-4 bg-[#171717]">
                    <div className="flex flex-row gap-4">
                        {/* Left: Stats, Hourly, Temp Trend stacked */}
                        <div className="flex flex-row gap-4">
                            {/* Stats column - narrow, stacked vertically */}
                            <div className="flex flex-col gap-3" style={{ minWidth: '140px', maxWidth: '160px', flex: '0 0 150px' }}>
                                <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-3" style={{ boxShadow: '0 2px 8px 0 #0000000a' }}>
                                    <Droplets className="w-7 h-7 text-blue-400" />
                                    <div>
                                        <p className="text-xl font-bold text-foreground">87%</p>
                                        <p className="text-xs text-muted-foreground">Humidity</p>
                                    </div>
                                </div>
                                <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-3" style={{ boxShadow: '0 2px 8px 0 #0000000a' }}>
                                    <Gauge className="w-7 h-7 text-purple-400" />
                                    <div>
                                        <p className="text-xl font-bold text-foreground">1.01</p>
                                        <p className="text-xs text-muted-foreground">Pressure</p>
                                    </div>
                                </div>
                                <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-3" style={{ boxShadow: '0 2px 8px 0 #0000000a' }}>
                                    <Wind className="w-7 h-7 text-emerald-400" />
                                    <div>
                                        <p className="text-xl font-bold text-foreground">12 km/h</p>
                                        <p className="text-xs text-muted-foreground">Wind Speed</p>
                                    </div>
                                </div>
                            </div>
                            {/* Main column - Hourly Forecast and Temp Trend stacked vertically */}
                            <div className="flex flex-col gap-4" style={{ maxWidth: '560px' }}>
                                {/* Hourly Weather Forecast */}
                                <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ boxShadow: '0 2px 8px 0 #0000000a', minHeight: '160px', maxHeight: '220px', minWidth: '160px' }}>
                                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Sun className="w-4 h-4 text-yellow-500" />
                                        Hourly Forecast (12 AM - 11 PM)
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <div className="flex gap-3 pb-2 min-w-max">
                                            {hourlyForecast.map((hour, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex flex-col items-center gap-2 bg-accent rounded-md p-3 min-w-[70px] hover:bg-accent/80 transition-colors"
                                                >
                                                    <p className="text-xs text-muted-foreground">{hour.time}</p>
                                                    {hour.icon}
                                                    <p className="text-base font-semibold text-foreground">{hour.temp}°</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Weather Graph Placeholder */}
                                <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ boxShadow: '0 2px 8px 0 #0000000a', minHeight: '255px', maxHeight: '420px', minWidth: '160px' }}>
                                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-cyan-400" />
                                        Temperature Trend (7 Days)
                                    </h3>
                                    <div className="h-32 flex items-center justify-center text-muted-foreground text-xs flex-1">
                                        Graph visualization will be implemented here
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Right: 3 equal cards - 7-Day, Rescue, AI, in a row */}
                        <div className="flex flex-row gap-3 h-auto" style={{ minWidth: '0', flex: '1 1 0%' }}>
                            {/* 7-Day Weather Forecast - now a card beside the others */}
                            <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ minHeight: '400px', maxHeight: '457px', maxWidth: '380px', boxShadow: '0 2px 8px 0 #0000000a', minWidth: '0', width: '100%' }}>
                                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <Cloud className="w-4 h-4 text-muted-foreground" />
                                    7-Day Forecast
                                </h3>
                                <div className="space-y-2 flex-1 overflow-y-auto">
                                    {weeklyForecast.map((day, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between bg-accent rounded-md p-3 hover:bg-accent/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                {day.icon}
                                                <span className="text-sm text-foreground font-medium min-w-[90px]">{day.day}</span>
                                                <span className="text-xs text-muted-foreground">{day.condition}</span>
                                            </div>
                                            <div className="flex gap-3 text-xs">
                                                <span className="text-foreground font-semibold">↑ {day.high}°</span>
                                                <span className="text-muted-foreground">↓ {day.low}°</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Rescue Records - shadcn card bg */}
                            <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ minHeight: '400px', maxHeight: '480px', maxWidth: '340px', boxShadow: '0 2px 8px 0 #0000000a', minWidth: '0', width: '100%' }}>
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileText className="w-4 h-4" style={{ color: '#810009' }} />
                                        <p className="text-xs uppercase tracking-wide" style={{ color: '#EBFAFA' }}>Rescue Records</p>
                                    </div>
                                    <div className="rounded-lg p-3 mb-3" style={{ background: '#291618', border: '1px solid #e05a5a33' }}>
                                        <p className="text-xs" style={{ color: '#e05a5a' }}>Past 7 Days</p>
                                        <p className="text-2xl font-bold" style={{ color: '#fff' }}>12 <span className="text-sm font-normal" style={{ color: '#fff', fontWeight: 300 }}>Rescues</span></p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <TrendingUp className="w-3 h-3" style={{ color: '#e05a5a' }} />
                                            <span className="text-xs" style={{ color: '#a1a1aa' }}>+23% activity</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {recentLogs.map((log) => (
                                            <div key={log.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs" style={{ background: '#1f1f1f' }}>
                                                <div className="flex items-center gap-2">
                                                    {log.status === "resolved" ? (
                                                        <CheckCircle className="w-3 h-3" style={{ color: '#34CA63' }} />
                                                    ) : (
                                                        <AlertTriangle className="w-3 h-3" style={{ color: '#D6B441' }} />
                                                    )}
                                                    <span style={{ color: log.status === "resolved" ? '#fff' : '#fff', fontWeight: 300 }}>{log.type}</span>
                                                </div>
                                                <span style={{ color: '#a1a1aa' }}>{log.timestamp}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* AI Predictions - shadcn card bg */}
                            <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ minHeight: '400px', maxHeight: '480px', maxWidth: '340px', boxShadow: '0 2px 8px 0 #0000000a', minWidth: '0', width: '100%' }}>
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Brain className="w-4 h-4" style={{ color: '#38bdf8' }} />
                                        <p className="text-xs uppercase tracking-wide" style={{ color: '#EBFAFA' }}>AI Predictions</p>
                                    </div>
                                    {isAnalyzing ? (
                                        <div className="rounded-lg p-3" style={{ background: '#1e293b', border: '1px solid #38bdf833' }}>
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#38bdf8' }} />
                                                <div>
                                                    <p className="text-sm font-medium" style={{ color: '#fff' }}>Analyzing...</p>
                                                    <p className="text-xs" style={{ color: '#a1a1aa' }}>Processing patterns</p>
                                                </div>
                                            </div>
                                            <div className="w-full rounded h-1 mt-2 overflow-hidden" style={{ background: '#38bdf822' }}>
                                                <div className="h-1 rounded" style={{ background: '#38bdf8', width: '65%' }}></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="rounded-lg p-2.5 mb-3" style={{ background: '#18282C', border: '1px solid #38bdf833' }}>
                                                <div className="flex items-start gap-2">
                                                    <Zap className="w-3.5 h-3.5 mt-0.5" style={{ color: '#38bdf8' }} />
                                                    <p className="text-xs leading-relaxed" style={{ color: '#e0f2fe' }}>
                                                        78% likelihood of increased rescue activity in next 48h. Pre-position resources in sectors 4 & 7.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {predictions.map((pred, i) => (
                                                    <div key={i} className="rounded-lg p-2.5 border" style={{ background: '#1f1f1f', borderColor: '#232323' }}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-1.5">
                                                                {pred.impact === "high" ? (
                                                                    <AlertCircle className="w-3 h-3" style={{ color: '#b91c1c' }} />
                                                                ) : (
                                                                    <Shield className="w-3 h-3" style={{ color: '#facc15' }} />
                                                                )}
                                                                <span className="text-xs font-medium" style={{ color: pred.impact === "high" ? '#fff' : '#fff' }}>{pred.title}</span>
                                                            </div>
                                                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600, background: pred.impact === "high" ? '#281618' : '#facc1522', color: pred.impact === "high" ? '#DC5759' : '#D6B441' }}>
                                                                {pred.impact.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] mb-1.5" style={{ color: '#a1a1aa' }}>{pred.description}</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-1 rounded overflow-hidden" style={{ background: pred.impact === "high" ? '#171717' : '#171717' }}>
                                                                <div style={{ background: pred.impact === "high" ? '#A3000E' : '#D8B52E', width: `${pred.confidence}%`, height: '100%', borderRadius: '4px' }}></div>
                                                            </div>
                                                            <span className="text-[10px]" style={{ color: '#a1a1aa' }}>{pred.confidence}%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
