import { useState, useEffect, useRef } from "react";
import { X, Edit, Archive, Trash2, Plus, RotateCcw, ChevronDown, Calendar, Pen } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DateTimePickerCustomized from '@/components/ui/datetime-picker-customized';
import { apiFetch } from "@/lib/api";

interface ActivityLogsModalProps {
    open: boolean;
    onClose: () => void;
}

interface LogEntry {
    time: string;
    action: string;
    entityType: string;
    entityID: string;
    entityName: string;
    dispatcherID: string;
    dispatcherName: string;
    message: string;
    timestamp: string;
    fields: Array<{
        field: string;
        oldValue: string;
        newValue: string;
    }>
}

interface DayLog {
    date: string;
    count: number;
    actions: LogEntry[];
}

export default function ActivityLogsModal({ open, onClose }: ActivityLogsModalProps) {
    const [selectedUser, setSelectedUser] = useState("All");
    const [selectedAction, setSelectedAction] = useState("All");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Reset filters when modal closes
    useEffect(() => {
        if (!open) {
            setSelectedUser("All");
            setSelectedAction("All");
            setFromDate("");
            setToDate("");
        }
    }, [open]);
    const [logs, setLogs] = useState<DayLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const [actionOpen, setActionOpen] = useState(false);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    const userRef = useRef<HTMLButtonElement | null>(null);
    const actionRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    // Helper to blur trigger when dropdown closes
    function handleOpenChange(open: boolean, ref: React.RefObject<HTMLButtonElement | null>, setOpen: (v: boolean) => void) {
        setOpen(open);
        if (!open) {
            setTimeout(() => {
                try {
                    const el = ref.current;
                    if (!el) return;
                    el.blur();
                    el.setAttribute('tabindex', '-1');
                    setTimeout(() => {
                        try { el.removeAttribute('tabindex'); } catch { /* ignore */ }
                    }, 350);
                } catch {
                    /* ignore */
                }
            }, 180);
        }
    }

    const users = ["All", "Admin", "Dispatcher", "Focal Person"];
    const actions = ["All", "Create", "Edit", "Archive", "Unarchive", "Delete"];

    useEffect(() => {
        if (open) {
            fetchLogs();
        }
    }, [open]);

    // Replace the fetchLogs function to use apiFetch
    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();

            if (selectedUser !== "All") {
                params.append("user", selectedUser);
            }

            if (selectedAction !== "All") {
                params.append("action", selectedAction);
            }

            if (fromDate) {
                params.append("from", new Date(fromDate).toISOString());
            }

            if (toDate) {
                params.append("to", new Date(toDate).toISOString());
            }

            const queryString = params.toString() ? `?${params.toString()}` : "";
            const data = await apiFetch(`/admin-logs${queryString}`);
            const parsedData = data as { days: DayLog[] };
            setLogs(parsedData.days || []);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = () => {
        let filteredLogs = [...logs];

        if (selectedUser !== "All") {
            filteredLogs = filteredLogs.map(day => ({
                ...day,
                actions: day.actions.filter(log => log.dispatcherName === selectedUser),
            })).filter(day => day.actions.length > 0);
        }

        if (selectedAction !== "All") {
            filteredLogs = filteredLogs.map(day => ({
                ...day,
                actions: day.actions.filter(log => log.action.toLowerCase() === selectedAction.toLowerCase()),
            })).filter(day => day.actions.length > 0);
        }

        if (fromDate) {
            const from = new Date(fromDate);
            filteredLogs = filteredLogs.map(day => ({
                ...day,
                actions: day.actions.filter(log => new Date(log.timestamp) >= from),
            })).filter(day => day.actions.length > 0);
        }

        if (toDate) {
            const to = new Date(toDate);
            filteredLogs = filteredLogs.map(day => ({
                ...day,
                actions: day.actions.filter(log => new Date(log.timestamp) <= to),
            })).filter(day => day.actions.length > 0);
        }

        return filteredLogs;
    };

    const filteredLogs = applyFilters();

    const getActionIcon = (action: string) => {
        if (action === "archive") {
            return <Archive className="w-4 h-4" />;
        }
        // All other actions use Pen
        return <Pen className="w-4 h-4" />;
    };

    const getActionText = (action: string) => {
        if (action === 'delete') {
            return 'permanently deleted';
        }
        return action === 'edit' ? 'edited' :
            action === 'archive' ? 'archived' :
                action === 'unarchive' ? 'unarchived' :
                    action === 'create' ? 'created' :
                        action === 'restore' ? 'restored' : action;
    };

    const formatDisplayDate = (isoString: string) => {
        if (!isoString) return 'Pick a date and time';
        const date = new Date(isoString);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        const year = date.getFullYear();
        let hour = date.getHours();
        const minute = date.getMinutes();
        const period = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${month} ${day}, ${year} ${hour}:${minute.toString().padStart(2, '0')} ${period}`;
    };

    const handleClearDate = () => {
        setFromDate("");
        setToDate("");
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/65 px-4 z-50"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="relative w-full max-w-4xl bg-[#171717] rounded-[6px] border border-[#404040] px-7 pt-8 pb-14 max-h-[75vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6">
                    <h2 className="text-xl font-semibold text-white">Activity Logs</h2>
                    <button
                        onClick={onClose}
                        className="text-[#A3A3A3] hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* User Filter */}
                        <div>
                            <label className="block text-xs text-[#BABABA] mb-2">User</label>
                            <DropdownMenu open={userOpen} onOpenChange={(v) => handleOpenChange(v, userRef, setUserOpen)}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        ref={userRef}
                                        className="flex items-center justify-between w-full gap-2 px-3 py-[7.5px] text-[13px] rounded-[5px] bg-[#262626] border border-[#3F3F3F] text-[#8b8b8b] hover:bg-[#313131] hover:border-[#6b7280] transition-colors cursor-pointer"
                                        aria-label="Select user"
                                        style={{ outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        <span className={selectedUser !== 'All' ? 'text-[#cfcfcf]' : ''}>{selectedUser}</span>
                                        <ChevronDown size={16} style={{ color: '#8b8b8b', transform: userOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms' }} />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="z-[99999] bg-[#171717] border border-[#2b2b2b] text-[#cfcfcf] min-w-0 p-0"
                                    style={{ width: userRef.current ? userRef.current.offsetWidth : undefined }}
                                >
                                    {users.map((u) => (
                                        <DropdownMenuItem key={u} onClick={() => { setSelectedUser(u); setUserOpen(false); }}>{u}</DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Action Filter */}
                        <div>
                            <label className="block text-xs text-[#BABABA] mb-2">Action</label>
                            <DropdownMenu open={actionOpen} onOpenChange={(v) => handleOpenChange(v, actionRef, setActionOpen)}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        ref={actionRef}
                                        className="flex items-center justify-between w-full gap-2 px-3 py-[7.5px] text-[13px] rounded-[5px] bg-[#262626] border border-[#3F3F3F] text-[#8b8b8b] hover:bg-[#313131] hover:border-[#6b7280] transition-colors cursor-pointer"
                                        aria-label="Select action"
                                        style={{ outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        <span className={selectedAction !== 'All' ? 'text-[#cfcfcf]' : ''}>{selectedAction}</span>
                                        <ChevronDown size={16} style={{ color: '#8b8b8b', transform: actionOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms' }} />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="z-[99999] bg-[#171717] border border-[#2b2b2b] text-[#cfcfcf] min-w-0 p-0"
                                    style={{ width: actionRef.current ? actionRef.current.offsetWidth : undefined }}
                                >
                                    {actions.map((a) => (
                                        <DropdownMenuItem key={a} onClick={() => { setSelectedAction(a); setActionOpen(false); }}>{a}</DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* From Date */}
                        <div>
                            <label className="block text-xs text-[#BABABA] mb-2">From</label>
                            <button
                                onClick={() => setShowFromPicker(true)}
                                className="w-full bg-[#262626] text-[#8b8b8b] text-sm px-3 py-2 pr-10 rounded-[5px] border border-[#3F3F3F] hover:bg-[#313131] hover:border-[#6b7280] transition-colors cursor-pointer text-left relative"
                                style={{ fontSize: 13, fontWeight: 500 }}
                            >
                                <span className={`block truncate ${fromDate ? 'text-[#cfcfcf]' : ''}`}>{formatDisplayDate(fromDate)}</span>
                                <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8b8b]" />
                            </button>
                        </div>

                        {/* To Date */}
                        <div>
                            <label className="block text-xs text-[#BABABA] mb-2">To</label>
                            <button
                                onClick={() => setShowToPicker(true)}
                                className="w-full bg-[#262626] text-[#8b8b8b] text-sm px-3 py-2 pr-10 rounded-[5px] border border-[#3F3F3F] hover:bg-[#313131] hover:border-[#6b7280] transition-colors cursor-pointer text-left relative"
                                style={{ fontSize: 13, fontWeight: 500 }}
                            >
                                <span className={`block truncate ${toDate ? 'text-[#cfcfcf]' : ''}`}>{formatDisplayDate(toDate)}</span>
                                <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8b8b]" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Logs Content */}
                <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: '45vh', minHeight: '45vh' }}>
                    {isLoading ? (
                        <div className="text-center text-[#BABABA] py-8">Loading logs...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center text-[#BABABA] py-8">No activity logs found</div>
                    ) : (
                        <div className="space-y-6">
                            {filteredLogs.map((day, dayIndex) => (
                                <div key={dayIndex}>
                                    {/* Date Header */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className="text-sm font-medium text-white">
                                            {(() => {
                                                const date = new Date(day.date);
                                                const day_num = date.getDate();
                                                const month = date.toLocaleDateString('en-US', { month: 'long' });
                                                const year = date.getFullYear();
                                                return `${day_num} ${month} ${year}`;
                                            })()}
                                        </h3>
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="flex items-center justify-center w-6 h-4 rounded-full bg-white text-black text-xs font-medium">
                                                {day.count}
                                            </span>
                                            <div className="flex-1 h-[1px] bg-[#404040]"></div>
                                        </div>
                                    </div>

                                    {/* Log Entries */}
                                    <div className="space-y-1">
                                        {day.actions.map((log, logIndex) => (
                                            <div
                                                key={logIndex}
                                                className={`${logIndex % 2 === 0 ? 'bg-[#1D1D1D]' : 'bg-transparent'} border-none rounded-[6px] p-4`}
                                            >
                                                {/* Header with Icon and Main Text */}
                                                <div className="flex items-center gap-3 justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {/* Icon */}
                                                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[#737373]">
                                                            {getActionIcon(log.action)}
                                                        </div>
                                                        {/* Main message */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-white font-medium">
                                                                {log.dispatcherName}
                                                            </span>
                                                            <span className="text-sm text-[#BABABA]">
                                                                {getActionText(log.action)} {log.entityType.toLowerCase()} <span className="text-white font-medium">"{log.entityName}"</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Time */}
                                                    <span className="text-xs text-[#BABABA] whitespace-nowrap">
                                                        {log.time}
                                                    </span>
                                                </div>

                                                {/* Only show field changes (radar dots) for 'edit' */}
                                                {log.action === 'edit' && log.fields.length > 0 && (
                                                    <div className="mt-2 space-y-1.5">
                                                        {log.fields.map((field, fieldIndex) => (
                                                            <div key={fieldIndex} className="flex items-center text-xs">
                                                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center relative">
                                                                    <span className="absolute w-3 h-3 rounded-full bg-[#737373] opacity-20"></span>
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#737373]"></span>
                                                                </span>
                                                                <span className="text-[#BABABA] ml-3">{field.field}</span>
                                                                <span className="text-[#BABABA] ml-1">from</span>
                                                                <span className="text-white font-medium ml-1">{field.oldValue}</span>
                                                                <span className="text-[#BABABA] ml-1">to</span>
                                                                <span className="text-white font-medium ml-1">{field.newValue}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* DateTime Pickers */}
            <DateTimePickerCustomized
                open={showFromPicker}
                onClose={() => setShowFromPicker(false)}
                onApply={(isoString) => setFromDate(isoString)}
                onClear={handleClearDate} // Added onClear handler
                initialValue={fromDate}
            />
            <DateTimePickerCustomized
                open={showToPicker}
                onClose={() => setShowToPicker(false)}
                onApply={(isoString) => setToDate(isoString)}
                onClear={handleClearDate} // Added onClear handler
                initialValue={toDate}
            />
        </div>
    );
}
