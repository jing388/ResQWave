import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { exportToPdf } from '../utils/exportUtils';
import type { ExportData } from '../utils/exportUtils';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { ReportGroup, ReportItem } from '../types/history';
import { useAggregatedRescueReports, type RescueReport } from '../hooks/useAggregatedRescueReports';


type HistoryModalProps = {
    open: boolean;
    onClose: () => void;
    center?: { x: number; y: number } | null;
};

// Fetch aggregated rescue reports from backend
function groupReportsByMonth(reports: RescueReport[]): ReportGroup[] {
    // Group by month/year
    const groups: { [key: string]: ReportGroup } = {};
    reports.forEach((r) => {
        const date = r.rescueCompleted && r.prfCompletedAt ? new Date(r.prfCompletedAt) : (r.timeOfRescue ? new Date(r.timeOfRescue) : null);
        if (!date) return;
        const monthLabel = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        if (!groups[monthLabel]) {
            groups[monthLabel] = { monthLabel, count: 0, items: [] };
        }
        groups[monthLabel].items.push({
            id: r.emergencyId || r.alertId || 'Unknown',
            date: date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
            type: r.alertType || 'Unknown',
        });
        groups[monthLabel].count++;
    });
    // Sort by most recent month first
    return Object.values(groups).sort((a, b) => {
        const [am, ay] = a.monthLabel.split(' ');
        const [bm, by] = b.monthLabel.split(' ');
        const ad = new Date(`${am} 1, ${ay}`);
        const bd = new Date(`${bm} 1, ${by}`);
        return bd.getTime() - ad.getTime();
    });
}

export default function HistoryModal({ open, onClose, center = null }: HistoryModalProps) {
    // State for filters and UI
    const [query, setQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('Month');
    const [selectedYear, setSelectedYear] = useState('Year');
    const [selectedType, setSelectedType] = useState('All Types');
    const [monthOpen, setMonthOpen] = useState(false);
    const [yearOpen, setYearOpen] = useState(false);
    const [typeOpen, setTypeOpen] = useState(false);
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
    const [mounted, setMounted] = useState<boolean>(open);
    const [visible, setVisible] = useState<boolean>(open);
    const [pdfExporting, setPdfExporting] = useState(false);
    const monthRef = useRef<HTMLButtonElement | null>(null);
    const yearRef = useRef<HTMLButtonElement | null>(null);
    const typeRef = useRef<HTMLButtonElement | null>(null);
    const months = useMemo(() => [
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ], []);
    const years = (() => {
        const y = new Date().getFullYear();
        const range = 6; // current year and previous 5 years
        return Array.from({ length: range }, (_, i) => String(y - i));
    })();
    const types = ['All Types', 'Critical', 'User Initiated'];

    // Fetch reports from backend
    const { reports } = useAggregatedRescueReports();

    // Derive filtered groups based on search and filters
    const groupedReports = useMemo(() => {
        const q = query.trim().toLowerCase();
        const groups = groupReportsByMonth(reports);
        return groups.map((group: ReportGroup) => {
            const filteredItems = group.items.filter((item: ReportItem) => {
                if (q && !item.id.toLowerCase().includes(q)) return false;
                const parsed = new Date(item.date);
                if (selectedMonth !== 'Month') {
                    const monthName = months[parsed.getMonth()];
                    if (monthName !== selectedMonth) return false;
                }
                if (selectedYear !== 'Year') {
                    const yearStr = String(parsed.getFullYear());
                    if (yearStr !== selectedYear) return false;
                }
                if (selectedType !== 'All Types') {
                    if (item.type !== selectedType) return false;
                }
                return true;
            });
            return { ...group, items: filteredItems, count: filteredItems.length };
        }).filter(g => g.items.length > 0);
    }, [reports, query, selectedMonth, selectedYear, selectedType, months]);

    // (removed dynamic width measuring — using fixed minWidth values for menu content)

    // Reset filters to defaults
    function resetFilters() {
        setQuery('');
        setSelectedMonth('Month');
        setSelectedYear('Year');
        setSelectedType('All Types');
        setMonthOpen(false);
        setYearOpen(false);
        setTypeOpen(false);
    }

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

    // If parent changes `open` to false (modal closed), reset filters AFTER exit animation
    const ANIM_MS = 220;
    useEffect(() => {
        if (open) {
            setMounted(true);
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
            const t = setTimeout(() => setMounted(false), ANIM_MS);
            const t2 = setTimeout(() => { try { resetFilters(); } catch { /* Ignore filter reset errors */ } }, ANIM_MS + 10);
            return () => { clearTimeout(t); clearTimeout(t2); };
        }
        return;
    }, [open]);

    // ensure expanded map defaults to open groups when modal opens
    useEffect(() => {
        if (open) {
            const init: Record<string, boolean> = {};
            groupReportsByMonth(reports).forEach((g: ReportGroup) => { init[g.monthLabel] = true; });
            setExpandedMap(init);
        }
    }, [open, reports]);

    if (!mounted) return null;

    const baseStyle: React.CSSProperties = {
        width: 'min(780px, 96%)',
        height: '85vh', // fixed height so modal doesn't resize when content collapses
        minHeight: 80,
        overflow: 'hidden', // inner area handles scrolling
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


    // PDF export: use data from aggregated endpoint with proper formatting
    const handleExportPdf = async (reportId?: string) => {
        setPdfExporting(false);

        try {
            // Find the report
            const flatReports = reports || [];
            let selected = null;
            if (reportId) {
                selected = flatReports.find(r => (r.emergencyId || r.alertId) === reportId);
            } else {
                selected = flatReports.length > 0 ? flatReports[0] : null;
            }

            if (!selected) {
                alert('No report data found.');
                setPdfExporting(false);
                return;
            }

            const exportData: ExportData = {
                title: `Rescue Operation Report - ${selected.emergencyId || selected.alertId || ''}`,
                totalItems: 1,
                summary: ' This document serves as the official report of the rescue operation conducted for the affected community. It records the key information, emergency context, and actions taken to ensure accountability, transparency, and reference for future disaster response efforts.',
                items: [
                    { term: selected.emergencyId || selected.alertId || 'N/A', definition: `Type: ${selected.alertType || 'N/A'} | Date: ${selected.dateTimeOccurred || 'N/A'}` }
                ],
                communityInfo: {
                    neighborhoodId: String(selected.neighborhoodId || ''),
                    focalPersonName: `${selected.focalFirstName || ''} ${selected.focalLastName || ''}`.trim() || '',
                    focalPersonAddress: (() => {
                        const addr = selected.focalAddress;
                        if (addr && typeof addr === 'string') {
                            try {
                                const parsed = JSON.parse(addr);
                                if (parsed && typeof parsed === 'object' && parsed.address) {
                                    return String(parsed.address);
                                }
                            } catch { /* ignore */ }
                        }
                        return String(addr || '');
                    })(),
                    focalPersonContactNumber: String(selected.focalPersonContactNumber || ''),
                },
                emergencyContext: {
                    emergencyId: selected.emergencyId || selected.alertId || '',
                    waterLevel: selected.waterLevel || '',
                    urgencyOfEvacuation: selected.urgencyOfEvacuation || '',
                    hazardPresent: selected.hazardPresent || '',
                    accessibility: selected.accessibility || '',
                    resourceNeeds: selected.resourceNeeds || '',
                    otherInformation: selected.otherInformation || '',
                    timeOfRescue: (() => {
                        // Format dateTimeOccurred from backend (alert.dateTimeSent)
                        const val = selected.dateTimeOccurred;
                        if (!val) return '';
                        try {
                            const dt = new Date(String(val));
                            const options: Intl.DateTimeFormatOptions = {
                                year: 'numeric', month: 'long', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                                hour12: true,
                                timeZone: 'Asia/Manila',
                            };
                            return dt.toLocaleString('en-PH', options);
                        } catch {
                            return String(val);
                        }
                    })(),
                    alertType: selected.alertType || '',
                },
                rescueCompletion: {
                    completionTimeRange: (() => {
                        // Calculate duration from alert time (dateTimeOccurred) to completion time
                        const start = selected.dateTimeOccurred; // When alert was created
                        const end = selected.completionDate;     // When rescue was completed

                        if (!start || !end) {
                            return '';
                        }

                        try {
                            const startTime = new Date(String(start)).getTime();
                            const endTime = new Date(String(end)).getTime();
                            const diffMs = endTime - startTime;

                            if (diffMs < 0) {
                                return 'N/A';
                            }

                            // Convert to hours, minutes, seconds in HH:MM:SS format
                            const totalSeconds = Math.floor(diffMs / 1000);
                            const hours = Math.floor(totalSeconds / 3600);
                            const minutes = Math.floor((totalSeconds % 3600) / 60);
                            const seconds = totalSeconds % 60;

                            // Format as HH:MM:SS
                            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                        } catch {
                            return '';
                        }
                    })(),
                    rescueCompletionTime: (() => {
                        // Format completionDate from backend
                        const val = selected.completionDate;
                        if (!val) return '';
                        try {
                            const dt = new Date(String(val));
                            const options: Intl.DateTimeFormatOptions = {
                                year: 'numeric', month: 'long', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                                hour12: true,
                                timeZone: 'Asia/Manila',
                            };
                            return dt.toLocaleString('en-PH', options);
                        } catch {
                            return String(val);
                        }
                    })(),
                    noOfPersonnel: selected.noOfPersonnel ? String(selected.noOfPersonnel) : '',
                    resourcesUsed: (() => {
                        const resources = selected.resourcesUsed as any;
                        if (!resources) return '';
                        if (typeof resources === 'string') return resources;
                        if (Array.isArray(resources)) {
                            return resources.map((r: any) => {
                                if (typeof r === 'string') return r;
                                if (typeof r === 'object' && r !== null) {
                                    const parts = [];
                                    if (r.resource || r.name) parts.push(r.resource || r.name);
                                    if (r.quantity) parts.push(`Quantity: ${r.quantity}`);
                                    if (r.description) parts.push(r.description);
                                    return parts.length > 0 ? parts.join(' - ') : JSON.stringify(r);
                                }
                                return String(r);
                            }).join('; ');
                        }
                        return String(resources);
                    })(),
                    actionsTaken: selected.actionsTaken || '',
                },
            };

            // Generate and open PDF
            await exportToPdf(exportData);
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setPdfExporting(false);
        }
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
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            position: 'absolute', right: 35, top: 30, background: 'transparent', border: 'none', color: '#BABABA', fontSize: 18,
                            cursor: 'pointer', transition: 'color 0.18s, transform 0.18s',
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

                    {/* Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2 }}>
                        <h2 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: 0.6 }}>History</h2>
                        <div style={{ color: '#fff', fontSize: 13, fontWeight: 300 }}>View Documented Emergency Reports for Your Community</div>
                    </div>

                    {/* Controls: search + filters */}
                    <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', zIndex: 2 }}>
                        <div style={{ position: 'relative', flex: 2 }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8b8b8b' }} />
                            <Input
                                value={query}
                                onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                                placeholder="Search Reports by ID"
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

                        <DropdownMenu open={typeOpen} onOpenChange={(v) => handleOpenChange(v, typeRef, setTypeOpen)}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    ref={typeRef}
                                    className="flex items-center justify-between min-w-[110px] gap-2 px-3 py-[9px] rounded-md bg-[#262626] border border-[#404040] text-[#cfcfcf] hover:bg-[#313131] hover:border-[#6b7280] transition-colors cursor-pointer"
                                    aria-label="Select type"
                                    style={{ outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <span style={{ fontSize: 14, fontWeight: 500 }}>{selectedType}</span>
                                    <ChevronDown size={16} style={{ color: '#8b8b8b', transform: typeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms' }} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent style={{ minWidth: "110px" }} className="z-[99999] bg-[#171717] border border-[#2b2b2b] text-[#cfcfcf]">
                                {types.map((t) => (
                                    <DropdownMenuItem key={t} onClick={() => { setSelectedType(t); setTypeOpen(false); }}>{t}</DropdownMenuItem>
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
                            // subtract estimated header + controls + padding: adjust if you change paddings
                            maxHeight: 'calc(85vh - 260px)',
                            // hide scrollbars where possible (Firefox/IE)
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            paddingRight: 6,
                        }}
                    >
                        {groupedReports.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 36, gap: 12, color: '#cfcfcf' }}>
                                <Search size={36} color="#8b8b8b" />
                                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 6, color: '#fff' }}>No history yet</div>
                                <div style={{ fontSize: 13, maxWidth: 420, textAlign: 'center', color: '#cfcfcf' }}>There are no documented emergency reports for your community. Try widening the date range or clearing filters.</div>
                                <button
                                    onClick={() => resetFilters()}
                                    style={{ marginTop: 12, padding: '8px 14px', borderRadius: 6, background: '#262626', color: '#fff', border: '1px solid #404040', cursor: 'pointer' }}
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : groupedReports.map((group) => {
                            const expanded = !!expandedMap[group.monthLabel];
                            return (
                                <div key={group.monthLabel} style={{ display: 'grid', gap: 10 }}>
                                    {/* Month header as full-width white pill */}
                                    <button
                                        onClick={() => setExpandedMap(prev => ({ ...prev, [group.monthLabel]: !prev[group.monthLabel] }))}
                                        aria-expanded={expanded}
                                        aria-label={expanded ? 'Collapse month' : 'Expand month'}
                                        style={{
                                            width: '100%',
                                            background: '#ffffff',
                                            color: '#111111',
                                            padding: '9px 16px',
                                            borderRadius: 6,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            border: '1px solid rgba(0,0,0,0.08)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 15.7 }}>
                                            <span>{group.monthLabel}</span>
                                            <span style={{ background: '#111111', color: '#fff', borderRadius: 999, padding: '1px 11px', fontSize: 12 }}>{group.count}</span>
                                        </div>
                                        <ChevronDown size={18} style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 160ms', color: '#111' }} />
                                    </button>

                                    <div
                                        className="history-group-body"
                                        style={{
                                            marginTop: expanded ? 8 : 0,
                                            display: 'grid',
                                            gap: 12,
                                            overflow: 'hidden',
                                            maxHeight: expanded ? '2000px' : '0px',
                                            transition: 'max-height 260ms cubic-bezier(.2,.9,.2,1), opacity 240ms ease, transform 240ms ease, margin-top 240ms ease',
                                            opacity: expanded ? 1 : 0,
                                            transform: expanded ? 'translateY(0)' : 'translateY(-6px)'
                                        }}
                                    >
                                        {group.items.map((r) => (
                                            <div
                                                key={r.id}
                                                style={{
                                                    background: '#262626', color: '#fff', padding: '14px 16px', borderRadius: 6, display: 'flex', justifyContent: 'space-between',
                                                    alignItems: 'center', border: '1px solid #404040', transition: 'background 0.18s, border-color 0.18s',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = '#313131';
                                                    e.currentTarget.style.borderColor = '#6b7280';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = '#262626';
                                                    e.currentTarget.style.borderColor = '#404040';
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 400, letterSpacing: 0.2 }}>{r.id}</div>
                                                    <div style={{ fontSize: 13, color: '#cfcfcf', marginTop: 6 }}>Accomplished on {r.date}</div>
                                                </div>
                                                <button
                                                    style={{
                                                        background: "rgba(59,130,246,0.10)", border: "none", width: 47, height: 47, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                        cursor: pdfExporting ? "not-allowed" : "pointer", boxShadow: "inset 0 0 0 1px rgba(103,161,255,0.06)", transition: "all 0.2s ease-in-out",
                                                    }}
                                                    aria-label="View PDF"
                                                    onClick={() => handleExportPdf(r.id)}
                                                    disabled={pdfExporting}
                                                >
                                                    {/* Eye icon SVG */}
                                                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3.5" stroke="#3B82F6" strokeWidth="2" /></svg>
                                                    {pdfExporting ? '...' : ''}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}