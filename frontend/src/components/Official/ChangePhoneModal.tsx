import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface ChangePhoneModalProps {
    open: boolean;
    onClose: () => void;
    currentPhone: string;
}

export default function ChangePhoneModal({ open, onClose, currentPhone }: ChangePhoneModalProps) {
    const [phone, setPhone] = useState("");

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open) {
                handleClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [open]);

    if (!open) return null;

    const isValidPhone = (phone: string) => {
        // Basic phone validation - adjust regex as needed for your requirements
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phoneRegex.test(phone) && phone.length >= 10;
    };

    const isPhoneValid = isValidPhone(phone) && phone !== currentPhone;

    const handleConfirm = () => {
        if (isPhoneValid) {
            // TODO: Implement phone update API call
            console.log("Updating phone to:", phone);
            handleClose();
        }
    };

    const handleClose = () => {
        setPhone("");
        onClose();
    };

    return (
        <div
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-[6px] px-8 md:px-4"
            onClick={(e) => {
                e.stopPropagation();
                handleClose();
            }}
        >
            <div
                className="relative w-full max-w-[560px] min-h-[200px] bg-[#171717] rounded-[6px] border border-[#404040] py-6 px-6 md:py-10 md:px-11 flex flex-col justify-center max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-4 md:mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm md:text-base font-semibold text-white mb-1">Change Phone Number</h3>
                        <p className="text-xs md:text-[13px] text-[#A3A3A3]">Enter a new valid phone number to continue.</p>
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

                {/* Phone Input */}
                <div className="mb-1">
                    <label className="block text-[13px] text-white mb-2">Phone Number</label>
                    <div className="relative">
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={currentPhone || "Enter phone number"}
                            className="w-full bg-[#171717] text-white text-sm px-3 py-2.5 rounded-[5px] border border-[#404040] focus:outline-none focus:border-[#4a4a4a]"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Confirm Button */}
                <div className="flex justify-end mt-6">
                    <button
                        onClick={handleConfirm}
                        disabled={!isPhoneValid}
                        className={`px-6 py-2 text-sm font-medium rounded transition-colors ${!isPhoneValid
                            ? 'bg-[#414141] text-[#9ca3af] cursor-not-allowed'
                            : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                            }`}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
