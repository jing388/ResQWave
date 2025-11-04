import { useLiveReport } from '@/components/Official/LiveReportContext';
import { useRescueForm } from '@/components/Official/RescueFormContext';
import { X } from 'lucide-react';
import { useState } from 'react';
import { getNeighborhoodByTerminalId } from '../../CommunityGroups/api/communityGroupApi';
import { CommunityGroupInfoSheet } from '../../CommunityGroups/components/CommunityGroupInfoSheet';
import type { CommunityGroupDetails } from '../../CommunityGroups/types';
import { useRescueWaitlist, type RescueFormData } from '../contexts/RescueWaitlistContext';
import type { SignalPopupProps } from '../types/popup';
import RescueFormSheet from './RescueFormSheet';

const styles = {
    popoverRow: "flex flex-row gap-3",
    popoverLabel: "w-[180px] text-sm font-medium",
    popoverValue: "ml-auto text-right text-sm max-w-[170px] whitespace-normal break-words",
    popoverValueWide: "flex-1 text-right text-sm leading-tight max-w-[220px] whitespace-normal break-words",
    popoverContainer: "flex flex-col gap-2 mb-4",
} as const;

const PopoverRow = ({ label, value, isWide = false }: { label: string; value: React.ReactNode; isWide?: boolean }) => (
    <div className={styles.popoverRow}>
        <div className={styles.popoverLabel}>{label}</div>
        <div className={isWide ? styles.popoverValueWide : styles.popoverValue}>
            {value}
        </div>
    </div>
);

export default function SignalPopover({
    popover,
    setPopover,
    onClose,
    onDispatchRescue,
    onRemoveSignal,
    onShowWaitlistAlert,
    onShowDispatchAlert,
    onShowErrorAlert,
    onShowDispatchConfirmation
}: SignalPopupProps) {
    const { isRescueFormOpen, setIsRescueFormOpen } = useRescueForm();
    const { setIsLiveReportOpen } = useLiveReport();
    const { addToWaitlist } = useRescueWaitlist();

    // Community info sheet state
    const [communityInfoOpen, setCommunityInfoOpen] = useState(false);
    const [communityData, setCommunityData] = useState<CommunityGroupDetails | undefined>(undefined);
    const [loadingCommunityData, setLoadingCommunityData] = useState(false);

    const handleWaitlist = (formData: unknown) => {
        if (!popover) return;

        const waitlistData = {
            ...(formData as Record<string, unknown>),
            alertId: popover.alertId, // Include alertId for backend operations and map updates
            deviceId: popover.deviceId,
            address: popover.address,
            date: popover.timeSent || popover.date, // Use formatted timeSent, fallback to date
            alertType: (popover.alertType as 'CRITICAL' | 'USER-INITIATED') || 'USER-INITIATED'
        };

        addToWaitlist(waitlistData as RescueFormData);
        setIsLiveReportOpen(true);
        setIsRescueFormOpen(false);
        // Close the popover after adding to waitlist
        setPopover(null);

        // Show success alert
        onShowWaitlistAlert?.(popover.focalPerson || 'Unknown');
    };

    const handleDispatch = (formData?: unknown) => {
        if (!popover || !popover.alertId) {
            console.error('[SignalPopover] Cannot dispatch: missing alertId');
            onShowErrorAlert?.('Cannot dispatch: missing alert information');
            return;
        }

        // Show confirmation dialog with backend call as callback
        if (formData && (formData as Record<string, unknown>).dispatchCallback) {
            onShowDispatchConfirmation?.(formData, async () => {
                try {
                    // Execute the backend dispatch call
                    await ((formData as Record<string, unknown>).dispatchCallback as () => Promise<void>)();

                    setIsRescueFormOpen(false);
                    setPopover(null); // Close the popover
                    onDispatchRescue?.(); // Show dispatch confirmation dialog

                    // Show success alert
                    onShowDispatchAlert?.(popover.focalPerson || 'Unknown');
                } catch (error) {
                    console.error('[SignalPopover] Error dispatching rescue form:', error);
                    
                    // Check for admin-specific error using code or message
                    const err = error as { message?: string; response?: { code?: string; message?: string } };
                    const errorCode = err.response?.code;
                    const errorMessage = err.response?.message || err.message || '';
                    
                    if (errorCode === 'ADMIN_CANNOT_CREATE_RESCUE_FORM' || errorMessage.includes('You are currently in the admin interface')) {
                        onShowErrorAlert?.('Cannot create rescue form: You are currently in the admin interface. Only dispatchers can create rescue forms.');
                    } else if (errorCode === 'INVALID_USER_ROLE' || errorMessage.includes('Only dispatchers can create rescue forms')) {
                        onShowErrorAlert?.('Access denied: Only dispatchers can create rescue forms.');
                    } else {
                        onShowErrorAlert?.('Failed to dispatch rescue form. Please try again.');
                    }
                }
            });
        } else if (formData) {
            // Fallback for old behavior (should not happen now)
            onShowDispatchConfirmation?.(formData, () => {
                // Remove the signal from the map
                if (onRemoveSignal && popover.alertId) {
                    onRemoveSignal(popover.alertId);
                }

                setIsRescueFormOpen(false);
                setPopover(null); // Close the popover
                onDispatchRescue?.(); // Show dispatch confirmation dialog

                // Show success alert
                onShowDispatchAlert?.(popover.focalPerson || 'Unknown');
            });
        } else {
            // Direct dispatch without confirmation
            if (onRemoveSignal && popover.alertId) {
                onRemoveSignal(popover.alertId);
            }

            setIsRescueFormOpen(false);
            setPopover(null);
            onDispatchRescue?.();

            onShowDispatchAlert?.(popover.focalPerson || 'Unknown');
        }
    };

    const handleMoreInfo = async () => {
        if (!popover?.deviceId) {
            console.error('[SignalPopover] No device ID available for More Info');
            return;
        }

        setLoadingCommunityData(true);
        try {
            const data = await getNeighborhoodByTerminalId(popover.deviceId);
            if (data) {
                setCommunityData(data);
                setCommunityInfoOpen(true);
            } else {
                console.warn('[SignalPopover] No community data found for terminal:', popover.deviceId);
                // You might want to show an error message to the user here
            }
        } catch (error) {
            console.error('[SignalPopover] Error fetching community data:', error);
            // You might want to show an error message to the user here
        } finally {
            setLoadingCommunityData(false);
        }
    };

    if (!popover) return null;

    // Check if rescue form is needed for this alert type (not for dispatched or offline/online terminals)
    const isRescueNeeded = popover.alertType === 'CRITICAL' || popover.alertType === 'USER-INITIATED';

    const popoverWidth = 390;
    const popoverHeight = 320;
    const offsetX = popoverWidth / 1.390;
    const offsetY = popoverHeight + 150;

    return (
        <>
            <div id="signal-popover-wrapper" style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(popover.screen.x - offsetX)}px, ${(popover.screen.y - offsetY)}px)`, zIndex: 'var(--z-map-popover)', pointerEvents: 'none' }}>
                <div style={{ position: 'relative', minWidth: 370, maxWidth: 420 }}>
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.80)', color: '#fff', boxShadow: '0 8px 28px rgba(0,0,0,0.45)', padding: '20px 18px 20px 18px', fontFamily: 'inherit', borderRadius: 5 }}>
                        {/* Header with close button */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="font-bold uppercase text-base">ALERT DETAILS</div>
                            <button
                                onClick={() => {
                                    setPopover(null);
                                    onClose?.();
                                }}
                                className="text-gray-400 hover:text-white hover:cursor-pointer pointer-events-auto transition-colors p-1"
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Information rows */}
                        <div className={styles.popoverContainer}>
                            <PopoverRow
                                label="Device ID"
                                value={popover.deviceId || 'N/A'}
                            />
                            <PopoverRow
                                label="Alert Type"
                                value={
                                    popover.alertType === 'CRITICAL' ? 'Critical' :
                                    popover.alertType === 'USER-INITIATED' ? 'User-Initiated' :
                                    popover.alertType === 'ONLINE' ? 'No Alert' :
                                    popover.alertType === 'OFFLINE' ? 'No Alert' :
                                    !popover.alertType || popover.alertType === null ? 'No Alert' :
                                    'N/A'
                                } 
                            />
                            <PopoverRow
                                label="Terminal Status"
                                value={
                                    popover.status === 'ONLINE' ? 'Online' :
                                        popover.status === 'OFFLINE' ? 'Offline' :
                                            popover.status || 'N/A'
                                }
                            />
                            <PopoverRow
                                label="Time Sent"
                                value={popover.timeSent || 'N/A'}
                            />
                            <PopoverRow
                                label="Focal Person"
                                value={popover.focalPerson || 'N/A'}
                            />
                            <PopoverRow
                                label="House Address"
                                value={popover.address || 'N/A'}
                            />
                            <PopoverRow
                                label="Contact Number"
                                value={popover.contactNumber || 'N/A'}
                            />
                        </div>
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4 pointer-events-auto">
                            <button
                                onClick={handleMoreInfo}
                                disabled={loadingCommunityData}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                            >
                                {loadingCommunityData ? 'Loading...' : 'More Info'}
                            </button>
                            <button
                                onClick={() => {
                                    if (isRescueNeeded) {
                                        setIsRescueFormOpen(true);
                                    }
                                }}
                                disabled={!isRescueNeeded}
                                className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${isRescueNeeded
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                                    }`}
                                title={!isRescueNeeded ? 'Rescue form only available for Critical and User-Initiated alerts' : 'Open rescue form'}
                            >
                                Rescue Form
                            </button>
                        </div>

                        {/* Downward pointer/arrow */}
                        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: '-23px', width: 0, height: 0, borderLeft: '20px solid transparent', borderRight: '20px solid transparent', borderTop: '24px solid rgba(0,0,0,0.80)' }} />
                    </div>
                </div>
            </div>

            {/* Rescue Form Sheet - Rendered separately at root level */}
            {isRescueNeeded && (
                <RescueFormSheet
                    isOpen={isRescueFormOpen}
                    onClose={() => setIsRescueFormOpen(false)}
                    focalPerson={popover.focalPerson || 'N/A'}
                    alertId={popover.alertId}
                    onWaitlist={handleWaitlist}
                    onDispatch={handleDispatch}
                />
            )}

            {/* Community Group Info Sheet */}
            <CommunityGroupInfoSheet
                open={communityInfoOpen}
                onOpenChange={setCommunityInfoOpen}
                communityData={communityData}
            />
        </>
    );
}