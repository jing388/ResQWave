import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { requestFocalPasswordReset } from "../../api/authApi";

interface FindAccountProps {
  onNext: (
    userID: number,
    maskedEmail: string,
    expiryTimestamp: number,
  ) => void;
  onBack: () => void;
  onError: (message: string) => void;
}

export function FindAccount({ onNext, onBack, onError }: FindAccountProps) {
  const [emailOrNumber, setEmailOrNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailOrNumber.trim()) {
      onError("Please enter your email or phone number");
      return;
    }

    setIsLoading(true);

    try {
      const response = await requestFocalPasswordReset(emailOrNumber.trim());

      // Calculate expiry timestamp
      const expiryTimestamp =
        Date.now() + response.expiresInMinutes * 60 * 1000;

      // Store in sessionStorage for persistence
      sessionStorage.setItem("focalPasswordResetExpiry", expiryTimestamp.toString());
      sessionStorage.setItem("focalPasswordResetUserID", response.userID.toString());
      sessionStorage.setItem("focalPasswordResetMaskedEmail", response.maskedEmail);
      sessionStorage.setItem(
        "focalPasswordResetEmailOrNumber",
        emailOrNumber.trim(),
      ); // Store original for resend

      onNext(response.userID, response.maskedEmail, expiryTimestamp);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number };
      if (errorObj.status === 404) {
        setError("No account found with this email or phone number");
      } else if (errorObj.status === 500) {
        onError("Failed to send reset code. Please try again later");
      } else {
        onError(errorObj.message || "An error occurred. Please try again");
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
            Find account
          </h1>
          <p
            className="text-[#BABABA] text-center text-base mb-2 leading-relaxed"
            style={window.innerWidth <= 480 ? { fontSize: "0.82rem" } : {}}
          >
            Enter your email address or your phone number to
            <br />
            recover your account.
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
          <label
            className="block text-white text-[15px] font-light"
            style={window.innerWidth <= 480 ? { fontSize: "0.85rem" } : {}}
          >
            Email or Phone Number
          </label>
          <Input
            type="text"
            value={emailOrNumber}
            onChange={(e) => {
              setEmailOrNumber(e.target.value);
              if (error) setError("");
            }}
            className={`bg-[#171717] border ${error ? "border-red-500" : "border-[#404040]"} rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            style={{
              fontSize: window.innerWidth <= 480 ? "13px" : "16px",
              height: window.innerWidth <= 480 ? "38px" : "55px",
              width: "100%",
              marginBottom: error ? "8px" : "12px",
            }}
          />
          {error && (
            <p
              className="text-red-500 text-sm mb-3"
              style={window.innerWidth <= 480 ? { fontSize: "0.75rem" } : {}}
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="text-white py-6 rounded-md font-medium text-base flex items-center justify-center gap-2
             bg-gradient-to-t from-[#3B82F6] to-[#70A6FF] 
             hover:from-[#2C64C5] hover:to-[#2C64C5]
             transition duration-300 cursor-pointer mt-1"
            style={{
              opacity: isLoading ? 0.7 : 1,
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
            {isLoading ? "Sending..." : "Next"}
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