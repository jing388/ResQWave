import { apiFetch } from '@/pages/Official/Reports/api/api';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ChevronDown, RefreshCw, Search } from 'lucide-react';

type ActivityLogModalProps = {
    open: boolean;
    onClose: () => void;
    center?: { x: number; y: number } | null;
};

export type ActivityLogModalHandle = {
    refresh: () => void;
};


// Helper to group days by month for frontend rendering
interface LogField {
    field: string;
    oldValue: string;
    newValue: string;
}
interface LogAction {
    time: string;
    actorName: string;
    entityType: string;
    message: string;
    createdAt: string;
    fields: LogField[];
}
interface LogDay {
    date: string;
    count: number;
    actions: LogAction[];
}
interface MonthGroup {
    monthLabel: string;
    days: { dayLabel: string; actions: LogAction[]; count: number }[];
}
function groupDaysByMonth(days: LogDay[]): MonthGroup[] {
    const months: { [monthLabel: string]: LogDay[] } = {};
    days.forEach((day: LogDay) => {
        const d = new Date(day.date);
        const monthLabel = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
        if (!months[monthLabel]) months[monthLabel] = [];
        months[monthLabel].push(day);
    });
    return Object.entries(months).map(([monthLabel, days]) => ({
        monthLabel, days: (days as LogDay[]).map((day: LogDay) => ({
            dayLabel: new Date(day.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
            actions: day.actions,
            count: day.count,
        }))
    }));
}

const ActivityLogModal = forwardRef<ActivityLogModalHandle, ActivityLogModalProps>(({ open, onClose, center = null }, ref) => {
    const [activityLogs, setActivityLogs] = useState<MonthGroup[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ANIM_MS = 220;
    const [mounted, setMounted] = useState<boolean>(open);
    const [visible, setVisible] = useState<boolean>(open);
    useEffect(() => {
        if (open) {
            setMounted(true);
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
            const t = setTimeout(() => setMounted(false), ANIM_MS);
            return () => clearTimeout(t);
        }
    }, [open]);

    const [selectedMonth, setSelectedMonth] = useState<string>('Month');
    const [selectedYear, setSelectedYear] = useState<string>('Year');
    const [monthOpen, setMonthOpen] = useState(false);
    const [yearOpen, setYearOpen] = useState(false);
    // State to control PDF modal
    // Optionally, you could store the PDF path or report id if needed for dynamic PDFs
    const monthRef = useRef<HTMLButtonElement | null>(null);
    const yearRef = useRef<HTMLButtonElement | null>(null);
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const years = (() => {
        const y = new Date().getFullYear();
        const range = 6; // current year and previous 5 years
        return Array.from({ length: range }, (_, i) => String(y - i));
    })();

    // State for expand/collapse of months and days (allow multiple open)
    const [expandedMonth, setExpandedMonth] = useState<string[]>([]);
    const [expandedDay, setExpandedDay] = useState<string[]>([]);
    // Track expanded actions per day (keyed by dayLabel, value is array of open indices)
    const [expandedAction, setExpandedAction] = useState<{ [dayLabel: string]: number[] }>({});
    const [query, setQuery] = useState('');


    // Helper to blur trigger when dropdown closes so focus ring/active state is removed
    function handleOpenChange(open: boolean, ref: React.RefObject<HTMLButtonElement | null>, setOpen: (v: boolean) => void) {
        setOpen(open);
        if (!open) {
            // Radix may re-focus the trigger after closing; delay and then blur + temporarily remove tabindex
            setTimeout(() => {
                try {
                    const el = ref.current;
                    if (!el) return;
                    el.blur();
                    // prevent immediate refocus by temporarily removing it from tab order
                    el.setAttribute('tabindex', '-1');
                    // restore tabindex shortly after so keyboard users can still tab to it later
                    setTimeout(() => {
                        try { el.removeAttribute('tabindex'); } catch { /* ignore */ }
                    }, 350);
                } catch {
                    /* ignore */
                }
            }, 180);
        }
    }

    // Fetch logs from backend
    // notify: if true, will emit a dashboard saved-toast after successful refresh
    const fetchLogs = (notify = false) => {
        setLoading(true);
        setError(null);
        apiFetch<{ lastUpdated?: string; days?: LogDay[] }>('/logs/own')
            .then((data) => {
                setLastUpdated(data.lastUpdated || null);
                const grouped = groupDaysByMonth(data.days || []);
                setActivityLogs(grouped);
                // Set default expanded month/day
                if (grouped.length > 0) setExpandedMonth([grouped[0].monthLabel]);
                if (grouped[0]?.days?.length > 0) setExpandedDay([grouped[0].days[0].dayLabel]);

                // Only notify when explicitly requested (e.g., user clicked Refresh)
                if (notify && typeof window !== 'undefined') {
                    try {
                        window.dispatchEvent(new CustomEvent('dashboard:show-saved', { detail: { message: 'Refreshed successfully!', showViewLogs: false } }));
                    } catch {
                        // ignore if CustomEvent isn't available
                    }
                }
            })
            .catch((err) => setError(err.message || 'Failed to load logs'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!open) return;
        fetchLogs();
    }, [open]);

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
        // parent-invoked refresh should not show the toast by default
        refresh: () => fetchLogs(false),
    }));

    // Filtered logs by search (date string), month, and year
    const filteredLogs = useMemo(() => {
        let logs = activityLogs;

        // Filter by month and year if selected
        if (selectedMonth !== 'Month' || selectedYear !== 'Year') {
            logs = logs.map((month: MonthGroup) => {
                // Check if this month matches the filter
                const monthMatches = selectedMonth === 'Month' || month.monthLabel.includes(selectedMonth);
                const yearMatches = selectedYear === 'Year' || month.monthLabel.includes(selectedYear);

                if (monthMatches && yearMatches) {
                    return month;
                }
                return { ...month, days: [] }; // Empty days if month doesn't match
            }).filter((month) => month.days.length > 0);
        }

        // Then filter by search query
        if (!query.trim()) return logs;
        const q = query.trim().toLowerCase();
        return logs.map((month: MonthGroup) => ({
            ...month,
            days: month.days
                .map((day) => ({
                    ...day,
                    actions: day.actions,
                }))
                .filter((day) => day.dayLabel.toLowerCase().includes(q))
        })).filter((month) => month.days.length > 0);
    }, [query, activityLogs, selectedMonth, selectedYear]);

    if (!mounted) return null;


    const baseStyle: React.CSSProperties = {
        width: 'min(780px, 96%)',
        height: '85vh',
        minHeight: 80,
        overflow: 'hidden',
        background: '#0d0d0d',
        color: '#fff',
        borderRadius: 7,
        padding: '62px 75px',
        display: 'flex',
        flexDirection: 'column',
    };
    const modalStyle: React.CSSProperties = center
        ? { ...baseStyle, position: 'fixed', left: center.x, top: center.y, transform: 'translate(-50%, -50%)', background: '#171717' }
        : { ...baseStyle, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#171717' };
    const overlayStyle: React.CSSProperties = {
        position: 'fixed', inset: 0,
        background: visible ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        zIndex: 'var(--z-popover)',
        transition: `background ${ANIM_MS}ms ease`,
        pointerEvents: visible ? 'auto' : 'none',
    };
    const animatedModalStyle: React.CSSProperties = {
        ...modalStyle,
        opacity: visible ? 1 : 0,
        transform: center
            ? `translate(-50%, -50%) translateY(${visible ? '0' : '-8px'})`
            : `${visible ? 'translateY(0)' : 'translateY(-8px)'}`,
        transition: `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms cubic-bezier(.2,.9,.2,1)`,
    };

    return (
        <>
            <div style={overlayStyle}>
                <div style={animatedModalStyle}>
                    <style>{`
                    .history-modal-list::-webkit-scrollbar{display:none;}
                    .history-modal-list{ -webkit-overflow-scrolling: touch; }
                    .history-group-body{ -webkit-overflow-scrolling: touch; }
                `}</style>
                    {/* Exit and Refresh buttons */}
                    <div style={{ position: 'absolute', right: 35, top: 30, display: 'flex', gap: 20 }}>
                        <button
                            onClick={() => fetchLogs(true)}
                            aria-label="Refresh"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#BABABA',
                                fontSize: 19,
                                cursor: 'pointer',
                                marginRight: 2,
                                transition: 'color 0.18s, transform 0.18s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                            }}
                            title="Refresh activity logs"
                            onMouseEnter={e => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = '#BABABA';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <RefreshCw size={17} />
                        </button>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#BABABA',
                                fontSize: 18,
                                cursor: 'pointer',
                                transition: 'color 0.18s, transform 0.18s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.transform = 'scale(1.01)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = '#BABABA';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2 }}>
                        <h2 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: 0.6 }}>Activity Logs</h2>
                        <div style={{ color: '#BABABA', fontSize: 14, fontWeight: 400 }}>
                            Last Updated: {lastUpdated ? new Date(lastUpdated).toLocaleString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '—'}
                        </div>
                    </div>

                    {/* Controls: search + filters */}
                    <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', zIndex: 2 }}>
                        <div style={{ position: 'relative', flex: 2 }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8b8b8b' }} />
                            <Input
                                value={query}
                                onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                                placeholder="Search Reports by Date"
                                className="w-full bg-[#262626] border-[#404040] text-[#BABABA] placeholder:text-[#BABABA] placeholder:font-light pl-10 pr-3 py-5 rounded-md"
                            />
                        </div>
                        <DropdownMenu open={monthOpen} onOpenChange={(v) => handleOpenChange(v, monthRef, setMonthOpen)}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    ref={monthRef}
                                    className="flex items-center justify-between min-w-[100px] gap-2 px-3 py-[9px] rounded-md bg-[#262626] border border-[#404040] text-[#cfcfcf] hover:bg-[#313131] hover:border-[#6b7280] transition-colors cursor-pointer"
                                    aria-label="Select month"
                                    style={{ outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <span style={{ fontSize: 14, fontWeight: 500 }}>{selectedMonth}</span>
                                    <ChevronDown size={16} style={{ color: '#8b8b8b', transform: monthOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms' }} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent style={{ minWidth: "100px" }} className="z-[99999] bg-[#171717] border border-[#2b2b2b] text-[#cfcfcf]">
                                {months.map((m) => (
                                    <DropdownMenuItem key={m} onClick={() => { setSelectedMonth(m); setMonthOpen(false); }}>{m}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu open={yearOpen} onOpenChange={(v) => handleOpenChange(v, yearRef, setYearOpen)}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    ref={yearRef}
                                    className="flex items-center justify-between min-w-[80px] gap-2 px-3 py-[9px] rounded-md bg-[#262626] border border-[#404040] text-[#cfcfcf] hover:bg-[#313131] hover:border-[#6b7280] transition-colors cursor-pointer"
                                    aria-label="Select year"
                                    style={{ outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <span style={{ fontSize: 14, fontWeight: 500 }}>{selectedYear}</span>
                                    <ChevronDown size={16} style={{ color: '#8b8b8b', transform: yearOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms' }} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent style={{ minWidth: "80px" }} className="z-[99999] bg-[#171717] border border-[#2b2b2b] text-[#cfcfcf]">
                                {years.map((y) => (
                                    <DropdownMenuItem key={y} onClick={() => { setSelectedYear(y); setYearOpen(false); }}>{y}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                    </div>

                    {/* Scrollable data list - only this area scrolls */}
                    <div
                        className="history-modal-list"
                        style={{
                            marginTop: 18,
                            display: 'grid',
                            gap: 12,
                            overflowY: 'auto',
                            maxHeight: 'calc(85vh - 260px)',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            paddingRight: 6,
                        }}
                    >
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36, gap: 12, color: '#cfcfcf' }}>Loading activity logs...</div>
                        ) : error ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36, gap: 12, color: '#ff6b6b' }}>{error}</div>
                        ) : filteredLogs.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 36, gap: 12, color: '#cfcfcf' }}>
                                <svg width="36" height="36" fill="none" stroke="#8b8b8b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="16" /><line x1="32" y1="32" x2="25" y2="25" /></svg>
                                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 6, color: '#fff' }}>No activity logs</div>
                                <div style={{ fontSize: 13, maxWidth: 420, textAlign: 'center', color: '#cfcfcf' }}>There are no activity logs for your community. Try widening the date range or clearing filters.</div>
                                {(selectedMonth !== 'Month' || selectedYear !== 'Year' || query.trim()) && (
                                    <button
                                        onClick={() => {
                                            setSelectedMonth('Month');
                                            setSelectedYear('Year');
                                            setQuery('');
                                        }}
                                        style={{
                                            marginTop: 16,
                                            padding: '10px 24px',
                                            background: 'transparent',
                                            border: '1px solid #404040',
                                            borderRadius: 6,
                                            color: '#fff',
                                            fontSize: 14,
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#262626';
                                            e.currentTarget.style.borderColor = '#6b7280';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.borderColor = '#404040';
                                        }}
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        ) : filteredLogs.map(month => {
                            const monthExpanded = expandedMonth.includes(month.monthLabel);
                            return (
                                <div key={month.monthLabel} style={{ display: 'grid', gap: 10 }}>
                                    <button
                                        onClick={() => setExpandedMonth(prev => prev.includes(month.monthLabel)
                                            ? prev.filter(m => m !== month.monthLabel)
                                            : [...prev, month.monthLabel])}
                                        aria-expanded={monthExpanded}
                                        aria-label={monthExpanded ? 'Collapse month' : 'Expand month'}
                                        style={{
                                            width: '100%',
                                            background: '#ffffff',
                                            color: '#111111',
                                            padding: '9px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            border: '1px solid rgba(0,0,0,0.08)',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: 15.7,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span>{month.monthLabel}</span>
                                            <span style={{ background: '#111111', color: '#fff', borderRadius: 999, padding: '1px 11px', fontSize: 12 }}>{month.days.length}</span>
                                        </div>
                                        <svg width="30" height="30" style={{ transform: monthExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 160ms', color: '#111' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                    </button>
                                    {monthExpanded && month.days.map((day: { dayLabel: string; actions: LogAction[]; count: number }) => {
                                        const dayExpanded = expandedDay.includes(day.dayLabel);
                                        return (
                                            <div key={day.dayLabel} style={{ display: 'grid', gap: 10 }}>
                                                <button
                                                    onClick={() => setExpandedDay(prev => prev.includes(day.dayLabel)
                                                        ? prev.filter(d => d !== day.dayLabel)
                                                        : [...prev, day.dayLabel])}
                                                    aria-expanded={dayExpanded}
                                                    aria-label={dayExpanded ? 'Collapse day' : 'Expand day'}
                                                    style={{
                                                        width: '100%',
                                                        background: '#232323',
                                                        color: '#fff',
                                                        padding: '9px 16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        border: '1px solid #333',
                                                        cursor: 'pointer',
                                                        fontWeight: 500,
                                                        fontSize: 15,
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <span>{day.dayLabel}</span>
                                                        <span style={{ background: '#fff', color: '#111', borderRadius: 999, padding: '1px 11px', fontSize: 12 }}>{day.actions.length}</span>
                                                    </div>
                                                    <svg width="30" height="30" style={{ transform: dayExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 160ms', color: '#fff' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                                </button>
                                                {dayExpanded && (
                                                    <div style={{ background: '#171717', border: '1px solid #333', padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        {day.actions.map((action: LogAction, idx: number) => {
                                                            const isExpanded = Array.isArray(expandedAction[day.dayLabel]) && expandedAction[day.dayLabel].includes(idx);
                                                            return (
                                                                <div key={idx} style={{ paddingBottom: '5px', marginTop: 5, borderBottom: idx !== day.actions.length - 1 ? '1px solid #232323' : 'none' }}>
                                                                    <div
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'space-between',
                                                                            cursor: 'pointer',
                                                                            height: 52,
                                                                            minHeight: 52,
                                                                            maxHeight: 52,
                                                                            boxSizing: 'border-box',
                                                                            marginTop: 4,
                                                                            marginBottom: 4,
                                                                            padding: '0px 8px',
                                                                        }}
                                                                        onClick={() => setExpandedAction(prev => {
                                                                            const arr = Array.isArray(prev[day.dayLabel]) ? [...prev[day.dayLabel]] : [];
                                                                            if (arr.includes(idx)) {
                                                                                // Remove idx
                                                                                return { ...prev, [day.dayLabel]: arr.filter(i => i !== idx) };
                                                                            } else {
                                                                                // Add idx
                                                                                return { ...prev, [day.dayLabel]: [...arr, idx] };
                                                                            }
                                                                        })}
                                                                        aria-expanded={isExpanded}
                                                                        aria-label={isExpanded ? 'Collapse action' : 'Expand action'}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, overflow: 'hidden', marginBottom: 4 }}>
                                                                            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid #BABABA', marginRight: 10, flexShrink: 0 }}></span>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%', overflow: 'hidden' }}>
                                                                                <span style={{ fontWeight: 400, fontSize: 15 }}>{action.actorName || 'User'} {action.message || ''}</span>
                                                                                <span style={{ fontSize: 13, color: '#BABABA', marginTop: 3, background: '#232323', borderRadius: 8, padding: '2px 10px', fontWeight: 500, whiteSpace: 'nowrap', alignSelf: 'flex-start', marginLeft: 0 }}>{action.fields.length} change{action.fields.length > 1 ? 's' : ''} made</span>
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                                            <div style={{ fontWeight: 400, fontSize: 15, color: '#BABABA', minWidth: 48, textAlign: 'right' }}>{action.time}</div>
                                                                            <svg width="24" height="24" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 160ms', color: '#BABABA' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                                                        </div>
                                                                    </div>
                                                                    {isExpanded && (
                                                                        <div
                                                                            style={{
                                                                                marginTop: 10,
                                                                                marginBottom: 10,
                                                                                marginLeft: 32,
                                                                                background: 'transparent',
                                                                                borderRadius: 6,
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                gap: 0,
                                                                            }}
                                                                        >
                                                                            {action.fields.map((field: LogField, fidx: number) => {
                                                                                // Helper function to check if value is an array or comma-separated string
                                                                                const parseArrayValue = (value: string) => {
                                                                                    if (!value) return null;
                                                                                    // Try parsing as JSON array first
                                                                                    try {
                                                                                        const parsed = JSON.parse(value);
                                                                                        if (Array.isArray(parsed)) {
                                                                                            return parsed;
                                                                                        }
                                                                                    } catch {
                                                                                        // Not JSON, check if it's comma-separated
                                                                                    }
                                                                                    // Check if it contains commas (likely comma-separated list)
                                                                                    if (value.includes(',')) {
                                                                                        return value.split(',').map(item => item.trim()).filter(Boolean);
                                                                                    }
                                                                                    return null;
                                                                                };

                                                                                const oldArray = parseArrayValue(field.oldValue);
                                                                                const newArray = parseArrayValue(field.newValue);

                                                                                // If both are arrays, display as bullet lists
                                                                                if (oldArray !== null || newArray !== null) {
                                                                                    return (
                                                                                        <div
                                                                                            key={fidx}
                                                                                            style={{
                                                                                                display: 'flex',
                                                                                                borderRadius: 6,
                                                                                                padding: '4px 0',
                                                                                                gap: 10,
                                                                                            }}
                                                                                        >
                                                                                            <div style={{ minWidth: 140, fontWeight: 400, color: '#BABABA', fontSize: 14 }}>
                                                                                                {field.field}:
                                                                                            </div>
                                                                                            <div style={{ display: 'flex', gap: 20, flex: 1 }}>
                                                                                                {oldArray && (
                                                                                                    <div style={{ flex: 1 }}>
                                                                                                        <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 13, fontWeight: 400, marginBottom: 4 }}>
                                                                                                            {oldArray.length === 0 ? 'None' : ''}
                                                                                                        </div>
                                                                                                        <ul style={{ margin: 0, paddingLeft: 0, textDecoration: 'line-through', color: '#888', fontSize: 13, listStyleType: 'disc' }}>
                                                                                                            {oldArray.map((item, i) => (
                                                                                                                <li key={i} style={{ display: 'list-item' }}>{item}</li>
                                                                                                            ))}
                                                                                                        </ul>
                                                                                                    </div>
                                                                                                )}
                                                                                                {newArray && (
                                                                                                    <div style={{ flex: 1 }}>
                                                                                                        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>
                                                                                                            {newArray.length === 0 ? 'None' : ''}
                                                                                                        </div>
                                                                                                        <ul style={{ margin: 0, paddingLeft: 20, fontWeight: 500, fontSize: 14, listStyleType: 'disc', color: '#fff' }}>
                                                                                                            {newArray.map((item, i) => (
                                                                                                                <li key={i} style={{ display: 'list-item' }}>{item}</li>
                                                                                                            ))}
                                                                                                        </ul>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                // Default display for non-array fields
                                                                                return (
                                                                                    <div
                                                                                        key={fidx}
                                                                                        style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            borderRadius: 6,
                                                                                            padding: '4px 0',
                                                                                        }}
                                                                                    >
                                                                                        <div style={{ minWidth: 140, fontWeight: 400, color: '#BABABA', fontSize: 14 }}>
                                                                                            {field.field}:
                                                                                        </div>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                                            <span style={{
                                                                                                textDecoration: 'line-through',
                                                                                                color: '#888',
                                                                                                fontSize: 13,
                                                                                                fontWeight: 400,
                                                                                                marginRight: 6,
                                                                                            }}>
                                                                                                {field.oldValue}
                                                                                            </span>
                                                                                            <span style={{
                                                                                                fontWeight: 500,
                                                                                                fontSize: 14,
                                                                                            }}>
                                                                                                {field.newValue}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
});

export default ActivityLogModal;

