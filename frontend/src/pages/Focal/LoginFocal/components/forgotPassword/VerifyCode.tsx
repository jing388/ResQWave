import { Button } from "@/components/ui/button";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp-focal";
import { useEffect, useRef, useState } from "react";
import { requestFocalPasswordReset, verifyFocalResetCode } from "../../api/authApi";

interface VerifyCodeProps {
  userID: number;
  maskedEmail: string;
  expiryTimestamp: number | null;
  onVerified: (code: string) => void;
  onBack: () => void;
  onResend: (newExpiryTimestamp: number) => void;
  onError: (message: string) => void;
}

export function VerifyCode({
  userID,
  maskedEmail,
  onVerified,
  onBack,
  onResend,
  onError,
}: VerifyCodeProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [error, setError] = useState("");
  const [showResendAlert, setShowResendAlert] = useState(false);
  const [resendAlertTimer, setResendAlertTimer] =
    useState<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to get expiry timestamp from sessionStorage
  function getStoredExpiry() {
    const stored = sessionStorage.getItem("focalPasswordResetExpiry");
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
        sessionStorage.removeItem("focalPasswordResetExpiry");
      }
    }
    getAndSetExpiry();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(getAndSetExpiry, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // When resend is successful, reset expiry to 5 minutes from now and update timer immediately
  useEffect(() => {
    if (showResendAlert) {
      const newExpiry = Date.now() + 5 * 60 * 1000;
      sessionStorage.setItem("focalPasswordResetExpiry", newExpiry.toString());
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
          sessionStorage.removeItem("focalPasswordResetExpiry");
        }
      }, 1000);
    }
  }, [showResendAlert]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsVerifying(true);
    setError(""); // Clear previous errors

    try {
      await verifyFocalResetCode(userID, code);
      // Store verified code in sessionStorage
      sessionStorage.setItem("focalPasswordResetCode", code);
      onVerified(code);
    } catch (err: unknown) {
      const errorObj = err as {
        message?: string;
        status?: number;
        data?: { message?: string; failedAttempts?: number; locked?: boolean };
      };

      if (errorObj.status === 429) {
        // Account locked
        onError(
          errorObj.message ||
            "Too many attempts. Account temporarily locked. Please try again later.",
        );
        setCode(""); // Clear code on lock
      } else if (errorObj.status === 400) {
        // Invalid code or expired - parse the error message
        const errorMessage =
          errorObj.message ||
          errorObj.data?.message ||
          "Invalid code. Please try again.";

        // Check if it's an expiry error
        if (errorMessage.toLowerCase().includes("expired")) {
          onError("Code has expired. Please request a new one.");
          setCode(""); // Clear code on expiry
        } else {
          // Invalid code
          setError(errorMessage);
          // Don't clear code - let user correct it
        }
      } else {
        onError(errorObj.message || "Verification failed. Please try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    const originalEmailOrNumber = sessionStorage.getItem(
      "focalPasswordResetEmailOrNumber",
    );
    if (!originalEmailOrNumber) {
      onError("Unable to resend code. Please start over.");
      return;
    }

    setIsResending(true);

    try {
      const response = await requestFocalPasswordReset(originalEmailOrNumber);

      // Update stored expiry
      const newExpiryTimestamp =
        Date.now() + response.expiresInMinutes * 60 * 1000;
      sessionStorage.setItem(
        "focalPasswordResetExpiry",
        newExpiryTimestamp.toString(),
      );

      // Clear any existing timer for resend alert
      if (resendAlertTimer) {
        clearTimeout(resendAlertTimer);
      }

      // Trigger resend notification and timer update
      setShowResendAlert(true);
      onResend(newExpiryTimestamp);

      // Hide resend alert after 3 seconds
      const timer = setTimeout(() => {
        setShowResendAlert(false);
        setResendAlertTimer(null);
      }, 3000);
      setResendAlertTimer(timer);

      // Clear any entered code since new one is sent
      setCode("");
      setError("");
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number };
      onError(
        errorObj.message || "Failed to resend code. Please try again.",
      );
    } finally {
      setIsResending(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resendAlertTimer) {
        clearTimeout(resendAlertTimer);
      }
    };
  }, [resendAlertTimer]);

  return (
    <div>
      <main
        className="flex flex-1 flex-col items-center w-full px-10 sm:px-0"
        style={{ marginTop: "120px", zIndex: 20, position: "relative" }}
      >
        <div
          className="flex flex-col items-center gap-4 mb-8"
          style={{
            width: "100%",
            maxWidth: window.innerWidth <= 480 ? "95vw" : "460px",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
          <div className="mb-2">
            <span className="text-[#BABABA] text-sm">
              Code expires in:{" "}
              <span className="font-semibold text-white">
                {formatTime(expiresIn)}
              </span>
            </span>
          </div>

          <h1
            className="text-[35px] font-semibold text-white mb-1"
            style={window.innerWidth <= 480 ? { fontSize: "1.45rem" } : {}}
          >
            Enter verification code
          </h1>
          <p
            className="text-[#BABABA] text-center text-base mb-2 leading-relaxed"
            style={window.innerWidth <= 480 ? { fontSize: "0.82rem" } : {}}
          >
            Please enter the verification code we sent to
            <br />
            {maskedEmail}.
          </p>
        </div>

        <form
          className="flex flex-col gap-3 w-full mx-auto items-center"
          style={{
            maxWidth: window.innerWidth <= 480 ? "95vw" : "490px",
            width: "100%",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
          onSubmit={handleVerify}
        >
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(val) => {
              setCode(val);
              if (error) {
                setError("");
              }
            }}
            containerClassName="justify-center gap-3"
            style={{ marginBottom: error ? "8px" : "16px" }}
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
              <span className="text-white text-2xl">•</span>
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
              <span className="text-white text-2xl">•</span>
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
          {error && (
            <p
              className="text-red-500 text-sm mb-3 text-center"
              style={window.innerWidth <= 480 ? { fontSize: "0.75rem" } : {}}
            >
              {error}
            </p>
          )}

          <div className="text-center mb-3">
            <span className="text-[#BABABA] text-sm">
              Didn't receive any code?{" "}
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || expiresIn > 0}
              className={`text-[#3B82F6] text-sm bg-transparent border-none disabled:opacity-60 ${
                isResending || expiresIn > 0
                  ? "cursor-default"
                  : "hover:text-[#2C64C5] cursor-pointer"
              }`}
            >
              {isResending ? "Resending..." : "Resend"}
            </button>
          </div>

          <Button
            type="submit"
            disabled={isVerifying || code.length !== 6}
            className="text-white py-6 rounded-md font-medium text-base flex items-center justify-center gap-2
             bg-gradient-to-t from-[#3B82F6] to-[#70A6FF] 
             hover:from-[#2C64C5] hover:to-[#2C64C5]
             transition duration-300 cursor-pointer mt-1"
            style={{
              opacity: isVerifying || code.length !== 6 ? 0.7 : 1,
              width: "100%",
              fontSize: window.innerWidth <= 480 ? "0.95rem" : undefined,
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

          <button
            type="button"
            className="text-[#A3A3A3] hover:text-[#929090] mt-2 text-md bg-transparent border-none cursor-pointer"
            onClick={onBack}
            style={window.innerWidth <= 480 ? { fontSize: "0.97rem" } : {}}
          >
            Back
          </button>
        </form>
      </main>
    </div>
  );
}