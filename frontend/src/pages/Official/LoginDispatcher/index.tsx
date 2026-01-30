import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircleIcon, Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeaderOfficial } from "./components/HeaderOfficial";

export function LoginOfficial() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [ID, setID] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(ID, password);

      if (success) {
        setIsLoading(false);
        // Set OTP expiry to 5 minutes from now
        const expiry = Date.now() + 5 * 60 * 1000;
        sessionStorage.setItem("officialOtpExpiry", expiry.toString());
        // Both admin and dispatcher need 2FA - go to verification
        navigate("/verification-official");
      } else {
        setError("Invalid credentials. Please check your ID and password.");
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      setError(
        err?.message || "An error occurred during login. Please try again."
      );
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col primary-background"
      style={{ position: "relative", overflow: "hidden" }}
    >
      <div className="loginfocal-radial-gradient" />
      <HeaderOfficial />
      <main
        className="flex flex-1 flex-col items-center w-full px-4 sm:px-10 lg:px-0 mt-20 sm:mt-[120px] z-20 relative"
      >
        <div
          className="flex flex-col items-center gap-3 sm:gap-4 mb-6 sm:mb-8 w-full max-w-full sm:max-w-[460px] mx-auto"
        >
          <h1
            className="text-3xl sm:text-[45px] font-semibold text-white"
          >
            Sign in
          </h1>
          <p
            className="text-[#BABABA] text-center text-[0.9rem] sm:text-base leading-relaxed px-2"
          >
            Log in using your account credentials.
            <br />
            <span className="font-semibold mt-1 block">
              For dispatcher and admin use only.
            </span>
          </p>
        </div>

        {/* Error Alert UI - styled like focal login */}
        {error && (
          <div
            className="flex items-center gap-3 animate-in fade-in mx-auto w-full max-w-full sm:max-w-[490px] px-4 sm:px-0"
          >
            <Alert
              className="bg-[#291415] border border-[#F92626] rounded-[5px] mb-4 w-full text-xs sm:text-sm"
              variant="destructive"
            >
              <AlertCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <AlertTitle className="text-sm sm:text-base">
                {error.includes("credentials")
                  ? "Login failed"
                  : "Login failed"}
              </AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
                <p>{error}</p>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <form
          className="flex flex-col gap-3 w-full max-w-full sm:max-w-[490px] mx-auto px-4 sm:px-0"
          onSubmit={handleSubmit}
        >
          <label
            className="block text-white text-[0.9rem] sm:text-[15px] font-light"
          >
            ID
          </label>
          <Input
            type="text"
            value={ID}
            onChange={(e) => {
              setID(e.target.value);
              if (error) setError("");
            }}
            aria-invalid={!!error}
            className="bg-[#171717] border border-[#404040] mb-1 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base h-[44px] sm:h-[55px] w-full"
          />

          <div className="mb-2">
            <label
              className="block text-white text-[0.9rem] sm:text-[15px] font-light mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                aria-invalid={!!error}
                className="bg-[#171717] border border-[#404040] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 text-sm sm:text-base h-[44px] sm:h-[55px] w-full"
              />
              <span
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[#BABABA] hover:text-white transition-colors duration-300 cursor-pointer z-10"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={0}
                role="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowPassword((prev) => !prev);
                  }
                }}
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />
                ) : (
                  <Eye className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />
                )}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="text-white rounded-lg font-medium text-[0.95rem] sm:text-base flex items-center justify-center gap-2
             bg-linear-to-t from-[#3B82F6] to-[#70A6FF] 
             hover:from-[#1052BE] hover:to-[#70A6FF]
             transition duration-300 ease-in cursor-pointer mt-1 w-full h-[44px] sm:h-[55px]"
            style={{
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading && (
              <span className="inline-block mr-2">
                <svg
                  className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-white"
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
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="text-center mt-4 px-4 sm:px-0">
          <button
            className="text-[#BABABA] hover:text-white mt-2 text-[0.95rem] sm:text-base bg-transparent border-none cursor-pointer transition-colors duration-300"
            onClick={() => navigate("/forgot-password-dispatcher")}
          >
            Forgot Password?
          </button>
        </div>
      </main>
    </div>
  );
}
