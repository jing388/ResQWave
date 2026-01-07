import { useState, useEffect } from "react";
import { X, Mail, Phone, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ChangePasswordModal from "./ChangePasswordModal";
import ChangeEmailModal from "./ChangeEmailModal";
import ChangePhoneModal from "./ChangePhoneModal";

interface AccountSettingsModalProps {
    open: boolean;
    onClose: () => void;
}

export default function AccountSettingsModal({ open, onClose }: AccountSettingsModalProps) {
    const { user } = useAuth();
    const [phone, setPhone] = useState(""); // You can fetch this from user data if available
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPhoneModal, setShowPhoneModal] = useState(false);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open && !showPasswordModal && !showEmailModal && !showPhoneModal) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, showPasswordModal, showEmailModal, showPhoneModal, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/65 px-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl min-h-[400px] md:min-h-[600px] bg-[#1a1a1a] rounded-[6px] border border-[#404040] p-6 md:p-12 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-13 md:right-12 text-[#A3A3A3] hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <X size={20} className="md:w-[22px] md:h-[22px]" />
                </button>

                {/* Header */}
                <div className="mb-4 md:mb-6">
                    <h2 className="text-xl md:text-xl font-semibold text-white">Profile</h2>
                </div>

                {/* Profile Picture and Name */}
                <div className="flex flex-col items-center mb-4 md:mb-6">
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-[#404040] mb-3 md:mb-5 flex items-center justify-center">
                        <span className="text-[32px] md:text-[42px] font-bold text-[#9ca3af]">
                            {user?.name ? (() => {
                                const nameParts = user.name.trim().split(/\s+/);
                                if (nameParts.length >= 2) {
                                    return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
                                }
                                return nameParts[0].charAt(0).toUpperCase();
                            })() : "U"}
                        </span>
                    </div>
                    <h3 className="text-base md:text-lg font-semibold text-white mb-2">{user?.name || "User"}</h3>
                    <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-normal bg-[#414141] text-[#A3A3A3] border border-gray-500/30">
                        ID: {user?.id || "N/A"}
                    </span>
                </div>

                {/* Account Information */}
                <div className="mb-4 md:mb-6">
                    <h4 className="text-xs md:text-sm font-semibold text-white mb-2 md:mb-3">Account Information</h4>

                    {/* Email and Phone on same line */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {/* Email */}
                        <div className="py-4 px-[18px] bg-[#1f1f1f] rounded-[6px] border border-[#404040]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="bg-[#404040] p-3 rounded-[6px]">
                                        <Mail className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[13px] text-[#BABABA] block">Email</label>
                                        <p className="text-[13px] text-white">{user?.email || "Not set"}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowEmailModal(true)}
                                    className="ml-3 px-[13px] py-2 text-xs text-white hover:text-gray-300 transition-colors border border-[#404040] bg-[#262626] rounded hover:border-gray-400"
                                >
                                    Edit
                                </button>
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div className="py-4 px-[18px] bg-[#1f1f1f] rounded-[6px] border border-[#404040]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="bg-[#404040] p-3 rounded-[6px]">
                                        <Phone className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[13px] text-[#BABABA] block">Phone Number</label>
                                        <p className="text-[13px] text-white">{phone || "Not set"}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPhoneModal(true)}
                                    className="ml-3 px-[13px] py-2 text-xs text-white hover:text-gray-300 transition-colors border border-[#404040] bg-[#262626] rounded hover:border-gray-400"
                                >
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="mb-6 md:mb-8">
                    <h4 className="text-xs md:text-sm font-semibold text-white mb-2 md:mb-3">Security</h4>
                    <div className="py-4 px-[18px] bg-[#1f1f1f] rounded-[6px] border border-[#404040]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="bg-[#404040] p-3 rounded-[6px]">
                                    <Lock className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[13px] text-[#BABABA] block">Password</label>
                                    <p className="text-[13px] text-white">
                                        Last updated: {user?.passwordLastUpdated ? new Date(user.passwordLastUpdated).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="ml-3 px-[13px] py-2 text-xs text-white hover:text-gray-300 transition-colors border border-[#404040] bg-[#262626] rounded hover:border-gray-400"
                            >
                                Change
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-xs text-[#BABABA]">
                        Need help? Contact{" "}
                        <button
                            onClick={() => {
                                // TODO: Implement support contact functionality
                                console.log("Contact support");
                            }}
                            className="underline hover:text-white transition-colors"
                        >
                            support
                        </button>{" "}
                        for assistance with your account.
                    </p>
                </div>
            </div>

            {/* Password Change Modal */}
            <ChangePasswordModal
                open={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />

            {/* Email Change Modal */}
            <ChangeEmailModal
                open={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                currentEmail={user?.email || ""}
            />

            {/* Phone Change Modal */}
            <ChangePhoneModal
                open={showPhoneModal}
                onClose={() => setShowPhoneModal(false)}
                currentPhone={phone}
            />
        </div>
    );
}