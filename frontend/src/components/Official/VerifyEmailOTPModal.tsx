import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp-focal";
import { apiFetch } from "@/lib/api";

interface VerifyEmailOTPModalProps {
    open: boolean;
    onClose: () => void;
    email: string;
    onVerify: (otp: string) => void;
    error?: string;
}

export default function VerifyEmailOTPModal({ open, onClose, email, onVerify, error }: VerifyEmailOTPModalProps) {
    const [otp, setOtp] = useState("");
    const [resendMsg, setResendMsg] = useState("");
    const [resendError, setResendError] = useState("");
    const [resending, setResending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    if (!open) return null;

    const maskEmail = (email: string) => {
        const [localPart, domain] = email.split('@');
        if (!localPart || !domain) return email;

        const visibleStart = localPart.slice(0, 2);
        const visibleEnd = localPart.slice(-4);
        const maskedLength = Math.max(0, localPart.length - 6);
        const masked = '*'.repeat(maskedLength);

        return `${visibleStart}${masked}${visibleEnd}@${domain}`;
    };

    const handleConfirm = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (otp.length === 6) {
            setIsVerifying(true);
            try {
                await onVerify(otp);
            } finally {
                setIsVerifying(false);
            }
        }
    };

    const handleResend = async () => {
        setResendMsg("");
        setResendError("");
        setResending(true);
        try {
            await apiFetch("/profile/change-email", {
                method: "POST",
                body: JSON.stringify({ newEmail: email })
            });
            setResendMsg("A new code has been sent to your email.");
            setTimeout(() => setResendMsg(""), 2000);
        } catch (err: any) {
            let msg = err.message || "Failed to resend code.";
            if (typeof err === 'object' && err !== null && 'message' in err) {
                msg = err.message;
            }
            if (msg.includes("Email already in use")) {
                msg = "This email is already in use.";
            } else if (msg.startsWith('{') && msg.includes('message')) {
                try {
                    const parsed = JSON.parse(msg);
                    if (parsed.message) msg = parsed.message;
                } catch { }
            }
            setResendError(msg);
        } finally {
            setResending(false);
        }
    };

    const handleClose = () => {
        setOtp("");
        setIsVerifying(false);
        onClose();
    };

    const isOTPComplete = otp.length === 6;

    return (
        <div
            className="absolute inset-0 flex items-center justify-center rounded-[6px] px-8 md:px-4"
            onClick={(e) => {
                e.stopPropagation();
                handleClose();
            }}
        >
            <form
                onSubmit={handleConfirm}
                className="relative w-full max-w-[560px] min-h-[280px] bg-[#171717] rounded-[6px] border border-[#404040] py-6 px-6 md:py-10 md:px-11 flex flex-col justify-center max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm md:text-base font-semibold text-white mb-1">Verify your email</h3>
                        <p className="text-sm md:text-[13px] text-[#A3A3A3]">
                            Please enter the verification code we sent to{" "}
                            <span className="text-white">{maskEmail(email)}</span>
                        </p>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="text-[#9ca3af] hover:text-white transition-colors ml-2 md:ml-4"
                        aria-label="Close"
                    >
                        <X size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>
                </div>

                {/* OTP Input */}
                <div className="mb-2 flex justify-center">
                    <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(value) => setOtp(value)}
                        containerClassName="justify-center gap-2"
                    >
                        <InputOTPGroup>
                            <InputOTPSlot
                                index={0}
                                className={`bg-transparent h-12 w-12 md:h-[60px] md:w-[60px] text-xl md:text-2xl text-white border ${error ? 'border-red-500' : 'border-[#404040]'}`}
                            />
                            <InputOTPSlot
                                index={1}
                                className={`bg-transparent h-12 w-12 md:h-[60px] md:w-[60px] text-xl md:text-2xl text-white border ${error ? 'border-red-500' : 'border-[#404040]'}`}
                            />
                        </InputOTPGroup>
                        <InputOTPSeparator>
                            <span className="mx-2 md:mx-3 text-white text-lg md:text-xl">&bull;</span>
                        </InputOTPSeparator>
                        <InputOTPGroup>
                            <InputOTPSlot
                                index={2}
                                className={`bg-transparent h-12 w-12 md:h-[60px] md:w-[60px] text-xl md:text-2xl text-white border ${error ? 'border-red-500' : 'border-[#404040]'}`}
                            />
                            <InputOTPSlot
                                index={3}
                                className={`bg-transparent h-12 w-12 md:h-[60px] md:w-[60px] text-xl md:text-2xl text-white border ${error ? 'border-red-500' : 'border-[#404040]'}`}
                            />
                        </InputOTPGroup>
                        <InputOTPSeparator>
                            <span className="mx-2 md:mx-3 text-white text-lg md:text-xl">&bull;</span>
                        </InputOTPSeparator>
                        <InputOTPGroup>
                            <InputOTPSlot
                                index={4}
                                className={`bg-transparent h-12 w-12 md:h-[60px] md:w-[60px] text-xl md:text-2xl text-white border ${error ? 'border-red-500' : 'border-[#404040]'}`}
                            />
                            <InputOTPSlot
                                index={5}
                                className={`bg-transparent h-12 w-12 md:h-[60px] md:w-[60px] text-xl md:text-2xl text-white border ${error ? 'border-red-500' : 'border-[#404040]'}`}
                            />
                        </InputOTPGroup>
                    </InputOTP>
                </div>
                {error && (
                    <div className="mb-4 text-left text-xs text-red-500">{error}</div>
                )}

                {/* Resend Link */}
                <div className="mb-5 text-start">
                    <p className="text-sm text-[#BABABA]">
                        Didn't receive any code?{" "}
                        <button
                            type="button"
                            onClick={handleResend}
                            className="text-blue-400 hover:underline"
                            disabled={resending}
                        >
                            {resending ? "Resending..." : "Resend"}
                        </button>
                    </p>
                    {resendMsg && <div className="text-xs text-green-400 mt-1">{resendMsg}</div>}
                    {resendError && <div className="text-xs text-red-500 mt-1">{resendError}</div>}
                </div>

                {/* Confirm Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!isOTPComplete || isVerifying}
                        className={`px-6 py-2 text-sm font-medium rounded transition-colors ${!isOTPComplete || isVerifying
                            ? 'bg-[#414141] text-[#9ca3af] cursor-not-allowed'
                            : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                            }`}
                    >
                        {isVerifying ? "Verifying..." : "Confirm"}
                    </button>
                </div>
            </form>
        </div>
    );
}
