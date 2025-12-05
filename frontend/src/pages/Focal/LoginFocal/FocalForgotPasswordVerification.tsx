import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FocalHeader } from "./components/FocalHeader";
import type { FocalForgotPasswordAlertsHandle } from "./components/forgotPassword/FocalForgotPasswordAlerts";
import FocalForgotPasswordAlerts from "./components/forgotPassword/FocalForgotPasswordAlerts";
import { PasswordUpdated } from "./components/forgotPassword/PasswordUpdated";
import { ResetPassword } from "./components/forgotPassword/ResetPassword";
import { VerifyCode } from "./components/forgotPassword/VerifyCode";

export type FocalForgotPasswordVerificationStep = 1 | 2 | 3;

export function FocalForgotPasswordVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const alertsRef = useRef<FocalForgotPasswordAlertsHandle>(null);
  
  // Get data from location state or sessionStorage
  const stateData = location.state as {
    userID?: number;
    maskedEmail?: string;
    expiryTimestamp?: number;
  } | null;

  const [currentStep, setCurrentStep] = useState<FocalForgotPasswordVerificationStep>(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  // Initialize state from location or sessionStorage
  const [userID] = useState<number>(
    stateData?.userID || 
    parseInt(sessionStorage.getItem("focalPasswordResetUserID") || "0", 10)
  );
  const [maskedEmail] = useState<string>(
    stateData?.maskedEmail || 
    sessionStorage.getItem("focalPasswordResetMaskedEmail") || ""
  );
  const [expiryTimestamp] = useState<number | null>(
    stateData?.expiryTimestamp || 
    parseInt(sessionStorage.getItem("focalPasswordResetExpiry") || "0", 10) || null
  );
  const [verificationCode, setVerificationCode] = useState<string>("");

  const goToStep = (
    step: FocalForgotPasswordVerificationStep,
    dir: "forward" | "backward" = "forward",
  ) => {
    setDirection(dir);
    setTimeout(() => {
      setCurrentStep(step);
    }, 50);
  };

  const handleBackToForgotPassword = () => {
    navigate("/forgot-password-focal");
  };

  const handleBackToLogin = () => {
    navigate("/login-focal");
  };

  // Redirect if missing required data
  if (!userID || !maskedEmail) {
    return (
      <div className="min-h-screen flex flex-col primary-background relative overflow-hidden">
        <div className="loginfocal-radial-gradient" />
        <FocalHeader />
        <main className="flex flex-1 flex-col items-center justify-center w-full px-10">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white mb-4">
              Session Expired
            </h1>
            <p className="text-[#BABABA] mb-6">
              Your password reset session has expired. Please start over.
            </p>
            <button
              onClick={handleBackToForgotPassword}
              className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1E40AF] hover:to-[#1E3A8A] text-white px-6 py-3 rounded-xl font-medium transition-all duration-200"
            >
              Start Over
            </button>
          </div>
        </main>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <VerifyCode
            userID={userID}
            maskedEmail={maskedEmail}
            expiryTimestamp={expiryTimestamp}
            onVerified={(code: string) => {
              setVerificationCode(code);
              alertsRef.current?.showCodeVerified();
              goToStep(2, "forward");
            }}
            onBack={handleBackToForgotPassword}
            onResend={(newExpiry: number) => {
              // Update expiry in sessionStorage
              sessionStorage.setItem("focalPasswordResetExpiry", newExpiry.toString());
              alertsRef.current?.showCodeResent();
            }}
            onError={(message: string) => alertsRef.current?.showError(message)}
          />
        );
      case 2:
        return (
          <ResetPassword
            userID={userID}
            code={verificationCode}
            onSuccess={() => {
              alertsRef.current?.showPasswordUpdated();
              goToStep(3, "forward");
            }}
            onBack={() => goToStep(1, "backward")}
            onError={(message: string) => alertsRef.current?.showError(message)}
          />
        );
      case 3:
        return <PasswordUpdated onBackToLogin={handleBackToLogin} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col primary-background relative overflow-hidden">
      <div className="loginfocal-radial-gradient" />
      <FocalForgotPasswordAlerts ref={alertsRef} />

      {/* Static Header - not animated */}
      <div className="relative z-20">
        <FocalHeader />
      </div>

      {/* Animated Content */}
      <div className="relative z-20">
        <div
          key={currentStep}
          className={`transition-all duration-400 ease-in-out ${
            direction === "forward"
              ? "animate-slide-in-left"
              : "animate-slide-in-right"
          }`}
        >
          {renderStep()}
        </div>
      </div>
    </div>
  );
}