import type {
  CommunityGroupDetails,
  TerminalStatus,
} from "../../CommunityGroups/types";

export type Signal = {
  coordinates: [number, number];
  properties: {
    alertId?: string; // Backend emergency/alert ID for rescue form submission
    status: TerminalStatus;
    deviceId: string;
    focalPerson: string;
    altFocalPerson?: string;
    address?: string;
    date?: string;
    name?: string;
    alertType?:
      | "CRITICAL"
      | "USER-INITIATED"
      | "ONLINE"
      | "OFFLINE"
      | "DISPATCHED";
    contactNumber?: string;
    timeSent?: string;
  };
  boundary: [number, number][];
  // Include full community group details for more info functionality
  communityDetails?: CommunityGroupDetails;
};

export type SignalPopover = {
  lng: number;
  lat: number;
  screen: { x: number; y: number };
  alertId?: string; // Backend emergency/alert ID for rescue form submission
  status?: string;
  title?: string;
  address?: string;
  date?: string;
  deviceId?: string;
  focalPerson?: string;
  altFocalPerson?: string;
  coordinates?: string;
  alertType?: string;
  timeSent?: string;
  contactNumber?: string;
  // Include community details for more info functionality
  communityDetails?: CommunityGroupDetails;
};

export type InfoBubble = { x: number; y: number };

// Full shape returned by the useSignals() hook on this page. Centralized here
// so other components can import the hook return type instead of repeating
// the structure inline.
export type VisualizationSignals = {
  otherSignals: Signal[];
  ownCommunitySignal: Signal;
  popover: SignalPopover | null;
  setPopover: (p: SignalPopover | null) => void;
  infoBubble: InfoBubble | null;
  setInfoBubble: (b: InfoBubble | null) => void;
  infoBubbleVisible: boolean;
  setInfoBubbleVisible: (v: boolean) => void;
  getDistressCoord: () => [number, number];
};
