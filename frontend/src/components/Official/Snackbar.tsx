import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SnackbarProps {
    open: boolean;
    message: string;
    onClose: () => void;
    duration?: number;
}

export default function Snackbar({ open, message, onClose, duration = 3000 }: SnackbarProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (open) {
            // Small delay to trigger the transition animation
            setTimeout(() => setIsVisible(true), 10);

            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300); // Wait for animation to complete
            }, duration);

            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [open, duration, onClose]);

    if (!open) return null;

    return (
        <div
            className={`fixed left-[30px] bottom-[30px] z-[100] transition-all duration-300 ease-out ${isVisible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
                }`}
        >
            <Alert className="min-w-[280px] max-w-[520px] bg-[#171717] border border-[#2a2a2a] text-white rounded-[5px] !items-center !grid-cols-[auto_1fr] !gap-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-green-600/25">
                    <CheckCircle2 className="size-5 text-[#22c55e]" />
                </div>
                <AlertDescription className="text-[13px] leading-tight">
                    {message}
                </AlertDescription>
            </Alert>
        </div>
    );
}
