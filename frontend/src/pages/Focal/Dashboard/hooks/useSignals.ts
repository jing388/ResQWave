import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../../../lib/api';
import { useFocalAuth } from '../../context/focalAuthContext';
import type { Signal, SignalPopover, InfoBubble } from '../types/signals';
import { filterSignalsByDistance, type RangeValue } from '../utils/distanceUtils';


// Fallback initial values (empty)
const initialOtherSignals: Signal[] = [];
const initialOwnCommunitySignal: Signal = {
    coordinates: [0, 0],
    properties: {
        status: '',
        deviceId: '',
        focalPerson: '',
        altFocalPerson: '',
        address: '',
        date: '',
        name: ''
    },
};

/**
 * Helper to parse coordinates from address JSON - standardized format
 * Expected format: {"address":"...", "coordinates":"lng, lat"}
 */
function parseCoordinates(address: string | Record<string, unknown>): [number, number] {
    try {
        let addressObj: Record<string, unknown> | string = address;

        // If address is a string, try to parse it
        if (typeof addressObj === "string") {
            try {
                addressObj = JSON.parse(addressObj);
            } catch {
                return [0, 0]; // Invalid JSON
            }
        }

        // Type guard: ensure addressObj is now an object
        if (typeof addressObj !== "object" || addressObj === null) {
            return [0, 0];
        }

        // Standardized format: Coordinates as a STRING "lng, lat"
        if ("coordinates" in addressObj && typeof addressObj.coordinates === "string") {
            const coords = addressObj.coordinates.split(",").map((s: string) => parseFloat(s.trim()));
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                return [coords[0], coords[1]]; // [lng, lat]
            }
        }
    } catch {
        // Silent error handling
    }
    return [0, 0];
}

export function useSignals() {


    const { token } = useFocalAuth();
    const [otherSignals, setOtherSignals] = useState<Signal[]>(initialOtherSignals);
    const [ownCommunitySignal, setOwnCommunitySignal] = useState<Signal>(initialOwnCommunitySignal);
    const [nearbyRange, setNearbyRange] = useState<RangeValue>(5); // Default 5km

    const [editBoundaryOpen, setEditBoundaryOpen] = useState(false);
    const [savedGeoJson, setSavedGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
    const [popover, setPopover] = useState<SignalPopover | null>(null);
    const [infoBubble, setInfoBubble] = useState<InfoBubble | null>(null);
    const [infoBubbleVisible, setInfoBubbleVisible] = useState(true);
    const [canSave, setCanSave] = useState(false);

    // Fetch signals function (extracted for reuse)
    const fetchSignals = useCallback(async () => {
        try {
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // Fetch own neighborhood (with focal, terminal info)
            const own = await apiFetch<{
                address?: string;
                terminalID?: string;
                focalPerson?: {
                    name?: string;
                    alternativeFPFirstName?: string;
                    alternativeFPLastName?: string;
                };
                createdDate?: string;
            }>(`/neighborhood/map/own`, { headers });
            // Fetch other neighborhoods (limited info)
            const others = await apiFetch<Array<{
                address?: string;
                terminalID?: string;
                createdDate?: string;
            }>>(`/neighborhood/map/others`, { headers });


            // Parse coordinates from address JSON string using the flexible parser
            let ownCoords: [number, number] = [0, 0];
            let ownAddress = '';
            if (own.address) {
                ownCoords = parseCoordinates(own.address);
                // Extract address text from the JSON
                try {
                    const addrObj = typeof own.address === 'string' ? JSON.parse(own.address) : own.address;
                    if (addrObj && typeof addrObj === 'object' && 'address' in addrObj) {
                        ownAddress = addrObj.address as string || '';
                    } else if (typeof own.address === 'string') {
                        ownAddress = own.address;
                    }
                } catch {
                    ownAddress = typeof own.address === 'string' ? own.address : '';
                }
            }
            setOwnCommunitySignal({
                coordinates: ownCoords,
                properties: {
                    status: 'online',
                    deviceId: own.terminalID || '',
                    focalPerson: own.focalPerson?.name || '',
                    altFocalPerson: (
                        own.focalPerson?.alternativeFPFirstName || own.focalPerson?.alternativeFPLastName
                    )
                        ? [own.focalPerson?.alternativeFPFirstName, own.focalPerson?.alternativeFPLastName].filter(Boolean).join(' ')
                        : '',
                    address: ownAddress,
                    date: own.createdDate ? new Date(own.createdDate).toLocaleDateString() : '',
                    name: '',
                }
            });

            setOtherSignals(
                (others || []).map((nb: { terminalID?: string; address?: string | Record<string, unknown>; groupName?: string; createdDate?: string }) => {
                    // Parse coordinates using the flexible parser
                    let coords: [number, number] = [0, 0];
                    let address = '';
                    if (nb.address) {
                        coords = parseCoordinates(nb.address);
                        // Extract address text from the JSON
                        try {
                            const addrObj = typeof nb.address === 'string' ? JSON.parse(nb.address) : nb.address;
                            if (addrObj && typeof addrObj === 'object' && 'address' in addrObj) {
                                address = addrObj.address as string || '';
                            } else if (typeof nb.address === 'string') {
                                address = nb.address;
                            }
                        } catch {
                            address = typeof nb.address === 'string' ? nb.address : '';
                        }
                    }
                    return {
                        coordinates: coords,
                        properties: {
                            status: 'offline',
                            deviceId: nb.terminalID || '',
                            focalPerson: '',
                            altFocalPerson: '',
                            address,
                            date: nb.createdDate ? new Date(nb.createdDate).toLocaleDateString() : '',
                            name: '',
                        }
                    };
                })
            );
        } catch {
            setOtherSignals(initialOtherSignals);
            setOwnCommunitySignal(initialOwnCommunitySignal);
        }
    }, [token]);


    // Fetch signals from backend on mount
    useEffect(() => {
        fetchSignals();

    }, [token, fetchSignals]);

    const updateBoundary = (deviceId: string | undefined, newBoundary: [number, number][] | null) => {
        if (!deviceId || !newBoundary) return;
        if (deviceId === ownCommunitySignal.properties.deviceId) {
            setOwnCommunitySignal(prev => ({ ...prev, boundary: newBoundary }));
            return;
        }
        setOtherSignals(prev => prev.map(s => s.properties.deviceId === deviceId ? { ...s, boundary: newBoundary } : s));
    };

    const getDistressCoord = () => ownCommunitySignal.coordinates as [number, number];

    // Filter other signals based on nearby range
    const filteredOtherSignals = filterSignalsByDistance(
        otherSignals,
        ownCommunitySignal.coordinates,
        nearbyRange
    );

    // Expose refetch function for manual refresh
    const refetchSignals = () => {
        fetchSignals();
    };

    return {
        otherSignals: filteredOtherSignals, // Return filtered signals
        allOtherSignals: otherSignals, // Expose unfiltered for reference
        ownCommunitySignal,
        nearbyRange,
        setNearbyRange,
        editBoundaryOpen,
        setEditBoundaryOpen,
        savedGeoJson,
        setSavedGeoJson,
        popover,
        setPopover,
        infoBubble,
        setInfoBubble,
        infoBubbleVisible,
        setInfoBubbleVisible,
        canSave,
        setCanSave,
        updateBoundary,
        getDistressCoord,
        refetchSignals
    } as const;
}

export default useSignals;