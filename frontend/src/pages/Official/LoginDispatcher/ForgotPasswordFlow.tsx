import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeaderOfficial } from "./components/HeaderOfficial";
import { FindAccount } from "./components/forgotPassword/FindAccount";
import type { ForgotPasswordAlertsHandle } from "./components/forgotPassword/ForgotPasswordAlerts";
import ForgotPasswordAlerts from "./components/forgotPassword/ForgotPasswordAlerts";
import { PasswordUpdated } from "./components/forgotPassword/PasswordUpdated";
import { ResetPassword } from "./components/forgotPassword/ResetPassword";
import { VerifyCode } from "./components/forgotPassword/VerifyCode";

export type ForgotPasswordStep = 1 | 2 | 3 | 4;

export function ForgotPasswordFlow() {
  const navigate = useNavigate();
  const alertsRef = useRef<ForgotPasswordAlertsHandle>(null);
  const [currentStep, setCurrentStep] = useState<ForgotPasswordStep>(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  // State to persist across steps
  const [userID, setUserID] = useState<number | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [expiryTimestamp, setExpiryTimestamp] = useState<number | null>(null);

  const goToStep = (
    step: ForgotPasswordStep,
    dir: "forward" | "backward" = "forward",
  ) => {
    setDirection(dir);
    setTimeout(() => {
      setCurrentStep(step);
    }, 50);
  };

  const handleBackToLogin = () => {
    navigate("/login-official");
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <FindAccount
            onNext={(id: number, email: string, expiry: number) => {
              setUserID(id);
              setMaskedEmail(email);
              setExpiryTimestamp(expiry);
              alertsRef.current?.showCodeSent(email);
              goToStep(2, "forward");
            }}
            onBack={handleBackToLogin}
            onError={(message: string) => alertsRef.current?.showError(message)}
          />
        );
      case 2:
        return (
          <VerifyCode
            userID={userID!}
            maskedEmail={maskedEmail}
            expiryTimestamp={expiryTimestamp}
            onVerified={(code: string) => {
              setVerificationCode(code);
              alertsRef.current?.showCodeVerified();
              goToStep(3, "forward");
            }}
            onBack={() => goToStep(1, "backward")}
            onResend={(newExpiry: number) => {
              setExpiryTimestamp(newExpiry);
              alertsRef.current?.showCodeResent();
            }}
            onError={(message: string) => alertsRef.current?.showError(message)}
          />
        );
      case 3:
        return (
          <ResetPassword
            userID={userID!}
            code={verificationCode}
            onSuccess={() => {
              alertsRef.current?.showPasswordUpdated();
              goToStep(4, "forward");
            }}
            onBack={() => goToStep(2, "backward")}
            onError={(message: string) => alertsRef.current?.showError(message)}
          />
        );
      case 4:
        return <PasswordUpdated onBackToLogin={handleBackToLogin} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col primary-background relative overflow-hidden">
      <div className="loginfocal-radial-gradient" />
      <ForgotPasswordAlerts ref={alertsRef} />

      {/* Static Header - not animated */}
      <div style={{ position: "relative", zIndex: 20 }}>
        <HeaderOfficial />
      </div>

      {/* Animated Content */}
      <div className="relative" style={{ zIndex: 20 }}>
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
