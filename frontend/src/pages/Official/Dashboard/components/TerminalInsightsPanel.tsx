import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { getNeighborhoodByTerminalId } from "@/pages/Official/CommunityGroups/api/communityGroupApi";
import type { CommunityGroupDetails } from "@/pages/Official/CommunityGroups/types";
import { Gemini } from '@lobehub/icons';
import {
    AlertCircle,
    AlertTriangle,
    Bell,
    Brain,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Cloud,
    CloudDrizzle,
    CloudRain,
    CloudSnow,
    Droplets,
    FileText,
    Gauge,
    Loader2,
    MessageSquarePlus,
    Moon,
    Shield,
    ShieldOff,
    Sun,
    Thermometer,
    Wind,
    X,
    Zap
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getRescueRecordsByTerminal, type RescueRecord } from "../api/rescueRecordsApi";

// AI Prediction types
interface AIPredictionItem {
    title: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    confidence: number;
    timeframe?: string;
}

interface AIRecommendation {
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    rationale: string;
}

interface AIPrediction {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    summary: string;
    estimatedResponseTime: string; // e.g., "2-4 hours"
    timeWindow: string; // e.g., "Next 6-12 hours"
    predictions: AIPredictionItem[];
    recommendations: AIRecommendation[];
    resourceAllocation: {
        personnelNeeded: number;
        equipmentSuggestions: string[];
        evacuationReadiness: string;
    };
}

interface HourlyForecast {
    time: string;
    temperature: number;
    icon: string;
    description: string;
    precipitation?: number; // Probability of precipitation in %
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
    weatherCheckEnabled?: boolean;
    manualBlockEnabled?: boolean;
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

// Helper function to calculate time ago
const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
};

// Helper function to determine severity from alert type
const getSeverityFromAlertType = (alertType: string): 'critical' | 'high' | 'medium' | 'low' => {
    const type = alertType.toLowerCase();
    if (type.includes('critical') || type.includes('emergency')) return 'critical';
    if (type.includes('high') || type.includes('flood') || type.includes('fire')) return 'high';
    if (type.includes('medium') || type.includes('storm') || type.includes('warning')) return 'medium';
    return 'low';
};

// Helper function to calculate average response time
const calculateAverageResponseTime = (records: RescueRecord[]): string => {
    if (records.length === 0) return '0h 0m';

    const totalMinutes = records.reduce((sum, record) => {
        if (record.completionDate && record.dateTimeOccurred) {
            const start = new Date(record.dateTimeOccurred).getTime();
            const end = new Date(record.completionDate).getTime();
            const diffMinutes = Math.floor((end - start) / 60000);
            return sum + diffMinutes;
        }
        return sum;
    }, 0);

    const avgMinutes = Math.floor(totalMinutes / records.length);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;

    return `${hours}h ${minutes}m`;
};

// Helper function to calculate individual response time
const getResponseTime = (record: RescueRecord): string => {
    if (!record.completionDate || !record.dateTimeOccurred) return 'N/A';

    const start = new Date(record.dateTimeOccurred).getTime();
    const end = new Date(record.completionDate).getTime();
    const diffMinutes = Math.floor((end - start) / 60000);

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}h ${minutes}m`;
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
    const [noCoordinates, setNoCoordinates] = useState(false);
    const [rescueRecords, setRescueRecords] = useState<RescueRecord[]>([]);
    const [loadingRescues, setLoadingRescues] = useState(false);
    const [timePeriod, setTimePeriod] = useState<'7days' | '2weeks' | '1month' | '3months' | 'all'>('7days');
    const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
    const [rainfallPeriod, setRainfallPeriod] = useState<'24h' | '48h'>('24h');

    // AI Prediction state
    const [aiPrediction, setAiPrediction] = useState<AIPrediction | null>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [hasDataChanged, setHasDataChanged] = useState(false);
    const [communityData, setCommunityData] = useState<CommunityGroupDetails | null>(null);
    const [additionalContext, setAdditionalContext] = useState<string>('');
    const [showContextModal, setShowContextModal] = useState(false);
    const [weatherCheckEnabled, setWeatherCheckEnabled] = useState<boolean>(true);
    const [isTogglingWeatherCheck, setIsTogglingWeatherCheck] = useState(false);
    const [manualBlockEnabled, setManualBlockEnabled] = useState<boolean>(false);
    const [isTogglingManualBlock, setIsTogglingManualBlock] = useState(false);
    const [isAlertingFocalPerson, setIsAlertingFocalPerson] = useState(false);
    const [recentAlerts, setRecentAlerts] = useState<number[]>([]);
    const [confirmAlertOpen, setConfirmAlertOpen] = useState(false);
    const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const previousRescueRecordsRef = useRef<string>('');

    // Toggle weather check for IoT
    const handleToggleWeatherCheck = async () => {
        setIsTogglingWeatherCheck(true);
        try {
            const newState = !weatherCheckEnabled;
            const response = await apiFetch<{
                status: string;
                data: {
                    terminalID: string;
                    weatherCheckEnabled: boolean;
                    message: string;
                }
            }>('/api/weather/toggle-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    terminalID,
                    enabled: newState
                })
            });

            if (response.status === 'success') {
                setWeatherCheckEnabled(newState);
                console.log(`✅ Weather check ${newState ? 'enabled' : 'disabled'} for ${terminalID}`);
            }
        } catch (err) {
            console.error('❌ Error toggling weather check:', err);
        } finally {
            setIsTogglingWeatherCheck(false);
        }
    };

    // Toggle manual block for IoT
    const handleToggleManualBlock = async () => {
        setIsTogglingManualBlock(true);
        try {
            const newState = !manualBlockEnabled;
            const response = await apiFetch<{
                status: string;
                data: {
                    terminalID: string;
                    manualBlockEnabled: boolean;
                    message: string;
                }
            }>('/api/weather/toggle-manual-block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    terminalID,
                    blocked: newState
                })
            });

            if (response.status === 'success') {
                setManualBlockEnabled(newState);
                console.log(`🚫 Manual block ${newState ? 'enabled' : 'disabled'} for ${terminalID}`);
            }
        } catch (err) {
            console.error('❌ Error toggling manual block:', err);
        } finally {
            setIsTogglingManualBlock(false);
        }
    };

    // Alert Focal Person - Send SMS + Email
    const handleAlertFocalPerson = async () => {
        // Rate limiting: max 5 alerts within 10 minutes
        const now = Date.now();
        const tenMinutesAgo = now - 600000; // 10 minutes in ms
        const recentAlertsList = recentAlerts.filter(time => time > tenMinutesAgo);

        if (recentAlertsList.length >= 5) {
            // Find oldest alert in the window
            const oldestAlert = Math.min(...recentAlertsList);
            const waitTime = Math.ceil((oldestAlert + 600000 - now) / 60000);
            setSuccessMessage(`Rate limit reached. Please wait ${waitTime} minute(s) before sending another alert. (5 alerts per 10 minutes)`);
            setShowSuccessSnackbar(true);
            setTimeout(() => setShowSuccessSnackbar(false), 4000);
            return;
        }

        // Open confirmation modal instead of browser confirm
        setConfirmAlertOpen(true);
    };

    const sendFocalAlert = async () => {
        setConfirmAlertOpen(false);
        const now = Date.now();

        setIsAlertingFocalPerson(true);
        try {
            // Build alert reason from weather data
            let alertReason = 'Emergency alert - Please monitor conditions';
            let weatherConditions = 'Check current conditions';

            if (weatherData) {
                const { current } = weatherData;
                // Capitalize each word in description
                const capitalizedDescription = current.description
                    .split(' ')
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                weatherConditions = `${capitalizedDescription}\nTemp: ${current.temperature}°C\nWind: ${current.windSpeed} km/h\nHumidity: ${current.humidity}%`;

                // Determine alert reason based on conditions
                if (current.windSpeed >= 25 || current.description.toLowerCase().includes('rain')) {
                    alertReason = 'High flood risk detected - Weather conditions are unfavorable';
                } else {
                    alertReason = 'Potential flood risk - Please stay alert';
                }
            }

            const response = await apiFetch<{
                status: string;
                message: string;
                data: {
                    focalPerson: {
                        name: string;
                        phone: string | null;
                        email: string | null;
                    };
                    sent: {
                        sms: boolean;
                        email: boolean;
                    };
                    timestamp: string;
                }
            }>('/api/focal-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    terminalID,
                    alertReason,
                    weatherConditions,
                    dispatcherName: undefined // You can pass dispatcher name if available
                })
            });

            if (response.status === 'success') {
                const { focalPerson, sent } = response.data;
                const sentMethods = [];
                if (sent.sms) sentMethods.push('SMS');
                if (sent.email) sentMethods.push('Email');

                setSuccessMessage(`Alert sent successfully via ${sentMethods.join(' + ')}`);
                setShowSuccessSnackbar(true);
                setTimeout(() => setShowSuccessSnackbar(false), 4000);

                // Add timestamp to recent alerts array
                setRecentAlerts(prev => [...prev, now]);
                console.log(`📢 Focal person alerted: ${focalPerson.name} via ${sentMethods.join(', ')}`);
            }
        } catch (err: any) {
            console.error('❌ Error alerting focal person:', err);
            setSuccessMessage(`Failed to send alert: ${err.message || 'Unknown error'}`);
            setShowSuccessSnackbar(true);
            setTimeout(() => setShowSuccessSnackbar(false), 4000);
        } finally {
            setIsAlertingFocalPerson(false);
        }
    };

    // Define fetch functions before they're used in useEffects
    const fetchRescueRecords = useCallback(async () => {
        setLoadingRescues(true);
        try {
            const records = await getRescueRecordsByTerminal(terminalID);
            setRescueRecords(records);

            // Detect data changes for orange blinking dot
            const newDataHash = JSON.stringify(records.map(r => r.emergencyId));
            if (previousRescueRecordsRef.current && previousRescueRecordsRef.current !== newDataHash) {
                setHasDataChanged(true);
            }
            previousRescueRecordsRef.current = newDataHash;
        } catch (err) {
            console.error('❌ Error fetching rescue records:', err);
        } finally {
            setLoadingRescues(false);
        }
    }, [terminalID]);

    const fetchCommunityData = useCallback(async () => {
        try {
            const data = await getNeighborhoodByTerminalId(terminalID);
            setCommunityData(data);
        } catch (err) {
            console.error('❌ Error fetching community data:', err);
        }
    }, [terminalID]);

    const fetchWeatherData = useCallback(async () => {
        const startTime = Date.now();
        setIsLoading(true);
        setError(null);
        setNoCoordinates(false);
        try {
            // Get coordinates from community data if available
            let queryParams = '';
            let foundCoordinates = false;
            let lat, lon;

            // First, try to get from communityData.coordinates (direct field)
            if (communityData?.coordinates && typeof communityData.coordinates === 'string') {
                const coords = communityData.coordinates.split(',').map((s: string) => parseFloat(s.trim()));
                if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                    lon = coords[0]; // Format: "lng, lat"
                    lat = coords[1];
                    foundCoordinates = true;
                }
            }

            // Fallback: Try focalPerson.houseAddress (JSON string with coordinates)
            if (!foundCoordinates && communityData?.focalPerson?.houseAddress) {
                try {
                    const parsed = JSON.parse(communityData.focalPerson.houseAddress);
                    if (parsed?.coordinates && typeof parsed.coordinates === 'string') {
                        const coords = parsed.coordinates.split(',').map((s: string) => parseFloat(s.trim()));
                        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                            lon = coords[0];
                            lat = coords[1];
                            foundCoordinates = true;
                        }
                    }
                } catch {
                    console.log('Could not parse houseAddress JSON');
                }
            }

            if (foundCoordinates && lat && lon) {
                queryParams = `?terminalID=${terminalID}&lat=${lat}&lon=${lon}`;

                // Fetch weather from backend (which also has caching)
                const response = await apiFetch<{
                    status: string;
                    data: WeatherData;
                    meta?: {
                        cached: boolean;
                        fetchedAt: string;
                        expiresAt: string;
                    }
                }>(`/api/weather/complete${queryParams}`);

                console.log(`📦 ${response.meta?.cached ? 'BACKEND CACHE' : 'FRESH API'} - ${terminalID}`);

                if (response.status === 'success') {
                    setWeatherData(response.data);
                    // Set weather check enabled state from backend
                    setWeatherCheckEnabled(response.data.weatherCheckEnabled ?? true);
                    setManualBlockEnabled(response.data.manualBlockEnabled ?? false);
                }
            } else {
                setNoCoordinates(true);
                setWeatherData(null); // Clear any previous weather data
            }

            // Ensure minimum loading time of 1.5 seconds for better UX
            const elapsedTime = Date.now() - startTime;
            const remainingTime = 1500 - elapsedTime;
            if (remainingTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            }
        } catch (err) {
            console.error('❌ Error fetching weather data:', err);
            setError('Failed to load weather data');

            // Ensure minimum loading time even on error
            const elapsedTime = Date.now() - startTime;
            const remainingTime = 1500 - elapsedTime;
            if (remainingTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            }
        } finally {
            setIsLoading(false);
        }
    }, [communityData, terminalID]);

    // Fetch rescue records when panel opens
    useEffect(() => {
        if (isOpen && terminalID) {
            fetchRescueRecords();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, terminalID]); // Intentionally exclude fetchRescueRecords to prevent double calls

    // Fetch community data and weather when panel opens
    useEffect(() => {
        if (isOpen && terminalID && !communityData) {
            fetchCommunityData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, terminalID]);

    // Fetch weather when community data becomes available
    useEffect(() => {
        if (communityData && isOpen) {
            fetchWeatherData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [communityData, isOpen]);

    const getDaysFromPeriod = (period: typeof timePeriod): number | null => {
        switch (period) {
            case '7days': return 7;
            case '2weeks': return 14;
            case '1month': return 30;
            case '3months': return 90;
            case 'all': return null;
        }
    };

    const getPeriodLabel = (period: typeof timePeriod): string => {
        switch (period) {
            case '7days': return 'Past 7 Days';
            case '2weeks': return 'Past 2 Weeks';
            case '1month': return 'Past Month';
            case '3months': return 'Past 3 Months';
            case 'all': return 'All Time';
        }
    };

    // IoT SOS Button Test - Simulates hardware button press
    /* const testIoTButton = async () => {
        if (iotButtonBlinking) return; // Prevent multiple clicks while blinking

        console.log('🔴 IoT SOS Button Test - Checking weather risk...');
        setIotTestResult(null);

        try {
            // Call the IoT weather check API
            const response = await apiFetch<{
                status: string;
                allowAlert: boolean;
                riskLevel: string;
                reasons: string[];
                weatherSummary: {
                    currentCondition: string;
                    rainProbability: number;
                    windSpeed: number;
                    isNightTime: boolean;
                    recentAlerts: number;
                };
            }>(`/api/weather/iot/check?terminalID=${terminalID}`);

            if (response.status === 'success') {
                const { allowAlert, riskLevel, reasons } = response;

                console.log(`📊 Risk Level: ${riskLevel}`);
                console.log(`✅ Allow Alert: ${allowAlert}`);
                console.log(`📝 Reasons:`, reasons);

                // Set result message
                const resultMsg = `${riskLevel} - ${reasons.join(', ')}`;
                setIotTestResult(resultMsg);

                // Start blinking animation
                setIotButtonBlinking(true);

                if (allowAlert) {
                    // RISKY weather - blink red-orange alternating (5 times each color)
                    console.log('🟠 RISKY: Blinking red-orange (alert would be sent)');
                    let count = 0;
                    const blinkInterval = setInterval(() => {
                        setIotBlinkColor(prev => prev === 'red' ? 'orange' : 'red');
                        count++;
                        if (count >= 10) { // 10 blinks = 5 red + 5 orange alternating
                            clearInterval(blinkInterval);
                            setIotButtonBlinking(false);
                            setIotBlinkColor('red');
                        }
                    }, 400); // 400ms per blink (slower for visibility)
                } else {
                    // NORMAL weather - blink red only (5 times)
                    console.log('🔴 NORMAL: Blinking red (alert blocked)');
                    let count = 0;
                    let isVisible = true;
                    const blinkInterval = setInterval(() => {
                        isVisible = !isVisible;
                        if (!isVisible) {
                            // Make button invisible (simulate off state)
                            setIotBlinkColor('red');
                        }
                        count++;
                        if (count >= 10) { // 5 complete on-off cycles
                            clearInterval(blinkInterval);
                            setIotButtonBlinking(false);
                        }
                    }, 300);
                }
            }
        } catch (err) {
            console.error('❌ IoT button test error:', err);
            setIotTestResult('Error checking weather risk');

            // Blink red 3 times for error
            setIotButtonBlinking(true);
            let count = 0;
            const interval = setInterval(() => {
                count++;
                if (count >= 3) {
                    clearInterval(interval);
                    setIotButtonBlinking(false);
                }
            }, 200);
        }
    }; */

    // Generate AI Prediction
    const generateAIPrediction = async () => {
        if (!weatherData || !rescueRecords || !communityData) {
            setAiError('Missing required data for prediction');
            return;
        }

        setIsGeneratingAI(true);
        setAiError(null);
        setHasDataChanged(false); // Reset orange dot

        try {
            const response = await apiFetch<{ prediction: AIPrediction }>('/ai/prediction/generate', {
                method: 'POST',
                body: JSON.stringify({
                    weatherData: weatherData,
                    rescueRecords: getFilteredRecords(),
                    communityData: communityData,
                    additionalContext: additionalContext.trim() || undefined,
                }),
            });

            setAiPrediction(response.prediction);
        } catch (err: unknown) {
            console.error('❌ AI Prediction error:', err);

            // User-friendly error messages
            let errorMessage = 'Failed to generate prediction';

            if (err instanceof Error && (err.message.includes('overloaded') || err.message.includes('503'))) {
                errorMessage = 'AI service is busy. Please wait 1-2 minutes and try again.';
            } else if (err instanceof Error && (err.message.includes('429') || err.message.includes('wait'))) {
                errorMessage = 'Please wait a few seconds before generating another prediction.';
            } else if (err instanceof Error && err.message) {
                errorMessage = err.message;
            }

            setAiError(errorMessage);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // Handle slide animation and clear data when panel closes or terminal changes
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
            // Don't clear communityData - it's needed for cache check on reopen
            // Only clear visual data
            setWeatherData(null);
            setAiPrediction(null);
        }
    }, [isOpen]);

    // Clear all data when terminal changes (new terminal = fresh data needed)
    useEffect(() => {
        setWeatherData(null);
        setCommunityData(null); // Clear on terminal change
        setAiPrediction(null);
        setError(null);
        setNoCoordinates(false);
        setIsLoading(true); // Show loading animation immediately
    }, [terminalID]);

    // Filter rescue records by time period
    const getFilteredRecords = (): RescueRecord[] => {
        const days = getDaysFromPeriod(timePeriod);
        if (days === null) return rescueRecords; // all time

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return rescueRecords.filter(record => {
            const recordDate = new Date(record.dateTimeOccurred);
            return recordDate >= cutoffDate;
        });
    };

    // Handle time period change - trigger orange blinking dot
    const handleTimePeriodChange = (newPeriod: typeof timePeriod) => {
        setTimePeriod(newPeriod);
        setHasDataChanged(true); // Show orange dot when filter changes
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop - hidden when modal is open to prevent double darkening */}
            {!confirmAlertOpen && (
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
            )}

            {/* Bottom Panel - Full map width with shadcn dark theme */}
            <div
                className="fixed bottom-0 bg-[#171717] border-t border-border z-50 transition-transform duration-300 ease-out"
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
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Thermometer className="w-5 h-5 text-muted-foreground" />
                                Predictive AI Rescue Command System - {terminalName}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Terminal ID: {terminalID}
                            </p>
                        </div>

                        {/* IoT SOS Button Test - HIDDEN FOR NOW (uncomment to enable) */}
                        {/* <div className="flex items-center gap-2 ml-8">
                            <button
                                onClick={testIoTButton}
                                disabled={iotButtonBlinking}
                                className="relative group"
                                title="Test IoT SOS Button (simulates hardware button press)"
                            >
                                <div 
                                    className={`
                                        w-12 h-12 rounded-full flex items-center justify-center
                                        transition-all duration-200 cursor-pointer
                                        ${iotButtonBlinking 
                                            ? iotBlinkColor === 'red' 
                                                ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' 
                                                : 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)]'
                                            : 'bg-red-600 hover:bg-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                                        }
                                        ${iotButtonBlinking ? 'animate-pulse' : ''}
                                    `}
                                >
                                    <AlertCircle className="w-6 h-6 text-white" />
                                </div>
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                    Test IoT
                                </span>
                            </button>
                            {iotTestResult && (
                                <div className="text-xs text-muted-foreground max-w-xs">
                                    {iotTestResult}
                                </div>
                            )}
                        </div> */}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Weather Check Toggle Button */}
                        <button
                            onClick={handleToggleWeatherCheck}
                            disabled={isTogglingWeatherCheck}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-card border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ boxShadow: '0 2px 8px 0 #0000000a' }}
                            title={weatherCheckEnabled
                                ? 'Weather check ON: IoT sends alerts only during risky weather'
                                : 'Weather check OFF: IoT always sends alerts regardless of weather'
                            }
                        >
                            {isTogglingWeatherCheck ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                            ) : weatherCheckEnabled ? (
                                <Shield className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                            )}
                            <span className={weatherCheckEnabled ? 'text-green-400' : 'text-orange-400'}>
                                Weather-Based Alert: {weatherCheckEnabled ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        {/* Manual Block Toggle Button */}
                        <button
                            onClick={handleToggleManualBlock}
                            disabled={isTogglingManualBlock}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-card border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ boxShadow: '0 2px 8px 0 #0000000a' }}
                            title={manualBlockEnabled
                                ? 'Manual Block ON: All IoT alerts are blocked regardless of weather'
                                : 'Manual Block OFF: IoT operates normally based on weather conditions'
                            }
                        >
                            {isTogglingManualBlock ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                            ) : manualBlockEnabled ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                                <ShieldOff className="w-3.5 h-3.5 text-red-400" />
                            )}
                            <span className={manualBlockEnabled ? 'text-green-400' : 'text-red-400'}>
                                Manual Block: {manualBlockEnabled ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-accent"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="overflow-y-auto h-[calc(60vh-64px)] p-4 bg-[#171717]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-6">
                            <div className="relative">
                                {/* Outer rotating ring */}
                                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-spin" style={{ width: '120px', height: '120px', animationDuration: '3s' }}></div>

                                {/* Middle pulsing ring */}
                                <div className="absolute inset-0 rounded-full border-4 border-cyan-400/30 animate-pulse" style={{ width: '120px', height: '120px', animationDuration: '2s' }}></div>

                                {/* Gemini icon flipping */}
                                <div className="relative flex items-center justify-center" style={{ width: '120px', height: '120px' }}>
                                    <div
                                        className="gemini-flip-animation"
                                        style={{
                                            transformStyle: 'preserve-3d',
                                        }}
                                    >
                                        <Gemini.Color size={64} />
                                    </div>
                                </div>
                            </div>

                            {/* 3D flip animation */}
                            <style>{`
                                .gemini-flip-animation {
                                    animation: flip3d 2s ease-in-out infinite;
                                }
                                
                                @keyframes flip3d {
                                    0% {
                                        transform: rotateY(0deg);
                                    }
                                    100% {
                                        transform: rotateY(360deg);
                                    }
                                }
                            `}</style>

                            <div className="text-center space-y-2">
                                <p className="text-lg font-semibold text-white flex items-center gap-2 justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing Weather Patterns
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Fetching forecast data and rescue analytics...
                                </p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>{error}</p>
                        </div>
                    ) : noCoordinates ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-6 max-w-md">
                                <div className="flex items-start gap-4">
                                    <AlertTriangle className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-lg font-semibold text-yellow-500 mb-2">No Location Coordinates</p>
                                        <p className="text-sm text-yellow-200/70">
                                            This terminal does not have GPS coordinates configured.
                                            Weather data cannot be displayed without location information.
                                        </p>
                                        <p className="text-sm text-yellow-200/70 mt-3">
                                            Please update the terminal's address with valid coordinates to enable weather forecasting.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : weatherData ? (
                        <>
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

                                        {/* Alert Focal Person Button */}
                                        <button
                                            onClick={handleAlertFocalPerson}
                                            disabled={isAlertingFocalPerson}
                                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg mt-3 py-3 px-3 flex items-center justify-center gap-2 transition-colors font-medium disabled:cursor-not-allowed"
                                            style={{ boxShadow: '0 2px 8px 0 #0000000a' }}
                                            title="Send emergency alert to focal person via SMS and Email"
                                        >
                                            {isAlertingFocalPerson ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span className="text-sm">Sending...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Bell className="w-4 h-4" />
                                                    <span className="text-sm">Focal Alert</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {/* Main column - Hourly Forecast and Temp Trend stacked vertically */}
                                    <div className="flex flex-col gap-4" style={{ maxWidth: '480px' }}>
                                        {/* Hourly Weather Forecast */}
                                        <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ boxShadow: '0 2px 8px 0 #0000000a', minHeight: '160px', maxHeight: '220px', minWidth: '160px' }}>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <Sun className="w-4 h-4 text-yellow-500" />
                                                    Operational Forecast (48h)
                                                </h3>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            const container = document.getElementById('hourly-forecast-scroll');
                                                            if (container) {
                                                                container.scrollBy({ left: -200, behavior: 'smooth' });
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-md hover:bg-accent transition-colors"
                                                        title="Scroll left"
                                                    >
                                                        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const container = document.getElementById('hourly-forecast-scroll');
                                                            if (container) {
                                                                container.scrollBy({ left: 200, behavior: 'smooth' });
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-md hover:bg-accent transition-colors"
                                                        title="Scroll right"
                                                    >
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div
                                                id="hourly-forecast-scroll"
                                                className="overflow-x-auto scrollbar-hide"
                                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'smooth' }}
                                                onWheel={(e) => {
                                                    e.preventDefault();
                                                    const container = e.currentTarget;
                                                    container.scrollBy({ left: e.deltaY, behavior: 'auto' });
                                                }}
                                            >
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
                                        {/* Rainfall Forecast Chart */}
                                        <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ boxShadow: '0 2px 8px 0 #0000000a', minHeight: '249px', maxHeight: '420px', minWidth: '160px' }}>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <CloudRain className="w-4 h-4 text-cyan-400" />
                                                    Rainfall Forecast
                                                </h3>
                                                <div className="flex gap-1.5 bg-accent/50 rounded-lg p-1">
                                                    <button
                                                        onClick={() => setRainfallPeriod('24h')}
                                                        className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${rainfallPeriod === '24h'
                                                            ? 'bg-[#38bdf8] text-white shadow-sm'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                            }`}
                                                    >
                                                        24h
                                                    </button>
                                                    <button
                                                        onClick={() => setRainfallPeriod('48h')}
                                                        className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${rainfallPeriod === '48h'
                                                            ? 'bg-[#38bdf8] text-white shadow-sm'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                            }`}
                                                    >
                                                        48h
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart
                                                        data={weatherData.hourly
                                                            .slice(0, rainfallPeriod === '24h' ? 8 : 16)
                                                            .map(hour => {
                                                                const rainfall = hour.precipitation || 0;
                                                                return {
                                                                    time: hour.time,
                                                                    rainfall: rainfall,
                                                                    color: rainfall >= 67 ? '#ef4444' : rainfall >= 34 ? '#eab308' : '#22c55e'
                                                                };
                                                            })}
                                                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                                                    >
                                                        <defs>
                                                            <linearGradient id="rainfallGradient" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                                                                <stop offset="33%" stopColor="#eab308" stopOpacity={0.6} />
                                                                <stop offset="66%" stopColor="#22c55e" stopOpacity={0.4} />
                                                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1} />
                                                            </linearGradient>
                                                            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                                                <stop offset="33%" stopColor="#ef4444" stopOpacity={1} />
                                                                <stop offset="33%" stopColor="#eab308" stopOpacity={1} />
                                                                <stop offset="66%" stopColor="#eab308" stopOpacity={1} />
                                                                <stop offset="66%" stopColor="#22c55e" stopOpacity={1} />
                                                                <stop offset="100%" stopColor="#22c55e" stopOpacity={1} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                                        <XAxis
                                                            dataKey="time"
                                                            stroke="#888888"
                                                            fontSize={11}
                                                            tickLine={false}
                                                            interval={rainfallPeriod === '24h' ? 1 : 3}
                                                        />
                                                        <YAxis
                                                            stroke="#888888"
                                                            fontSize={11}
                                                            tickLine={false}
                                                            domain={[-2, 100]}
                                                            ticks={[0, 33, 66, 100]}
                                                            tickFormatter={(value) => `${value}%`}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: '#1a1a1a',
                                                                border: '1px solid #2a2a2a',
                                                                borderRadius: '8px',
                                                                fontSize: '12px',
                                                                color: '#ffffff',
                                                                padding: '8px 12px'
                                                            }}
                                                            labelStyle={{ color: '#888888', marginBottom: '6px', fontWeight: 600 }}
                                                            formatter={(value: number) => {
                                                                const level = value >= 67 ? 'High' : value >= 34 ? 'Moderate' : 'Low';
                                                                const color = value >= 67 ? '#ef4444' : value >= 34 ? '#eab308' : '#22c55e';
                                                                return [
                                                                    <span style={{ color, fontWeight: 600 }}>{value.toFixed(0)}% - {level}</span>,
                                                                    'Rainfall Probability'
                                                                ];
                                                            }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="rainfall"
                                                            stroke="url(#lineGradient)"
                                                            strokeWidth={2.5}
                                                            fill="url(#rainfallGradient)"
                                                            dot={(props: { cx: number; cy: number; payload: { rainfall?: number } }) => {
                                                                const { cx, cy, payload } = props;
                                                                const rainfall = payload.rainfall || 0;
                                                                const color = rainfall >= 67 ? '#ef4444' : rainfall >= 34 ? '#eab308' : '#22c55e';
                                                                return (
                                                                    <circle
                                                                        cx={cx}
                                                                        cy={cy}
                                                                        r={4}
                                                                        fill={color}
                                                                        stroke="#1a1a1a"
                                                                        strokeWidth={2}
                                                                    />
                                                                );
                                                            }}
                                                            activeDot={(props: { cx: number; cy: number; payload: { rainfall?: number } }) => {
                                                                const { cx, cy, payload } = props;
                                                                const rainfall = payload.rainfall || 0;
                                                                const color = rainfall >= 67 ? '#ef4444' : rainfall >= 34 ? '#eab308' : '#22c55e';
                                                                return (
                                                                    <circle
                                                                        cx={cx}
                                                                        cy={cy}
                                                                        r={6}
                                                                        fill={color}
                                                                        stroke="#1a1a1a"
                                                                        strokeWidth={2}
                                                                    />
                                                                );
                                                            }}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex items-center justify-center gap-3 pt-0.5 mt-0.5">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                                                    <span className="text-[10px] text-muted-foreground">Low (0-33%)</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#eab308' }}></div>
                                                    <span className="text-[10px] text-muted-foreground">Moderate (34-66%)</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                                                    <span className="text-[10px] text-muted-foreground">High (67-100%)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Right: 3 equal cards - 7-Day, Rescue, AI, in a row */}
                                <div className="flex flex-row gap-4 h-auto" style={{ minWidth: '0', flex: '1 1 0%' }}>
                                    {/* 5-Day Weather Forecast - now a card beside the others */}
                                    <div className="bg-card rounded-xl p-4 border border-border flex flex-col" style={{ minHeight: '460px', maxHeight: '460px', maxWidth: '300px', boxShadow: '0 2px 8px 0 #0000000a', minWidth: '0', width: '100%' }}>
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
                                    <div className="bg-card rounded-xl p-5 border border-border flex flex-col" style={{ height: '460px', maxWidth: '360px', boxShadow: '0 2px 8px 0 #0000000a', minWidth: '0', width: '100%' }}>
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4" style={{ color: '#810009' }} />
                                                    <p className="text-xs uppercase tracking-wide" style={{ color: '#EBFAFA' }}>Rescue Records</p>
                                                </div>
                                                <Select value={timePeriod} onValueChange={(value) => handleTimePeriodChange(value as typeof timePeriod)}>
                                                    <SelectTrigger className="w-[120px] h-8 text-xs text-white bg-[#1a1a1a] border-[#2a2a2a] hover:bg-[#222222] hover:border-[#3a3a3a]">
                                                        <SelectValue placeholder="Select period" />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[99999] bg-[#1a1a1a] border-[#2a2a2a]">
                                                        <SelectItem value="7days" className="text-xs text-white cursor-pointer focus:bg-[#2a2a2a] focus:text-white hover:bg-[#252525] hover:text-white data-[state=checked]:text-white">Past 7 Days</SelectItem>
                                                        <SelectItem value="2weeks" className="text-xs text-white cursor-pointer focus:bg-[#2a2a2a] focus:text-white hover:bg-[#252525] hover:text-white data-[state=checked]:text-white">Past 2 Weeks</SelectItem>
                                                        <SelectItem value="1month" className="text-xs text-white cursor-pointer focus:bg-[#2a2a2a] focus:text-white hover:bg-[#252525] hover:text-white data-[state=checked]:text-white">Past Month</SelectItem>
                                                        <SelectItem value="3months" className="text-xs text-white cursor-pointer focus:bg-[#2a2a2a] focus:text-white hover:bg-[#252525] hover:text-white data-[state=checked]:text-white">Past 3 Months</SelectItem>
                                                        <SelectItem value="all" className="text-xs text-white cursor-pointer focus:bg-[#2a2a2a] focus:text-white hover:bg-[#252525] hover:text-white data-[state=checked]:text-white">All Time</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {loadingRescues ? (
                                                <div className="flex items-center justify-center flex-1">
                                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="rounded-lg p-3 mb-3" style={{ background: '#291618', border: '1px solid #e05a5a33' }}>
                                                        <p className="text-xs" style={{ color: '#e05a5a' }}>{getPeriodLabel(timePeriod)} at this terminal</p>
                                                        <p className="text-2xl font-bold" style={{ color: '#fff' }}>
                                                            {getFilteredRecords().length} <span className="text-sm font-normal" style={{ color: '#fff', fontWeight: 300 }}>Rescues</span>
                                                        </p>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <Clock className="w-3 h-3" style={{ color: '#e05a5a' }} />
                                                            <span className="text-xs" style={{ color: '#a1a1aa' }}>
                                                                {calculateAverageResponseTime(getFilteredRecords())} avg response
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2.5 flex-1 overflow-y-auto">
                                                        {getFilteredRecords().map((record, idx) => {
                                                            const timeAgo = getTimeAgo(record.completionDate || record.dateTimeOccurred);
                                                            const severity = getSeverityFromAlertType(record.alertType);

                                                            const responseTime = getResponseTime(record);
                                                            const isExpanded = expandedRecord === record.emergencyId;

                                                            return (
                                                                <div key={idx} className="flex flex-col rounded-lg text-xs transition-colors" style={{ background: '#1f1f1f' }}>
                                                                    <div
                                                                        className="flex flex-col gap-1 py-2 px-2.5 cursor-pointer hover:bg-accent/30"
                                                                        onClick={() => setExpandedRecord(isExpanded ? null : record.emergencyId)}
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                {severity === 'critical' && <AlertCircle className="w-3 h-3" style={{ color: '#ff4444' }} />}
                                                                                {severity === 'high' && <AlertTriangle className="w-3 h-3" style={{ color: '#ff9944' }} />}
                                                                                {severity === 'medium' && <Shield className="w-3 h-3" style={{ color: '#ffdd44' }} />}
                                                                                {severity === 'low' && <CheckCircle className="w-3 h-3" style={{ color: '#34CA63' }} />}
                                                                                <span style={{ color: '#fff', fontWeight: 500 }}>{record.alertType}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span style={{ color: '#a1a1aa' }}>{timeAgo}</span>
                                                                                <ChevronDown
                                                                                    className="w-3 h-3 transition-transform"
                                                                                    style={{
                                                                                        color: '#a1a1aa',
                                                                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center justify-between ml-5">
                                                                            <span style={{ color: '#a1a1aa', fontSize: '10px' }}>{record.emergencyId}</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <span style={{ color: '#a1a1aa', fontSize: '10px' }}>{record.noOfPersonnel || 0} personnel</span>
                                                                                <span style={{ color: '#a1a1aa', fontSize: '10px' }}>•</span>
                                                                                <Clock className="w-3 h-3" style={{ color: '#e05a5a' }} />
                                                                                <span style={{ color: '#a1a1aa', fontSize: '10px' }}>{responseTime} response</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {isExpanded && (
                                                                        <div className="px-2.5 pb-2 pt-1 ml-5 border-t border-[#2a2a2a] mt-1" style={{ fontSize: '10px' }}>
                                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                                <div>
                                                                                    <span style={{ color: '#a1a1aa' }}>Water Level:</span>
                                                                                    <p style={{ color: '#fff', marginTop: '2px' }}>{record.waterLevel || 'N/A'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <span style={{ color: '#a1a1aa' }}>Urgency:</span>
                                                                                    <p style={{ color: '#fff', marginTop: '2px' }}>{record.urgencyOfEvacuation || 'N/A'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <span style={{ color: '#a1a1aa' }}>Hazards:</span>
                                                                                    <p style={{ color: '#fff', marginTop: '2px' }}>{record.hazardPresent || 'N/A'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <span style={{ color: '#a1a1aa' }}>Dispatcher:</span>
                                                                                    <p style={{ color: '#fff', marginTop: '2px' }}>{record.dispatchedName || 'N/A'}</p>
                                                                                </div>
                                                                                <div className="col-span-2">
                                                                                    <span style={{ color: '#a1a1aa' }}>Resources Used:</span>
                                                                                    <p style={{ color: '#fff', marginTop: '2px' }}>
                                                                                        {Array.isArray(record.resourcesUsed)
                                                                                            ? record.resourcesUsed.map((r: { name?: string; quantity?: number } | string) =>
                                                                                                typeof r === 'object' ? `${r.name} (${r.quantity})` : r
                                                                                            ).join(', ')
                                                                                            : typeof record.resourcesUsed === 'object' && record.resourcesUsed !== null
                                                                                                ? JSON.stringify(record.resourcesUsed)
                                                                                                : record.resourcesUsed || 'N/A'}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="col-span-2">
                                                                                    <span style={{ color: '#a1a1aa' }}>Actions Taken:</span>
                                                                                    <p style={{ color: '#fff', marginTop: '2px' }}>
                                                                                        {Array.isArray(record.actionsTaken)
                                                                                            ? record.actionsTaken.map((a: { name?: string; quantity?: number } | string) =>
                                                                                                typeof a === 'object' ? `${a.name} (${a.quantity})` : a
                                                                                            ).join(', ')
                                                                                            : typeof record.actionsTaken === 'object' && record.actionsTaken !== null
                                                                                                ? JSON.stringify(record.actionsTaken)
                                                                                                : record.actionsTaken || 'N/A'}
                                                                                    </p>
                                                                                </div>
                                                                                <div>
                                                                                    <span style={{ color: '#a1a1aa' }}>Started:</span>
                                                                                    <p style={{ color: '#fff', marginTop: '2px' }}>
                                                                                        {new Date(record.dateTimeOccurred).toLocaleString()}
                                                                                    </p>
                                                                                </div>
                                                                                <div>
                                                                                    <span style={{ color: '#a1a1aa' }}>Completed:</span>
                                                                                    <p style={{ color: '#fff', marginTop: '2px' }}>
                                                                                        {record.completionDate ? new Date(record.completionDate).toLocaleString() : 'N/A'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {rescueRecords.length === 0 && (
                                                            <div className="flex items-center justify-center flex-1 text-muted-foreground text-xs py-8">
                                                                No rescue records found for this terminal
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {/* AI Predictions - shadcn card bg */}
                                    <div className="bg-card rounded-xl p-5 border border-border flex flex-col" style={{ height: '460px', maxWidth: '460px', boxShadow: '0 2px 8px 0 #0000000a', minWidth: '0', width: '100%' }}>
                                        <div className="flex flex-col h-full">
                                            {/* Header with blinking dots and context button */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Brain className="w-4 h-4" style={{ color: '#38bdf8' }} />
                                                    <p className="text-xs uppercase tracking-wide" style={{ color: '#EBFAFA' }}>AI Predictions</p>
                                                    {/* Orange dot - data changed */}
                                                    {hasDataChanged && !isGeneratingAI && (
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                                        </span>
                                                    )}
                                                    {/* Green dot - AI generating */}
                                                    {isGeneratingAI && (
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Add Context Button */}
                                                <button
                                                    onClick={() => setShowContextModal(true)}
                                                    className="p-1.5 rounded-md transition-all hover:bg-[#2a2a2a]"
                                                    style={{ color: additionalContext ? '#38bdf8' : '#a1a1aa' }}
                                                    title="Add additional context"
                                                >
                                                    <MessageSquarePlus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Generate button */}
                                            <button
                                                onClick={generateAIPrediction}
                                                disabled={isGeneratingAI || !weatherData || !communityData}
                                                className="w-full mb-3 py-2 px-3 rounded-lg text-xs font-medium transition-all"
                                                style={{
                                                    background: isGeneratingAI ? '#1e293b' : '#38bdf8',
                                                    color: '#fff',
                                                    border: '1px solid ' + (isGeneratingAI ? '#38bdf833' : '#38bdf8'),
                                                    opacity: (!weatherData || !communityData) ? 0.5 : 1,
                                                    cursor: (isGeneratingAI || !weatherData || !communityData) ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isGeneratingAI ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        <span>Generating Prediction...</span>
                                                    </div>
                                                ) : (
                                                    <span>{aiPrediction ? 'Regenerate' : 'Generate'} AI Prediction</span>
                                                )}
                                            </button>

                                            {/* AI Loading Animation */}
                                            {isGeneratingAI && (
                                                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                                    <div className="relative">
                                                        {/* Animated gradient circle */}
                                                        <div className="w-24 h-24 rounded-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)' }}>
                                                            <div className="absolute inset-0 animate-spin" style={{ background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)' }}></div>
                                                        </div>

                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-medium text-white mb-1">Analyzing Data...</p>
                                                        <p className="text-xs text-muted-foreground">Processing weather patterns, rescue history, and community data</p>
                                                    </div>
                                                    {/* Floating particles */}
                                                    <div className="flex gap-2">
                                                        {[0, 1, 2].map((i) => (
                                                            <div
                                                                key={i}
                                                                className="w-2 h-2 rounded-full bg-sky-400"
                                                                style={{
                                                                    animation: `bounce 1.4s infinite ease-in-out ${i * 0.15}s`
                                                                }}
                                                            ></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error State */}
                                            {aiError && !isGeneratingAI && (
                                                <div className="rounded-lg p-3 border border-red-500/20" style={{ background: '#1e1414' }}>
                                                    <div className="flex items-start gap-2">
                                                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-medium text-red-500">Prediction Failed</p>
                                                            <p className="text-xs text-red-400/70 mt-1">{aiError}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* AI Prediction Results */}
                                            {aiPrediction && !isGeneratingAI && (
                                                <div className="flex-1 overflow-y-auto space-y-4">
                                                    {/* Summary */}
                                                    <div className="rounded-lg p-4" style={{ background: '#18282C', border: '1px solid #38bdf833' }}>
                                                        <div className="flex items-start gap-2.5">
                                                            <Zap className="w-4 h-4 mt-0.5" style={{ color: '#38bdf8' }} />
                                                            <div>
                                                                <p className="text-sm leading-relaxed mb-2" style={{ color: '#e0f2fe' }}>
                                                                    {aiPrediction.summary}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                                                                        background: aiPrediction.riskLevel === 'critical' ? '#7f1d1d' :
                                                                            aiPrediction.riskLevel === 'high' ? '#854d0e' :
                                                                                aiPrediction.riskLevel === 'medium' ? '#713f12' : '#14532d',
                                                                        color: aiPrediction.riskLevel === 'critical' ? '#fca5a5' :
                                                                            aiPrediction.riskLevel === 'high' ? '#fcd34d' :
                                                                                aiPrediction.riskLevel === 'medium' ? '#fde047' : '#86efac'
                                                                    }}>
                                                                        {aiPrediction.riskLevel.toUpperCase()} RISK
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col gap-1.5 mt-2.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <Clock className="w-3.5 h-3.5" style={{ color: '#38bdf8' }} />
                                                                        <span className="text-xs" style={{ color: '#a1a1aa' }}>
                                                                            Response: {aiPrediction.estimatedResponseTime}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Zap className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
                                                                        <span className="text-xs" style={{ color: '#a1a1aa' }}>
                                                                            Action window: {aiPrediction.timeWindow}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Predictions */}
                                                    <div className="space-y-3">
                                                        {aiPrediction.predictions.slice(0, 3).map((pred, i) => (
                                                            <div key={i} className="rounded-lg p-3.5 border" style={{ background: '#1f1f1f', borderColor: '#232323' }}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        {pred.impact === "critical" && <AlertCircle className="w-4 h-4" style={{ color: '#dc2626' }} />}
                                                                        {pred.impact === "high" && <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />}
                                                                        {pred.impact === "medium" && <Shield className="w-4 h-4" style={{ color: '#facc15' }} />}
                                                                        {pred.impact === "low" && <CheckCircle className="w-4 h-4" style={{ color: '#34CA63' }} />}
                                                                        <span className="text-sm font-medium text-white">{pred.title}</span>
                                                                    </div>
                                                                    <span style={{
                                                                        fontSize: '11px',
                                                                        padding: '3px 10px',
                                                                        borderRadius: '9999px',
                                                                        fontWeight: 600,
                                                                        background: pred.impact === "critical" ? '#281618' :
                                                                            pred.impact === "high" ? '#3d2409' :
                                                                                pred.impact === "medium" ? '#422006' : '#14532d',
                                                                        color: pred.impact === "critical" ? '#DC5759' :
                                                                            pred.impact === "high" ? '#f59e0b' :
                                                                                pred.impact === "medium" ? '#D6B441' : '#86efac'
                                                                    }}>
                                                                        {pred.impact.toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs mb-2 leading-relaxed" style={{ color: '#a1a1aa' }}>
                                                                    {pred.description}
                                                                    {pred.timeframe && ` • ${pred.timeframe}`}
                                                                </p>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ background: '#171717' }}>
                                                                        <div style={{
                                                                            background: pred.impact === "critical" ? '#dc2626' :
                                                                                pred.impact === "high" ? '#f59e0b' :
                                                                                    pred.impact === "medium" ? '#eab308' : '#22c55e',
                                                                            width: `${pred.confidence}%`,
                                                                            height: '100%',
                                                                            borderRadius: '4px'
                                                                        }}></div>
                                                                    </div>
                                                                    <span className="text-xs font-medium" style={{ color: '#a1a1aa' }}>{pred.confidence}%</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Recommendations */}
                                                    {aiPrediction.recommendations && aiPrediction.recommendations.length > 0 && (
                                                        <div className="rounded-lg p-3.5" style={{ background: '#1f2937', border: '1px solid #374151' }}>
                                                            <p className="text-xs font-semibold text-white mb-2.5">RECOMMENDED ACTIONS</p>
                                                            <div className="space-y-2">
                                                                {aiPrediction.recommendations.slice(0, 3).map((rec, i) => (
                                                                    <div key={i} className="flex gap-2">
                                                                        <span className="text-xs text-sky-400 mt-0.5">•</span>
                                                                        <p className="text-xs text-gray-300 leading-relaxed">{rec.action}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Empty State */}
                                            {!aiPrediction && !isGeneratingAI && !aiError && (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                                                    <Brain className="w-12 h-12 text-muted-foreground/30 mb-3" />
                                                    <p className="text-sm font-medium text-muted-foreground mb-1">No prediction yet</p>
                                                    <p className="text-xs text-muted-foreground/70">
                                                        Click "Generate AI Prediction" to analyze flood risk and get preemptive recommendations
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>

            {/* Additional Context Floating Modal */}
            {showContextModal && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 z-[9999]"
                        onClick={() => setShowContextModal(false)}
                    />

                    {/* Modal */}
                    <div className="fixed z-[99999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md">
                        <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] shadow-2xl p-5">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <MessageSquarePlus className="w-4 h-4 text-sky-400" />
                                    <h3 className="text-sm font-semibold text-white">Additional Context</h3>
                                </div>
                                <button
                                    onClick={() => setShowContextModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-gray-400 mb-3">
                                Provide real-time local conditions or issues not captured in the data to improve AI prediction accuracy.
                            </p>

                            {/* Textarea */}
                            <textarea
                                value={additionalContext}
                                onChange={(e) => setAdditionalContext(e.target.value)}
                                placeholder="Examples:&#10;• Drainage blocked due to construction&#10;• Evacuation center unavailable&#10;• Recent flooding near market area"
                                className="w-full px-3 py-2.5 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                                style={{
                                    background: '#0d0d0d',
                                    border: '1px solid #2a2a2a',
                                    color: '#fff',
                                    minHeight: '120px',
                                }}
                                autoFocus
                            />

                            {/* Character count */}
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] text-gray-500">
                                    {additionalContext.length} characters
                                </span>
                                {additionalContext.length > 0 && (
                                    <button
                                        onClick={() => setAdditionalContext('')}
                                        className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setShowContextModal(false)}
                                    className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
                                    style={{
                                        background: '#2a2a2a',
                                        color: '#fff',
                                        border: '1px solid #3a3a3a',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowContextModal(false);
                                        // If there's already a prediction, regenerate with new context
                                        if (aiPrediction) {
                                            generateAIPrediction();
                                        } else {
                                            // Otherwise just mark that data changed (orange dot)
                                            setHasDataChanged(true);
                                        }
                                    }}
                                    className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
                                    style={{
                                        background: '#38bdf8',
                                        color: '#fff',
                                        border: '1px solid #38bdf8',
                                    }}
                                >
                                    {aiPrediction ? 'Save & Regenerate' : 'Save Context'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Alert Focal Person Confirmation Modal */}
            {confirmAlertOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.35)',
                        zIndex: 100000,
                        pointerEvents: 'auto',
                    }}
                    onClick={() => setConfirmAlertOpen(false)}
                />
            )}
            <AlertDialog open={confirmAlertOpen} onOpenChange={setConfirmAlertOpen}>
                <AlertDialogContent
                    style={{
                        zIndex: 999999,
                        background: '#0d0d0d',
                        border: '1px solid #404040',
                        color: '#fff'
                    }}
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>
                            Alert Focal Person
                        </AlertDialogTitle>
                        <AlertDialogDescription style={{ color: '#a1a1aa', lineHeight: '1.6' }}>
                            Send emergency alert to focal person? This will send SMS and email notification with current conditions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setConfirmAlertOpen(false)}
                            disabled={isAlertingFocalPerson}
                            className="px-4 py-2 mt-3 bg-[#1b1b1b] text-white border border-[#3E3E3E] cursor-pointer transition duration-175 hover:bg-[#222222]"
                            style={{ borderRadius: 8, fontSize: 15 }}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={sendFocalAlert}
                            disabled={isAlertingFocalPerson}
                            className="px-4 py-2 mt-3 bg-white text-black hover:bg-[#e2e2e2] rounded cursor-pointer transition duration-175"
                            style={{ borderRadius: 8, fontSize: 15 }}
                        >
                            {isAlertingFocalPerson ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Alert Focal'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Success Snackbar */}
            <div
                className={`fixed left-[85px] bottom-[30px] z-50 transition-all duration-300 ease-out ${showSuccessSnackbar ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"}`}
            >
                <Alert className="min-w-[280px] max-w-[520px] bg-[#171717] border border-[#2a2a2a] text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-blue-600/25">
                        <Bell className="size-5 text-[#3B82F6]" />
                    </div>
                    <AlertDescription className="text-[13px] leading-tight">
                        {successMessage}
                    </AlertDescription>
                </Alert>
            </div>
        </>
    );
}
