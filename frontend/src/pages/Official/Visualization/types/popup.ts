import type { InfoBubble, SignalPopover } from "./signals";

export type SignalPopupProps = {
  popover: SignalPopover | null;
  setPopover: (p: SignalPopover | null) => void;
  // optional callback invoked when the popover is closed via the UI so the
  // parent can perform cleanup (for example: remove temporary map layers)
  onClose?: () => void;
  // Handler for dispatch rescue action
  onDispatchRescue?: () => void;
  // Handler for removing signal from map when dispatched
  onRemoveSignal?: (alertId: string) => void;
  // Info bubble props moved here so the popup component can also render the
  // small 'YOUR COMMUNITY' bubble when no popover is visible.
  infoBubble: InfoBubble | null;
  infoBubbleVisible: boolean;
  // Rescue Form Alert handlers
  onShowWaitlistAlert?: (focalPerson: string) => void;
  onShowDispatchAlert?: (focalPerson: string) => void;
  onShowErrorAlert?: (message: string) => void;
  onShowDispatchConfirmation?: (
    formData: unknown,
    onConfirm: () => void,
  ) => void;
  // AI Insights handler
  onOpenInsights?: (terminalID: string, terminalName: string) => void;
};
