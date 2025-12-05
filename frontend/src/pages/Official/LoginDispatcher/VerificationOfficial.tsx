import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ForgotPasswordVerification } from "./components/forgotPasswordVerification";

export function VerificationOfficial() {
  const navigate = useNavigate();
  const { verifyLogin } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [tempToken, setTempToken] = useState(
    sessionStorage.getItem("tempToken") || "",
  );

  // On mount, set OTP expiry to 5 minutes from now if not already set
  useEffect(() => {
    const stored = sessionStorage.getItem("officialOtpExpiry");
    if (!stored) {
      const expiry = Date.now() + 5 * 60 * 1000;
      sessionStorage.setItem("officialOtpExpiry", expiry.toString());
    }
  }, []);

  // Listen for tempToken updates in sessionStorage
  useEffect(() => {
    const checkTempToken = () => {
      const currentToken = sessionStorage.getItem("tempToken") || "";
      if (currentToken !== tempToken) {
        setTempToken(currentToken);
      }
    };

    // Check every second for tempToken updates
    const interval = setInterval(checkTempToken, 1000);

    return () => clearInterval(interval);
  }, [tempToken]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) {
      setError("Please enter the complete verification code.");
      return;
    }

    setIsVerifying(true);
    try {
      const success = await verifyLogin(code);
      if (success) {
        // Clear OTP expiry on successful verification
        sessionStorage.removeItem("officialOtpExpiry");
        navigate("/visualization");
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      setError(err.message || "Invalid verification code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <ForgotPasswordVerification
      code={code}
      error={error}
      isVerifying={isVerifying}
      onCodeChange={(val: string) => {
        setCode(val);
        if (error) setError("");
      }}
      onVerify={handleVerify}
      tempToken={tempToken}
    />
  );
}
