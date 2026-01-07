import { useState, useEffect, useRef } from "react";
import { X, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { apiFetch } from "@/lib/api";
import Snackbar from "./Snackbar";
import { useAuth } from "@/contexts/AuthContext";

interface ChangePasswordModalProps {
    open: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
    const [showAlertPopover, setShowAlertPopover] = useState(false);
    const [hasStoppedTyping, setHasStoppedTyping] = useState(false);
    const [error, setError] = useState("");
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const newPasswordRef = useRef<HTMLInputElement>(null);
    const confirmPasswordRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open && !isLoading) {
                handleClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, isLoading]);

    // Password validation requirements
    const passwordRequirements = {
        minLength: newPassword.length >= 8,
        hasUppercase: /[A-Z]/.test(newPassword),
        hasLowercase: /[a-z]/.test(newPassword),
        hasNumber: /[0-9]/.test(newPassword),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };

    const allRequirementsMet = passwordRequirements.minLength &&
        passwordRequirements.hasUppercase &&
        passwordRequirements.hasLowercase &&
        passwordRequirements.hasNumber &&
        passwordRequirements.hasSpecial;

    // Detect when user stops typing
    useEffect(() => {
        if (newPassword.length > 0) {
            const timer = setTimeout(() => {
                setHasStoppedTyping(true);
            }, 1000); // 1 second after last keystroke

            return () => {
                clearTimeout(timer);
                setHasStoppedTyping(false);
            };
        } else {
            setHasStoppedTyping(false);
        }
    }, [newPassword]);

    // Auto-hide alert popover after 3 seconds
    useEffect(() => {
        if (showAlertPopover) {
            const timer = setTimeout(() => {
                setShowAlertPopover(false);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [showAlertPopover]);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Don't submit if validations fail
        if (!currentPassword || !allRequirementsMet || newPassword !== confirmPassword || isLoading) {
            return;
        }
        
        setError("");
        setIsLoading(true);
        
        try {
            await apiFetch("/profile/change-password", {
                method: "POST",
                body: JSON.stringify({ 
                    currentPassword, 
                    newPassword 
                })
            });
            
            // Update user's passwordLastUpdated in localStorage and memory
            if (user) {
                const updatedUser = {
                    ...user,
                    passwordLastUpdated: new Date().toISOString()
                };
                localStorage.setItem('resqwave_user', JSON.stringify(updatedUser));
                // Update in-memory user object
                Object.assign(user, updatedUser);
            }
            
            // Show success snackbar and close modal only on success
            setShowSnackbar(true);
            setTimeout(() => {
                handleClose();
            }, 100);
        } catch (err: any) {
            let msg = err.message || "Failed to change password";
            if (typeof err === 'object' && err !== null && 'message' in err) {
                msg = err.message;
            }
            if (msg.includes("Incorrect current password")) {
                msg = "Current password is incorrect.";
            } else if (msg.includes("Password does not meet policy")) {
                msg = "Password does not meet security requirements.";
            } else if (msg.startsWith('{') && msg.includes('message')) {
                try {
                    const parsed = JSON.parse(msg);
                    if (parsed.message) msg = parsed.message;
                } catch {}
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setIsNewPasswordFocused(false);
        setShowAlertPopover(false);
        setHasStoppedTyping(false);
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
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <form
                onSubmit={handleChangePassword}
                className="relative w-full max-w-[560px] min-h-[350px] md:min-h-[450px] bg-[#171717] rounded-[6px] border border-[#404040] py-6 px-6 md:py-10 md:px-11 flex flex-col justify-center max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-4 md:mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm md:text-base font-semibold text-white mb-1">Change Password</h3>
                        <p className="text-xs md:text-[13px] text-[#A3A3A3]">Enter your current password and choose a new one.</p>
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

                {/* Current Password */}
                <div className="mb-4">
                    <label className="block text-[13px] text-white mb-2">Current password</label>
                    <div className="relative">
                        <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                if (error) setError("");
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    newPasswordRef.current?.focus();
                                }
                            }}
                            className={`w-full bg-[#171717] text-white text-sm px-3 py-2.5 rounded-[5px] border ${error ? 'border-red-500' : 'border-[#404040]'} focus:outline-none ${error ? 'focus:border-red-500' : 'focus:border-[#4a4a4a]'} pr-10`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white transition-colors"
                        >
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={19} />}
                        </button>
                    </div>
                    {error && (
                        <p className="text-xs text-red-500 mt-2">{error}</p>
                    )}
                </div>

                {/* New Password */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <label className="block text-[13px] text-white">New password</label>
                        {hasStoppedTyping && newPassword.length > 0 && !allRequirementsMet && (
                            <button
                                onClick={() => setShowAlertPopover(true)}
                                className="text-red-500 hover:text-red-400 transition-colors"
                                type="button"
                            >
                                <AlertCircle size={16} />
                            </button>
                        )}
                    </div>

                    <Popover open={(newPassword.length > 0 && isNewPasswordFocused) || showAlertPopover}>
                        <PopoverTrigger asChild>
                            <div className="relative">
                                <input
                                    ref={newPasswordRef}
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    onFocus={() => setIsNewPasswordFocused(true)}
                                    onBlur={() => setIsNewPasswordFocused(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            confirmPasswordRef.current?.focus();
                                        }
                                    }}
                                    className="w-full bg-[#171717] text-white text-sm px-3 py-2.5 rounded-[5px] border border-[#404040] focus:outline-none focus:border-[#4a4a4a] pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white transition-colors"
                                >
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={19} />}
                                </button>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-[340px] bg-[#262626] border border-[#404040] p-5 rounded shadow-lg"
                            align="center"
                            side="top"
                            sideOffset={14}
                            onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                            <PopoverPrimitive.Arrow className="fill-[#2a2a2a]" width={19} height={12} />
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-white mb-3">Your password must contain:</p>

                                <div className="flex items-center gap-2">
                                    {passwordRequirements.minLength ? (
                                        <Check size={16} className="text-green-500" />
                                    ) : (
                                        <X size={16} className="text-[#9ca3af]" />
                                    )}
                                    <span className={`text-sm ${passwordRequirements.minLength ? 'text-white' : 'text-[#9ca3af]'}`}>
                                        A minimum of 8 characters
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {passwordRequirements.hasUppercase ? (
                                        <Check size={16} className="text-green-500" />
                                    ) : (
                                        <X size={16} className="text-[#9ca3af]" />
                                    )}
                                    <span className={`text-sm ${passwordRequirements.hasUppercase ? 'text-white' : 'text-[#9ca3af]'}`}>
                                        Atleast one uppercase
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {passwordRequirements.hasLowercase ? (
                                        <Check size={16} className="text-green-500" />
                                    ) : (
                                        <X size={16} className="text-[#9ca3af]" />
                                    )}
                                    <span className={`text-sm ${passwordRequirements.hasLowercase ? 'text-white' : 'text-[#9ca3af]'}`}>
                                        Atleast one lowercase
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {passwordRequirements.hasNumber ? (
                                        <Check size={16} className="text-green-500" />
                                    ) : (
                                        <X size={16} className="text-[#9ca3af]" />
                                    )}
                                    <span className={`text-sm ${passwordRequirements.hasNumber ? 'text-white' : 'text-[#9ca3af]'}`}>
                                        Atleast one number
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {passwordRequirements.hasSpecial ? (
                                        <Check size={16} className="text-green-500" />
                                    ) : (
                                        <X size={16} className="text-[#9ca3af]" />
                                    )}
                                    <span className={`text-sm ${passwordRequirements.hasSpecial ? 'text-white' : 'text-[#9ca3af]'}`}>
                                        Atleast one special character eg. !@#$%^
                                    </span>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Confirm New Password */}
                <div className="mb-1">
                    <label className="block text-[13px] text-white mb-2">Confirm new password</label>
                    <div className="relative">
                        <input
                            ref={confirmPasswordRef}
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onPaste={(e) => e.preventDefault()}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    // Only submit if validations pass
                                    if (currentPassword && allRequirementsMet && newPassword === confirmPassword && !isLoading) {
                                        const form = e.currentTarget.form;
                                        if (form) {
                                            form.requestSubmit();
                                        }
                                    }
                                }
                            }}
                            className="w-full bg-[#171717] text-white text-sm px-3 py-2.5 rounded-[5px] border border-[#404040] focus:outline-none focus:border-[#4a4a4a] pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={19} />}
                        </button>
                    </div>
                </div>

                {/* Confirm Button */}
                <div className="flex justify-end mt-6">
                    <button
                        type="submit"
                        disabled={!currentPassword || !allRequirementsMet || newPassword !== confirmPassword || isLoading}
                        className={`px-6 py-2 text-sm font-medium rounded transition-colors ${!currentPassword || !allRequirementsMet || newPassword !== confirmPassword || isLoading
                            ? 'bg-[#414141] text-[#9ca3af] cursor-not-allowed'
                            : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                            }`}
                    >
                        {isLoading ? 'Changing...' : 'Confirm'}
                    </button>
                </div>
            </form>
        </div>
            )}

            {/* Success Snackbar - Rendered outside modal so it persists after modal closes */}
            <Snackbar
                open={showSnackbar}
                message="Password changed successfully!"
                onClose={() => setShowSnackbar(false)}
            />
        </>
    );
}
