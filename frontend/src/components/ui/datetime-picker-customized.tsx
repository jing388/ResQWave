import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";

interface DateTimePickerCustomizedProps {
    open: boolean;
    onClose: () => void;
    onApply: (isoString: string) => void;
    onClear?: () => void; // Added onClear prop
    initialValue?: string;
}

export default function DateTimePickerCustomized({
    open,
    onClose,
    onApply,
    onClear,
    initialValue
}: DateTimePickerCustomizedProps) {
    const [tempDate, setTempDate] = useState<Date>(new Date());
    const [tempTime, setTempTime] = useState({ hour: 12, minute: 0, period: 'AM' as 'AM' | 'PM' });

    useEffect(() => {
        if (open) {
            if (initialValue) {
                const date = new Date(initialValue);
                setTempDate(date);
                const hour = date.getHours();
                setTempTime({
                    hour: hour % 12 || 12,
                    minute: date.getMinutes(),
                    period: hour >= 12 ? 'PM' : 'AM'
                });
            } else {
                setTempDate(new Date());
                setTempTime({ hour: 12, minute: 0, period: 'AM' });
            }
        }
    }, [open, initialValue]);

    const applyDateTime = () => {
        const finalDate = new Date(tempDate);
        let hour = tempTime.hour;
        if (tempTime.period === 'PM' && hour !== 12) hour += 12;
        if (tempTime.period === 'AM' && hour === 12) hour = 0;
        finalDate.setHours(hour, tempTime.minute);

        const isoString = finalDate.toISOString().slice(0, 16);
        onApply(isoString);
        onClose();
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { firstDay, daysInMonth };
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative bg-[#171717] rounded-lg border border-[#404040] p-4 w-[320px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium text-sm">Select Date & Time</h3>
                    <button onClick={onClose} className="text-[#A3A3A3] hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Month/Year Selector */}
                <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setTempDate(new Date(tempDate.getFullYear(), tempDate.getMonth() - 1))} className="text-[#A3A3A3] hover:text-white p-1">
                        <ChevronDown className="rotate-90" size={16} />
                    </button>
                    <span className="text-white font-medium text-sm">
                        {tempDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <button onClick={() => setTempDate(new Date(tempDate.getFullYear(), tempDate.getMonth() + 1))} className="text-[#A3A3A3] hover:text-white p-1">
                        <ChevronDown className="-rotate-90" size={16} />
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="mb-3">
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-center text-xs text-[#737373] font-medium py-1">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {(() => {
                            const { firstDay, daysInMonth } = getDaysInMonth(tempDate);
                            const days = [];
                            for (let i = 0; i < firstDay; i++) {
                                days.push(<div key={`empty-${i}`} className="h-7"></div>);
                            }
                            for (let day = 1; day <= daysInMonth; day++) {
                                const isSelected = tempDate.getDate() === day;
                                const isToday = new Date().getDate() === day && new Date().getMonth() === tempDate.getMonth() && new Date().getFullYear() === tempDate.getFullYear();
                                days.push(
                                    <button
                                        key={day}
                                        onClick={() => setTempDate(new Date(tempDate.getFullYear(), tempDate.getMonth(), day))}
                                        className={`h-7 text-xs rounded ${isSelected ? 'bg-[#3B82F6] text-white' : isToday ? 'bg-[#262626] text-white' : 'text-[#cfcfcf] hover:bg-[#262626]'}`}
                                    >
                                        {day}
                                    </button>
                                );
                            }
                            return days;
                        })()}
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-[#404040] my-3"></div>

                {/* Time Selector */}
                <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs text-white font-medium">Time</div>
                    <div className="flex items-center gap-1.5">
                        <input
                            type="number"
                            min="1"
                            max="12"
                            value={tempTime.hour}
                            onChange={(e) => setTempTime({ ...tempTime, hour: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) })}
                            className="w-10 bg-[#262626] text-white text-center py-1 text-xs rounded border border-[#404040] focus:outline-none focus:border-[#6b7280] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="text-white text-xs">:</span>
                        <input
                            type="number"
                            min="0"
                            max="59"
                            value={tempTime.minute.toString().padStart(2, '0')}
                            onChange={(e) => setTempTime({ ...tempTime, minute: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                            className="w-10 bg-[#262626] text-white text-center py-1 text-xs rounded border border-[#404040] focus:outline-none focus:border-[#6b7280] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <div className="flex gap-1 ml-1">
                            <button
                                onClick={() => setTempTime({ ...tempTime, period: 'AM' })}
                                className={`px-2 py-1 rounded text-xs ${tempTime.period === 'AM' ? 'bg-[#3B82F6] text-white' : 'bg-[#262626] text-[#cfcfcf] hover:bg-[#313131]'}`}
                            >
                                AM
                            </button>
                            <button
                                onClick={() => setTempTime({ ...tempTime, period: 'PM' })}
                                className={`px-2 py-1 rounded text-xs ${tempTime.period === 'PM' ? 'bg-[#3B82F6] text-white' : 'bg-[#262626] text-[#cfcfcf] hover:bg-[#313131]'}`}
                            >
                                PM
                            </button>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t border-[#404040] pt-3 mt-3 flex gap-2 justify-end">
                    <button
                        onClick={() => {
                            setTempDate(new Date());
                            setTempTime({ hour: 12, minute: 0, period: 'AM' });
                            if (onClear) onClear(); // Call onClear if defined
                            onClose();
                        }}
                        className="px-3 py-1.5 text-xs bg-transparent border border-[#404040] text-[#cfcfcf] rounded hover:bg-[#262626] hover:border-[#6b7280] transition-colors font-medium"
                    >
                        Clear
                    </button>
                    <button
                        onClick={applyDateTime}
                        className="px-4 py-2 text-xs font-medium rounded transition-colors bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
