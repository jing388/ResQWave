import Alert, { AlertDescription } from "@/components/ui/alert-focal";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp-focal";
import { CheckCircle2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { resendAdminDispatcherCode } from "../api";
import { HeaderOfficial } from "./HeaderOfficial";

export function ForgotPasswordVerification({
  code,
  error,
  isVerifying,
  onCodeChange,
  onVerify,
  tempToken,
}: {
  code: string;
  error: string;
  isVerifying: boolean;
  onCodeChange: (val: string) => void;
  onVerify: (e: React.FormEvent) => void;
  tempToken?: string;
}) {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [showResendAlert, setShowResendAlert] = useState(false);
  const [resendAlertTimer, setResendAlertTimer] =
    useState<NodeJS.Timeout | null>(null);
  // Timer state for token expiration (persist expiry timestamp in sessionStorage)
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to get expiry timestamp from sessionStorage
  function getStoredExpiry() {
    const stored = sessionStorage.getItem("officialOtpExpiry");
    if (stored) {
      const ts = parseInt(stored, 10);
      if (!isNaN(ts)) return ts;
    }
    return null;
  }

  // Timer logic: always use latest expiry from sessionStorage
  useEffect(() => {
    function getAndSetExpiry() {
      const expiry = getStoredExpiry();
      if (!expiry) return;
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setExpiresIn(diff);
      if (diff === 0) {
        sessionStorage.removeItem("officialOtpExpiry");
      }
    }
    getAndSetExpiry();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(getAndSetExpiry, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // When resend is successful, reset expiry to 5 minutes from now and update timer immediately
  useEffect(() => {
    if (showResendAlert) {
      const newExpiry = Date.now() + 5 * 60 * 1000;
      sessionStorage.setItem("officialOtpExpiry", newExpiry.toString());
      // Immediately update timer state and restart interval
      setExpiresIn(300);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const expiry = getStoredExpiry();
        if (!expiry) return;
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiry - now) / 1000));
        setExpiresIn(diff);
        if (diff === 0) {
          sessionStorage.removeItem("officialOtpExpiry");
        }
      }, 1000);
    }
  }, [showResendAlert]);

  async function handleResend() {
    // Get the latest tempToken from sessionStorage (in case it was updated)
    const currentTempToken = sessionStorage.getItem("tempToken") || tempToken;

    if (!currentTempToken) {
      setResendMsg("No session found. Please login again.");
      return;
    }
    setResendLoading(true);
    setResendMsg(null);
    try {
      const res = await resendAdminDispatcherCode(currentTempToken);
      setResendMsg(null);
      setShowResendAlert(true);
      if (resendAlertTimer) clearTimeout(resendAlertTimer);
      const timer = setTimeout(() => setShowResendAlert(false), 3000);
      setResendAlertTimer(timer);
      // If backend returns a new tempToken, update sessionStorage
      if (res.tempToken) {
        sessionStorage.setItem("tempToken", res.tempToken);
      }
      // Set new expiry timestamp for OTP (5 minutes from now)
      const newExpiry = Date.now() + 5 * 60 * 1000;
      sessionStorage.setItem("officialOtpExpiry", newExpiry.toString());
    } catch (err: unknown) {
      const error = err as { message?: string };
      let msg = error?.message || "Failed to resend code";
      try {
        const parsed = JSON.parse(msg);
        msg = parsed.message || msg;
      } catch {
        /* Ignore JSON parse errors */
      }
      setResendMsg(msg);
    } finally {
      setResendLoading(false);
    }
  }

  // Format timer as mm:ss
  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return (
    <div
      className="min-h-screen flex flex-col primary-background"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Floating resend success alert */}
      {showResendAlert && (
        <div
          style={{
            position: "fixed",
            left: 30,
            bottom: 30,
            zIndex: 100000,
            minWidth: 220,
            maxWidth: 520,
            transition: "opacity 220ms linear",
            opacity: showResendAlert ? 1 : 0,
          }}
        >
          <Alert iconBoxVariant="success">
            <CheckCircle2Icon color="#22c55e" />
            <div style={{ minWidth: 180 }}>
              <AlertDescription>
                Verification code resent successfully!
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}
      <HeaderOfficial />
      <div className="loginfocal-radial-gradient" />
      <main
        className="flex flex-1 flex-col items-center justify-center w-full"
        style={{ marginTop: "0px", zIndex: 20, position: "relative" }}
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="mb-2">
            <span className="text-[#BABABA] text-sm sm:text-base">
              Code expires in:{" "}
              <span className="font-semibold text-white">
                {formatTime(expiresIn)}
              </span>
            </span>
          </div>
          <h1 className="text-4xl font-semibold text-white mb-1">
            Enter verification code
          </h1>
          <p className="text-[#BABABA] text-center mb-2 text-base max-w-lg">
            <span className="block mb-1">
              We want to make sure your information stays safe and secure.
            </span>
            <span className="block mb-1">
              Please enter the verification code we sent to your registered
            </span>
            <span className="block">number/email to continue.</span>
          </p>
        </div>
        <form
          className="flex flex-col items-center gap-6 w-full max-w-[490px]"
          onSubmit={onVerify}
        >
          <div
            className="flex flex-col items-center"
            style={{ width: "464px", maxWidth: "100%" }}
          >
            <InputOTP
              maxLength={6}
              value={code}
              onChange={onCodeChange}
              containerClassName="justify-center mb-9 gap-4"
            >
              <InputOTPGroup>
                <InputOTPSlot
                  index={0}
                  className={`bg-[#171717] h-[65px] w-[65px] text-2xl text-white border ${error ? "border-red-500" : "border-[#404040]"}`}
                />
                <InputOTPSlot
                  index={1}
                  className={`bg-[#171717] h-[65px] w-[65px] text-2xl text-white border ${error ? "border-red-500" : "border-[#404040]"}`}
                />
              </InputOTPGroup>
              <InputOTPSeparator>
                <span className="mx-4 text-white text-2xl">&bull;</span>
              </InputOTPSeparator>
              <InputOTPGroup>
                <InputOTPSlot
                  index={2}
                  className={`bg-[#171717] h-[65px] w-[65px] text-2xl text-white border ${error ? "border-red-500" : "border-[#404040]"}`}
                />
                <InputOTPSlot
                  index={3}
                  className={`bg-[#171717] h-[65px] w-[65px] text-2xl text-white border ${error ? "border-red-500" : "border-[#404040]"}`}
                />
              </InputOTPGroup>
              <InputOTPSeparator>
                <span className="mx-4 text-white text-2xl">&bull;</span>
              </InputOTPSeparator>
              <InputOTPGroup>
                <InputOTPSlot
                  index={4}
                  className={`bg-[#171717] h-[65px] w-[65px] text-2xl text-white border ${error ? "border-red-500" : "border-[#404040]"}`}
                />
                <InputOTPSlot
                  index={5}
                  className={`bg-[#171717] h-[65px] w-[65px] text-2xl text-white border ${error ? "border-red-500" : "border-[#404040]"}`}
                />
              </InputOTPGroup>
            </InputOTP>
            <div className="text-center text-[#BABABA] mb-5 w-full text-sm sm:text-base">
              Didn't receive any code?{" "}
              <button
                type="button"
                className={`text-blue-400 disabled:opacity-60 ${resendLoading || expiresIn > 0 ? "cursor-default" : "hover:underline cursor-pointer"}`}
                onClick={handleResend}
                disabled={resendLoading || expiresIn > 0}
              >
                {resendLoading
                  ? "Resending..."
                  : expiresIn > 0
                    ? `Resend`
                    : "Resend"}
              </button>
              {resendMsg && (
                <div className="mt-2 text-red-400">{resendMsg}</div>
              )}
            </div>
            <Button
              type="submit"
              disabled={isVerifying || code.length < 6}
              className={`w-[535px] py-6 rounded-md font-medium text-base mt-2 transition-all duration-200 flex items-center justify-center gap-2 ${code.length < 6 ? "bg-[#232323] text-[#929090] cursor-not-allowed" : "text-white hover:brightness-90"} `}
              style={{
                background:
                  code.length < 6
                    ? "#232323"
                    : "linear-gradient(0deg, #3B82F6 0%, #70A6FF 100%)",
                color: code.length < 6 ? "#929090" : undefined,
                opacity: code.length < 6 ? 1 : isVerifying ? 0.6 : 1,
              }}
            >
              {isVerifying && (
                <span className="inline-block mr-2">
                  <svg
                    className="animate-spin h-6 w-6 text-white"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                </span>
              )}
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
