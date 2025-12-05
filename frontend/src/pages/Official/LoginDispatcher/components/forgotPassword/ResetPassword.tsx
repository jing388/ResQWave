import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2Icon, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { resetPassword } from "../../api/authApi";

interface ResetPasswordProps {
  userID: number;
  code: string;
  onSuccess: () => void;
  onBack: () => void;
  onError: (message: string) => void;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export function ResetPassword({
  userID,
  code,
  onSuccess,
  onBack,
  onError,
}: ResetPasswordProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password policy validation
  const validatePassword = (password: string): PasswordRequirement[] => {
    return [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
      { label: "At least one lowercase letter", met: /[a-z]/.test(password) },
      { label: "At least one number", met: /[0-9]/.test(password) },
      {
        label: "At least one special character",
        met: /[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(password),
      },
    ];
  };

  const requirements = validatePassword(newPassword);
  const allRequirementsMet = requirements.every((req) => req.met);
  const passwordsMatch =
    newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      onError("Password does not meet all requirements");
      return;
    }

    if (!passwordsMatch) {
      onError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(userID, code, newPassword);
      // Clear session storage
      sessionStorage.removeItem("passwordResetExpiry");
      sessionStorage.removeItem("passwordResetUserID");
      sessionStorage.removeItem("passwordResetMaskedEmail");
      sessionStorage.removeItem("passwordResetEmailOrNumber");
      sessionStorage.removeItem("passwordResetCode");
      onSuccess();
    } catch (err: unknown) {
      const error = err as { message?: string; status?: number };
      if (error.status === 400) {
        onError(error.message || "Invalid request. Please try again.");
      } else if (error.status === 429) {
        onError("Too many attempts. Please try again later.");
      } else {
        onError(error.message || "Failed to reset password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1
            className="text-[43px] font-semibold text-white mb-1"
            style={window.innerWidth <= 480 ? { fontSize: "1.45rem" } : {}}
          >
            Reset Password
          </h1>
          <p
            className="text-[#BABABA] text-center text-base mb-2 leading-relaxed"
            style={window.innerWidth <= 480 ? { fontSize: "0.82rem" } : {}}
          >
            Protect your account with a strong unique password. We
            <br />
            recommend following the password requirements below.
          </p>
        </div>

        <form
          className="flex flex-col gap-3 w-full mx-auto"
          style={{
            maxWidth: window.innerWidth <= 480 ? "95vw" : "490px",
            width: "100%",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
          onSubmit={handleSubmit}
        >
          <div className="mb-2">
            <label
              className="block text-white text-[15px] font-light mb-2"
              style={window.innerWidth <= 480 ? { fontSize: "0.85rem" } : {}}
            >
              New Password
            </label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#171717] border border-[#404040] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                style={{
                  fontSize: window.innerWidth <= 480 ? "13px" : "16px",
                  height: window.innerWidth <= 480 ? "38px" : "55px",
                  width: "100%",
                }}
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                onClick={() => setShowNewPassword((prev) => !prev)}
                role="button"
                tabIndex={0}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <EyeOff size={window.innerWidth <= 480 ? 15 : 22} />
                ) : (
                  <Eye size={window.innerWidth <= 480 ? 15 : 22} />
                )}
              </span>
            </div>
          </div>

          <div className="mb-3">
            <label
              className="block text-white text-[15px] font-light mb-2"
              style={window.innerWidth <= 480 ? { fontSize: "0.85rem" } : {}}
            >
              Confirm Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-[#171717] border border-[#404040] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                style={{
                  fontSize: window.innerWidth <= 480 ? "13px" : "16px",
                  height: window.innerWidth <= 480 ? "38px" : "55px",
                  width: "100%",
                }}
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                role="button"
                tabIndex={0}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={window.innerWidth <= 480 ? 15 : 22} />
                ) : (
                  <Eye size={window.innerWidth <= 480 ? 15 : 22} />
                )}
              </span>
            </div>
          </div>

          {/* Password Requirements */}
          {newPassword.length > 0 && (
            <div className="mb-3 p-3 bg-black/20 rounded-[5px] border border-[#404040]">
              <p className="text-white text-sm font-medium mb-2">
                Password Requirements:
              </p>
              <ul className="space-y-1">
                {requirements.map((req, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    {req.met ? (
                      <CheckCircle2Icon size={16} className="text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-500" />
                    )}
                    <span
                      className={req.met ? "text-green-500" : "text-gray-400"}
                    >
                      {req.label}
                    </span>
                  </li>
                ))}
                {confirmPassword.length > 0 && (
                  <li className="flex items-center gap-2 text-sm mt-1">
                    {passwordsMatch ? (
                      <CheckCircle2Icon size={16} className="text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-500" />
                    )}
                    <span
                      className={
                        passwordsMatch ? "text-green-500" : "text-gray-400"
                      }
                    >
                      Passwords match
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !allRequirementsMet || !passwordsMatch}
            className="text-white py-6 rounded-md font-medium text-base flex items-center justify-center gap-2
             bg-gradient-to-t from-[#3B82F6] to-[#70A6FF] 
             hover:from-[#2C64C5] hover:to-[#2C64C5]
             transition duration-300 cursor-pointer mt-1"
            style={{
              opacity:
                isLoading || !allRequirementsMet || !passwordsMatch ? 0.7 : 1,
              width: "100%",
              fontSize: window.innerWidth <= 480 ? "0.95rem" : undefined,
            }}
          >
            {isLoading && (
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
            {isLoading ? "Confirming..." : "Confirm"}
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
