export type Signal = {
    coordinates: [number, number];
    properties: {
        status: string;
        deviceId: string;
        focalPerson: string;
        altFocalPerson?: string;
        address?: string;
        date?: string;
        name?: string;
    };
    radius?: number; // meters, optional for flexibility
};

export type SignalPopover = {
    lng: number;
    lat: number;
    screen: { x: number; y: number };
    status?: string;
    title?: string;
    address?: string;
    date?: string;
    deviceId?: string;
    focalPerson?: string;
    altFocalPerson?: string;
    coordinates?: string;
};

export type InfoBubble = { x: number; y: number };

// Type for nearby range values
import type { RangeValue } from '../utils/distanceUtils';

// Full shape returned by the useSignals() hook on this page. Centralized here
// so other components can import the hook return type instead of repeating
// the structure inline.
export type DashboardSignals = {
    otherSignals: Signal[];
    allOtherSignals: Signal[];
    ownCommunitySignal: Signal;
    nearbyRange: RangeValue;
    setNearbyRange: (value: RangeValue) => void;
    editBoundaryOpen: boolean;
    setEditBoundaryOpen: (v: boolean) => void;
    savedGeoJson: GeoJSON.FeatureCollection | null;
    setSavedGeoJson: (g: GeoJSON.FeatureCollection | null) => void;
    popover: SignalPopover | null;
    setPopover: (p: SignalPopover | null) => void;
    infoBubble: InfoBubble | null;
    setInfoBubble: (b: InfoBubble | null) => void;
    infoBubbleVisible: boolean;
    setInfoBubbleVisible: (v: boolean) => void;
    canSave: boolean;
    setCanSave: (v: boolean) => void;
    updateBoundary: (deviceId: string | undefined, newBoundary: [number, number][] | null) => void;
    getDistressCoord: () => [number, number];
    refetchSignals: () => void;
};
