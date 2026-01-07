import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import VerifyEmailOTPModal from "./VerifyEmailOTPModal";
import Snackbar from "./Snackbar";
import { apiFetch } from "@/lib/api";

interface ChangeEmailModalProps {
    open: boolean;
    onClose: () => void;
    currentEmail: string;
}

export default function ChangeEmailModal({ open, onClose, currentEmail }: ChangeEmailModalProps) {
    const [email, setEmail] = useState("");
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [error, setError] = useState("");
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open && !showOTPModal) {
                handleClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, showOTPModal]);

    if (!open && !showSnackbar) return null;

    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const isEmailValid = isValidEmail(email) && email !== currentEmail;

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError("");
        if (isEmailValid) {
            setIsLoading(true);
            try {
                // Request OTP from backend using apiFetch
                await apiFetch("/profile/change-email", {
                    method: "POST",
                    body: JSON.stringify({ newEmail: email })
                });
                setShowOTPModal(true);
            } catch (err: any) {
                // User-friendly error messages
                let msg = err.message || "Failed to send OTP";
                // If error is an object (e.g., { message: ... }), extract message
                if (typeof err === 'object' && err !== null && 'message' in err) {
                    msg = err.message;
                }
                if (msg.includes("Email already in use")) {
                    msg = "This email is already in use.";
                } else if (msg.includes("Missing admin ID") || msg.includes("Missing")) {
                    msg = "Something went wrong. Please try again.";
                } else if (msg.startsWith('{') && msg.includes('message')) {
                    // Try to parse JSON error
                    try {
                        const parsed = JSON.parse(msg);
                        if (parsed.message) msg = parsed.message;
                    } catch { }
                }
                setError(msg);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleVerifyOTP = async (otp: string) => {
        setError("");
        try {
            // Verify OTP and update email using apiFetch
            await apiFetch("/profile/verify-email-change", {
                method: "POST",
                body: JSON.stringify({ code: otp })
            });
            // Update email in AuthContext (if possible)
            if (user) {
                user.email = email;
            }
            // Show success snackbar first
            setShowSnackbar(true);
            // Close modals
            setShowOTPModal(false);
            setEmail("");
            setError("");
            onClose();
        } catch (err: any) {
            // User-friendly error messages
            let msg = err.message || "Failed to update email";
            if (typeof err === 'object' && err !== null && 'message' in err) {
                msg = err.message;
            }
            if (msg.includes("OTP does not match")) {
                msg = "The code does not match the requested email.";
            } else if (msg.includes("Invalid or expired OTP")) {
                msg = "The code is invalid or has expired.";
            } else if (msg.includes("Email already in use")) {
                msg = "This email is already in use.";
            } else if (msg.startsWith('{') && msg.includes('message')) {
                // Try to parse JSON error
                try {
                    const parsed = JSON.parse(msg);
                    if (parsed.message) msg = parsed.message;
                } catch { }
            }
            setError(msg);
        }
    };

    const handleClose = () => {
        setEmail("");
        setShowOTPModal(false);
        setError("");
        setIsLoading(false);
        onClose();
    };

    return (
        <>
            {open && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-[6px] px-8 md:px-4"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClose();
                    }}
                >
                    <form
                        onSubmit={handleConfirm}
                        className="relative w-full max-w-[560px] min-h-[200px] bg-[#171717] rounded-[6px] border border-[#404040] py-6 px-6 md:py-10 md:px-11 flex flex-col justify-center max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="mb-4 md:mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm md:text-base font-semibold text-white mb-1">Change Email</h3>
                                <p className="text-xs md:text-[13px] text-[#A3A3A3]">Enter a new valid email to continue.</p>
                            </div>

                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={handleClose}
                                className="text-[#9ca3af] hover:text-white transition-colors ml-2 md:ml-4"
                                aria-label="Close"
                            >
                                <X size={16} className="md:w-[18px] md:h-[18px]" />
                            </button>
                        </div>

                        {/* Email Input */}
                        <div className="mb-1">
                            <label className="block text-[13px] text-white mb-2">Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={currentEmail}
                                    className={`w-full bg-[#171717] text-white text-sm px-3 py-2.5 rounded-[5px] border ${error ? 'border-red-500' : 'border-[#404040]'} focus:outline-none focus:border-[#4a4a4a]`}
                                    autoFocus
                                />
                                {error && (
                                    <div className="absolute left-0 top-full mt-1 text-xs text-red-500 w-full">{error}</div>
                                )}
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <div className="flex justify-end mt-6">
                            <button
                                type="submit"
                                disabled={!isEmailValid || isLoading}
                                className={`px-6 py-2 text-sm font-medium rounded transition-colors ${!isEmailValid || isLoading
                                    ? 'bg-[#414141] text-[#9ca3af] cursor-not-allowed'
                                    : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                                    }`}
                            >
                                {isLoading ? "Sending..." : "Confirm"}
                            </button>
                        </div>
                    </form>

                    {/* OTP Verification Modal */}
                    <VerifyEmailOTPModal
                        open={showOTPModal}
                        onClose={() => {
                            setShowOTPModal(false);
                            setError("");
                        }}
                        email={email}
                        onVerify={handleVerifyOTP}
                        error={error}
                    />
                    {/* Error now shown in field, not here */}

                </div>
            )}

            {/* Success Snackbar - Rendered outside modal so it persists after modal closes */}
            <Snackbar
                open={showSnackbar}
                message="Email updated successfully!"
                onClose={() => setShowSnackbar(false)}
            />
        </>
    );
}
