import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2Icon, KeyRound, Mail, ShieldCheck } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type ForgotPasswordAlertsHandle = {
  showCodeSent: (maskedEmail: string) => void;
  showCodeVerified: () => void;
  showCodeResent: () => void;
  showPasswordUpdated: () => void;
  showError: (message: string) => void;
  hideAll: () => void;
};

export default forwardRef<ForgotPasswordAlertsHandle>(
  function ForgotPasswordAlerts(_props, ref) {
    // Code sent alert (bottom left)
    const [showCodeSent, setShowCodeSent] = useState(false);
    const [codeSentMessage, setCodeSentMessage] = useState("");
    const codeSentTimer = useRef<number | null>(null);

    // Code verified alert (bottom left)
    const [showCodeVerified, setShowCodeVerified] = useState(false);
    const codeVerifiedTimer = useRef<number | null>(null);

    // Code resent alert (bottom left)
    const [showCodeResent, setShowCodeResent] = useState(false);
    const codeResentTimer = useRef<number | null>(null);

    // Password updated alert (bottom left)
    const [showPasswordUpdated, setShowPasswordUpdated] = useState(false);
    const passwordUpdatedTimer = useRef<number | null>(null);

    // Error alert (bottom left)
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const errorTimer = useRef<number | null>(null);

    // Clear timers on unmount
    useEffect(() => {
      return () => {
        if (codeSentTimer.current) window.clearTimeout(codeSentTimer.current);
        if (codeVerifiedTimer.current)
          window.clearTimeout(codeVerifiedTimer.current);
        if (codeResentTimer.current)
          window.clearTimeout(codeResentTimer.current);
        if (passwordUpdatedTimer.current)
          window.clearTimeout(passwordUpdatedTimer.current);
        if (errorTimer.current) window.clearTimeout(errorTimer.current);
      };
    }, []);

    const hideAllAlerts = () => {
      setShowCodeSent(false);
      setShowCodeVerified(false);
      setShowCodeResent(false);
      setShowPasswordUpdated(false);
      setShowError(false);
      // Clear all timers
      if (codeSentTimer.current) {
        window.clearTimeout(codeSentTimer.current);
        codeSentTimer.current = null;
      }
      if (codeVerifiedTimer.current) {
        window.clearTimeout(codeVerifiedTimer.current);
        codeVerifiedTimer.current = null;
      }
      if (codeResentTimer.current) {
        window.clearTimeout(codeResentTimer.current);
        codeResentTimer.current = null;
      }
      if (passwordUpdatedTimer.current) {
        window.clearTimeout(passwordUpdatedTimer.current);
        passwordUpdatedTimer.current = null;
      }
      if (errorTimer.current) {
        window.clearTimeout(errorTimer.current);
        errorTimer.current = null;
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        showCodeSent: (maskedEmail: string) => {
          hideAllAlerts();
          setCodeSentMessage(`Verification code sent to ${maskedEmail}`);
          setShowCodeSent(true);
          codeSentTimer.current = window.setTimeout(() => {
            setShowCodeSent(false);
            codeSentTimer.current = null;
          }, 4000);
        },
        showCodeVerified: () => {
          hideAllAlerts();
          setShowCodeVerified(true);
          codeVerifiedTimer.current = window.setTimeout(() => {
            setShowCodeVerified(false);
            codeVerifiedTimer.current = null;
          }, 3000);
        },
        showCodeResent: () => {
          hideAllAlerts();
          setShowCodeResent(true);
          codeResentTimer.current = window.setTimeout(() => {
            setShowCodeResent(false);
            codeResentTimer.current = null;
          }, 3000);
        },
        showPasswordUpdated: () => {
          hideAllAlerts();
          setShowPasswordUpdated(true);
          passwordUpdatedTimer.current = window.setTimeout(() => {
            setShowPasswordUpdated(false);
            passwordUpdatedTimer.current = null;
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
        hideAll: hideAllAlerts,
      }),
      [],
    );

    return (
      <>
        {/* Code Sent Alert - Bottom Left */}
        <div
          className={`fixed left-[30px] bottom-[30px] z-[100] transition-all duration-300 ease-out ${showCodeSent ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"}`}
        >
          <Alert className="min-w-[280px] max-w-[520px] bg-[#171717] border border-[#2a2a2a] text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-blue-600/25">
              <Mail className="size-5 text-[#3B82F6]" />
            </div>
            <AlertDescription className="text-[13px] leading-tight">
              {codeSentMessage}
            </AlertDescription>
          </Alert>
        </div>

        {/* Code Verified Alert - Bottom Left */}
        <div
          className={`fixed left-[30px] bottom-[30px] z-[100] transition-all duration-300 ease-out ${showCodeVerified ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"}`}
        >
          <Alert className="min-w-[280px] max-w-[520px] bg-[#171717] border border-[#2a2a2a] text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-green-600/25">
              <ShieldCheck className="size-5 text-[#22c55e]" />
            </div>
            <AlertDescription className="text-[13px] leading-tight">
              Verification code confirmed successfully!
            </AlertDescription>
          </Alert>
        </div>

        {/* Code Resent Alert - Bottom Left */}
        <div
          className={`fixed left-[30px] bottom-[30px] z-[100] transition-all duration-300 ease-out ${showCodeResent ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"}`}
        >
          <Alert className="min-w-[280px] max-w-[520px] bg-[#171717] border border-[#2a2a2a] text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-blue-600/25">
              <Mail className="size-5 text-[#3B82F6]" />
            </div>
            <AlertDescription className="text-[13px] leading-tight">
              New verification code sent to your email!
            </AlertDescription>
          </Alert>
        </div>

        {/* Password Updated Alert - Bottom Left */}
        <div
          className={`fixed left-[30px] bottom-[30px] z-[100] transition-all duration-300 ease-out ${showPasswordUpdated ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"}`}
        >
          <Alert className="min-w-[280px] max-w-[520px] bg-[#171717] border border-[#2a2a2a] text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-green-600/25">
              <div className="relative">
                <KeyRound className="size-5 text-[#22c55e]" />
                <CheckCircle2Icon className="absolute -top-1 -right-1 size-3 text-[#22c55e]" />
              </div>
            </div>
            <AlertDescription className="text-[13px] leading-tight">
              Password updated successfully!
            </AlertDescription>
          </Alert>
        </div>

        {/* Error Alert - Bottom Left */}
        <div
          className={`fixed left-[30px] bottom-[30px] z-[100] transition-all duration-300 ease-out ${showError ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"}`}
        >
          <Alert className="min-w-[280px] max-w-[600px] bg-[#171717] border border-red-600/50 text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-red-600/25">
              <AlertDescription className="text-[13px] leading-tight text-red-200">
                <span className="font-medium">Error:</span> {errorMessage}
              </AlertDescription>
            </div>
          </Alert>
        </div>
      </>
    );
  },
);
