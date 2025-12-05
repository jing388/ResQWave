import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Send, X } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type DispatchFormData = {
  focalPerson?: string;
  [key: string]: unknown;
};

export type RescueFormAlertsHandle = {
  showWaitlistSuccess: (focalPerson: string) => void;
  showDispatchSuccess: (focalPerson: string) => void;
  showError: (message: string) => void;
  showDispatchConfirmation: (formData: unknown, onConfirm: () => void) => void;
  hideAll: () => void;
};

export default forwardRef<RescueFormAlertsHandle>(
  function RescueFormAlerts(_props, ref) {
    // Waitlist success alert (bottom left)
    const [showWaitlist, setShowWaitlist] = useState(false);
    const [waitlistMessage, setWaitlistMessage] = useState("");
    const waitlistTimer = useRef<number | null>(null);

    // Dispatch success alert (bottom left)
    const [showDispatch, setShowDispatch] = useState(false);
    const [dispatchMessage, setDispatchMessage] = useState("");
    const dispatchTimer = useRef<number | null>(null);

    // Error alert (bottom left)
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const errorTimer = useRef<number | null>(null);

    // Dispatch confirmation dialog (center)
    const [showDispatchConfirm, setShowDispatchConfirm] = useState(false);
    const [dispatchConfirmData, setDispatchConfirmData] =
      useState<DispatchFormData | null>(null);
    const [dispatchConfirmCallback, setDispatchConfirmCallback] = useState<
      (() => void) | null
    >(null);

    // Clear timers on unmount
    useEffect(() => {
      return () => {
        if (waitlistTimer.current) window.clearTimeout(waitlistTimer.current);
        if (dispatchTimer.current) window.clearTimeout(dispatchTimer.current);
        if (errorTimer.current) window.clearTimeout(errorTimer.current);
      };
    }, []);

    const hideAllAlerts = () => {
      setShowWaitlist(false);
      setShowDispatch(false);
      setShowError(false);
      // Clear all timers
      if (waitlistTimer.current) {
        window.clearTimeout(waitlistTimer.current);
        waitlistTimer.current = null;
      }
      if (dispatchTimer.current) {
        window.clearTimeout(dispatchTimer.current);
        dispatchTimer.current = null;
      }
      if (errorTimer.current) {
        window.clearTimeout(errorTimer.current);
        errorTimer.current = null;
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        showWaitlistSuccess: (focalPerson: string) => {
          hideAllAlerts();
          setWaitlistMessage(
            `Rescue form for "${focalPerson}" added to waitlist!`,
          );
          setShowWaitlist(true);
          waitlistTimer.current = window.setTimeout(() => {
            setShowWaitlist(false);
            waitlistTimer.current = null;
          }, 3000);
        },
        showDispatchSuccess: (focalPerson: string) => {
          hideAllAlerts();
          setDispatchMessage(`Rescue team dispatched for "${focalPerson}"!`);
          setShowDispatch(true);
          dispatchTimer.current = window.setTimeout(() => {
            setShowDispatch(false);
            dispatchTimer.current = null;
          }, 3000);
        },
        showError: (message: string) => {
          hideAllAlerts();
          setErrorMessage(message);
          setShowError(true);
          errorTimer.current = window.setTimeout(() => {
            setShowError(false);
            errorTimer.current = null;
          }, 5000);
        },
        showDispatchConfirmation: (
          formData: unknown,
          onConfirm: () => void,
        ) => {
          setDispatchConfirmData(formData as DispatchFormData);
          setDispatchConfirmCallback(() => onConfirm);
          setShowDispatchConfirm(true);
        },
        hideAll: hideAllAlerts,
      }),
      [],
    );

    return (
      <>
        {/* Waitlist Success Alert - Bottom Left */}
        <div
          className={`fixed left-[85px] bottom-[30px] z-50 transition-all duration-300 ease-out ${showWaitlist ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"}`}
        >
          <Alert className="min-w-[280px] max-w-[520px] bg-[#171717] border border-[#2a2a2a] text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-yellow-600/25">
              <div className="relative">
                <FileText className="size-5 text-[#eab308]" />
                <Clock className="absolute -top-1 -right-1 size-3 text-[#eab308]" />
              </div>
            </div>
            <AlertDescription className="text-[13px] leading-tight">
              {waitlistMessage}
            </AlertDescription>
          </Alert>
        </div>

        {/* Dispatch Success Alert - Bottom Left */}
        <div
          className={`fixed left-[85px] bottom-[30px] z-50 transition-all duration-300 ease-out ${showDispatch ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"}`}
        >
          <Alert className="min-w-[280px] max-w-[520px] bg-[#171717] border border-[#2a2a2a] text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-blue-600/25">
              <div className="relative">
                <FileText className="size-5 text-[#3B82F6]" />
                <Send className="absolute -top-1 -right-1 size-3 text-[#3B82F6]" />
              </div>
            </div>
            <AlertDescription className="text-[13px] leading-tight">
              {dispatchMessage}
            </AlertDescription>
          </Alert>
        </div>

        {/* Error Alert - Bottom Left */}
        {/* Error Alert - Bottom Left */}
        <div
          className={`fixed left-[85px] bottom-[30px] z-50 transition-all duration-300 ease-out ${showError ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"}`}
        >
          <Alert className="min-w-[280px] max-w-[600px] bg-[#171717] border border-red-600/50 text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-red-600/25">
              <div className="relative">
                <FileText className="size-5 text-[#ef4444]" />
                <X className="absolute -top-1 -right-1 size-3 text-[#ef4444]" />
              </div>
            </div>
            <AlertDescription className="text-[13px] leading-tight text-red-200">
              <span className="font-medium">Error:</span> {errorMessage}
            </AlertDescription>
          </Alert>
        </div>

        {/* Dispatch Confirmation Dialog - Center */}
        <div
          className={`fixed left-[85px] bottom-[30px] z-50 transition-all duration-300 ease-out ${showError ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"}`}
        >
          <Alert className="min-w-[280px] max-w-[600px] bg-[#171717] border border-red-600/50 text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-red-600/25">
              <div className="relative">
                <FileText className="size-5 text-[#ef4444]" />
                <X className="absolute -top-1 -right-1 size-3 text-[#ef4444]" />
              </div>
            </div>
            <AlertDescription className="text-[13px] leading-tight text-red-200">
              <span className="font-medium">Error:</span> {errorMessage}
            </AlertDescription>
          </Alert>
        </div>

        {/* Dispatch Confirmation Dialog - Center */}
        {showDispatchConfirm && dispatchConfirmData && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50">
            <div className="bg-[#171717] border border-[#2a2a2a] rounded-[5px] p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-blue-600/25 flex-shrink-0">
                  <div className="relative">
                    <FileText className="size-6 text-[#3B82F6]" />
                    <Send className="absolute -top-1 -right-1 size-3 text-[#3B82F6]" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Dispatch Rescue Team
                  </h3>
                  <p className="text-[14px] text-[#a1a1a1] mb-1">
                    Are you sure you want to dispatch a rescue team for{" "}
                    <span className="text-white font-semibold">
                      {dispatchConfirmData.focalPerson}
                    </span>
                    ?
                  </p>
                  <p className="text-[13px] text-[#a1a1a1]">
                    This will immediately send the rescue team to the location.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDispatchConfirm(false);
                    setDispatchConfirmCallback(null);
                    setDispatchConfirmData(null);
                  }}
                  className="bg-transparent border-[#404040] text-white hover:bg-[#262626]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (dispatchConfirmCallback) {
                      dispatchConfirmCallback();
                    }
                    setShowDispatchConfirm(false);
                    setDispatchConfirmCallback(null);
                    setDispatchConfirmData(null);
                  }}
                  className="bg-[#3B82F6] hover:bg-[#2563eb] text-white"
                >
                  Dispatch
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  },
);
