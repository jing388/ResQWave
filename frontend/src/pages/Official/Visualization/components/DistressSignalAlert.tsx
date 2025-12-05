import { AlertTriangle, Navigation } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type DistressSignalData = {
  focalPerson?: string;
  alertType?: string;
  deviceId?: string;
};

export type DistressSignalAlertHandle = {
  showDistressAlert: (signalData: DistressSignalData) => void;
  hideAlert: () => void;
};

interface DistressSignalAlertProps {
  onGoToLiveReport: () => void;
}

export default forwardRef<DistressSignalAlertHandle, DistressSignalAlertProps>(
  function DistressSignalAlert({ onGoToLiveReport }, ref) {
    const [showAlert, setShowAlert] = useState(false);
    const [alertData, setAlertData] = useState<DistressSignalData | null>(null);
    const alertTimer = useRef<number | null>(null);

    // Clear timer on unmount
    useEffect(() => {
      return () => {
        if (alertTimer.current) {
          window.clearTimeout(alertTimer.current);
          alertTimer.current = null;
        }
      };
    }, []);

    const hideAlert = () => {
      setShowAlert(false);
      setAlertData(null);
      if (alertTimer.current) {
        window.clearTimeout(alertTimer.current);
        alertTimer.current = null;
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        showDistressAlert: (signalData: DistressSignalData) => {
          // Clear any existing timer
          if (alertTimer.current) {
            window.clearTimeout(alertTimer.current);
            alertTimer.current = null;
          }

          setAlertData(signalData);
          setShowAlert(true);

          // Auto-hide after 3 seconds
          alertTimer.current = window.setTimeout(() => {
            hideAlert();
          }, 6000);
        },
        hideAlert,
      }),
      [],
    );

    const getAlertMessage = () => {
      if (!alertData) return "A new distress signal has been detected.";

      const alertTypeText =
        alertData.alertType === "CRITICAL" ? "critical" : "user-initiated";
      const locationText = alertData.focalPerson
        ? `from ${alertData.focalPerson}`
        : alertData.deviceId
          ? `from ${alertData.deviceId}`
          : "in your area";

      return `A new ${alertTypeText} distress signal has appeared ${locationText}. Immediate attention required.`;
    };

    const getAlertColor = () => {
      if (!alertData?.alertType) return "#ef4444"; // default red
      return alertData.alertType === "CRITICAL" ? "#ef4444" : "#eab308";
    };

    const handleGoToLiveReport = () => {
      hideAlert();
      onGoToLiveReport();
    };

    return (
      <>
        {/* Distress Signal Alert - Top Center */}
        <div
          className={`fixed top-[73px] left-1/2 transform -translate-x-1/2 z-50 transition-all duration-600 ease-out ${showAlert ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0 pointer-events-none"}`}
        >
          <div className="w-[720px] bg-[#171717] border border-[#2a2a2a] text-white rounded-[5px] shadow-xl">
            <div className="flex items-center gap-2 p-2">
              {/* Alert Icon */}
              <div
                className="flex h-12 w-12 items-center justify-center rounded-[5px] flex-shrink-0"
                style={{ backgroundColor: `${getAlertColor()}25` }}
              >
                <AlertTriangle
                  className="size-6"
                  style={{ color: getAlertColor() }}
                />
              </div>

              {/* Alert Description */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] leading-tight text-[#e5e7eb]">
                  <b>🚨 Distress Signal Detected:</b> {getAlertMessage()}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleGoToLiveReport}
                className="bg-[#3B82F6] hover:bg-[#2563eb] h-10 text-white text-xs px-2 py-2 rounded-[4px] flex items-center gap-2 transition-colors flex-shrink-0"
              >
                <Navigation className="size-3" />
                Go to Live Report
              </button>
            </div>
          </div>
        </div>
      </>
    );
  },
);
