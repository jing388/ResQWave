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
    Phone,
} from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";
import { apiFetch } from "@/lib/api";

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

interface WeatherIcon {
    icon: string;
}

interface HourlyForecast {
    time: string;
    temperature: number;
    icon: string;
    description: string;
}

interface WeeklyForecast {
    day: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
}

interface CurrentWeather {
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    description: string;
}

interface WeatherData {
    current: CurrentWeather;
    hourly: HourlyForecast[];
    weekly: WeeklyForecast[];
}

interface TerminalInsightsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    terminalID: string;
    terminalName: string;
}

// Helper function to get weather icon component based on OpenWeather icon code
const getWeatherIcon = (iconCode: string, size: string = "w-8 h-8"): ReactElement => {
    const iconMap: { [key: string]: ReactElement } = {
        '01d': <Sun className={`${size} text-yellow-400`} />,
        '01n': <Moon className={`${size} text-blue-300`} />,
        '02d': <Cloud className={`${size} text-gray-400`} />,
        '02n': <Cloud className={`${size} text-gray-400`} />,
        '03d': <Cloud className={`${size} text-gray-400`} />,
        '03n': <Cloud className={`${size} text-gray-400`} />,
        '04d': <Cloud className={`${size} text-gray-500`} />,
        '04n': <Cloud className={`${size} text-gray-500`} />,
        '09d': <CloudDrizzle className={`${size} text-blue-400`} />,
        '09n': <CloudDrizzle className={`${size} text-blue-400`} />,
        '10d': <CloudRain className={`${size} text-blue-500`} />,
        '10n': <CloudRain className={`${size} text-blue-500`} />,
        '11d': <Zap className={`${size} text-yellow-500`} />,
        '11n': <Zap className={`${size} text-yellow-500`} />,
        '13d': <CloudSnow className={`${size} text-blue-200`} />,
        '13n': <CloudSnow className={`${size} text-blue-200`} />,
        '50d': <Cloud className={`${size} text-gray-400`} />,
        '50n': <Cloud className={`${size} text-gray-400`} />,
    };

    return iconMap[iconCode] || <Cloud className={`${size} text-gray-400`} />;
};

export function TerminalInsightsPanel({
    isOpen,
    onClose,
    terminalID,
    terminalName,
}: TerminalInsightsPanelProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    console.log('🎯 TerminalInsightsPanel rendered - isOpen:', isOpen, 'terminalID:', terminalID);

    // Fetch weather data when panel opens
    useEffect(() => {
        if (isOpen) {
            console.log('🌤️ Panel opened, fetching weather data...');
            fetchWeatherData();
        }
    }, [isOpen]);

    const fetchWeatherData = async () => {
        console.log('🌐 Starting weather API call...');
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiFetch<{ status: string; data: WeatherData }>('/api/weather/complete');
            console.log('✅ Weather data received:', response);
            if (response.status === 'success') {
                setWeatherData(response.data);
            }
        } catch (err) {
            console.error('❌ Error fetching weather data:', err);
            setError('Failed to load weather data');
        } finally {
            setIsLoading(false);
        }
    };

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
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>{error}</p>
                        </div>
                    ) : weatherData ? (
                        <div className="flex flex-row gap-4">
                            {/* Left: Stats, Hourly, Temp Trend stacked */}
                            <div className="flex flex-row gap-4">
                                {/* Stats column - narrow, stacked vertically */}
                                <div className="flex flex-col gap-3" style={{ minWidth: '140px', maxWidth: '160px', flex: '0 0 150px' }}>
                                    {/* Current Weather Card */}
                                    <div className="bg-card rounded-xl py-4 flex items-center gap-2" style={{ boxShadow: '0 2px 8px 0 #0000000a' }}>
                                        <Thermometer className="w-12 h-12 text-yellow-500 flex-shrink-0" />
                                        <div className="flex flex-col">
                                            <p className="text-5xl font-bold text-foreground leading-none">{weatherData.current.temperature}°</p>
                                            <p className="text-xs text-muted-foreground mt-1">Current</p>
                                            <p className="text-[10px] text-muted-foreground capitalize">{weatherData.current.description}</p>
                                        </div>
                                    </div>

                                    {/* Humidity */}
                                    <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-3" style={{ boxShadow: '0 2px 8px 0 #0000000a' }}>
                                        <Droplets className="w-7 h-7 text-blue-400" />
                                        <div>
                                            <p className="text-xl font-bold text-foreground">{weatherData.current.humidity}%</p>
                                            <p className="text-xs text-muted-foreground">Humidity</p>
                                        </div>
                                    </div>

                                    {/* Pressure */}
                                    <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-3" style={{ boxShadow: '0 2px 8px 0 #0000000a' }}>
                                        <Gauge className="w-7 h-7 text-purple-400" />
                                        <div>
                                            <p className="text-xl font-bold text-foreground">{(weatherData.current.pressure / 1000).toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">Pressure</p>
                                        </div>
                                    </div>

                                    {/* Wind Speed */}
                                    <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-3" style={{ boxShadow: '0 2px 8px 0 #0000000a' }}>
                                        <Wind className="w-7 h-7 text-emerald-400" />
                                        <div>
                                            <p className="text-xl font-bold text-foreground">{weatherData.current.windSpeed} km/h</p>
                                            <p className="text-xs text-muted-foreground">Wind Speed</p>
                                        </div>
                                    </div>

                                    {/* Emergency Call Button */}
                                    <button
                                        onClick={() => {
                                            // TODO: Implement emergency call functionality
                                            console.log('Emergency call initiated');
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white rounded-lg mt-3 py-3 px-3 flex items-center justify-center gap-2 transition-colors font-medium"
                                        style={{ boxShadow: '0 2px 8px 0 #0000000a' }}
                                    >
                                        <Phone className="w-4 h-4" />
                                        <span className="text-xs">Emergency Call</span>
                                    </button>
                                </div>
                                {/* Main column - Hourly Forecast and Temp Trend stacked vertically */}
                                <div className="flex flex-col gap-4" style={{ maxWidth: '560px' }}>
                                    {/* Hourly Weather Forecast */}
                                    <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ boxShadow: '0 2px 8px 0 #0000000a', minHeight: '160px', maxHeight: '220px', minWidth: '160px' }}>
                                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                            <Sun className="w-4 h-4 text-yellow-500" />
                                            Operational Forecast (48h)
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <div className="flex gap-3 pb-2 min-w-max">
                                                {weatherData.hourly.slice(0, 16).map((hour, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex flex-col items-center gap-2 bg-accent rounded-md p-3 min-w-[70px] hover:bg-accent/80 transition-colors"
                                                    >
                                                        <p className="text-xs text-muted-foreground">{hour.time}</p>
                                                        {getWeatherIcon(hour.icon)}
                                                        <p className="text-base font-semibold text-foreground">{hour.temperature}°</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Weather Graph Placeholder */}
                                    <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ boxShadow: '0 2px 8px 0 #0000000a', minHeight: '255px', maxHeight: '420px', minWidth: '160px' }}>
                                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-cyan-400" />
                                            Temperature Trend (Next Days)
                                        </h3>
                                        <div className="h-32 flex items-center justify-center text-muted-foreground text-xs flex-1">
                                            Graph visualization will be implemented here
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Right: 3 equal cards - 7-Day, Rescue, AI, in a row */}
                            <div className="flex flex-row gap-3 h-auto" style={{ minWidth: '0', flex: '1 1 0%' }}>
                                {/* 5-Day Weather Forecast - now a card beside the others */}
                                <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ minHeight: '400px', maxHeight: '457px', maxWidth: '380px', boxShadow: '0 2px 8px 0 #0000000a', minWidth: '0', width: '100%' }}>
                                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Cloud className="w-4 h-4 text-muted-foreground" />
                                        5-Day Forecast
                                    </h3>
                                    <div className="space-y-2.5 flex-1 overflow-y-auto">
                                        {weatherData.weekly.map((day, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-4 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors border border-border/40"
                                            >
                                                <div className="flex items-center gap-3.5 flex-1">
                                                    {getWeatherIcon(day.icon, "w-7 h-7")}
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{day.day}</p>
                                                        <p className="text-xs text-muted-foreground capitalize">{day.condition}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-semibold text-foreground">{day.high}°</span>
                                                    <span className="text-sm text-muted-foreground">{day.low}°</span>
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
                    ) : null}
                </div>
            </div>
        </>
    );
}
