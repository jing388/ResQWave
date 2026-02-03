/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 [longitude, latitude]
 * @param coord2 [longitude, latitude]
 * @returns distance in kilometers
 */
export function calculateDistance(
    coord1: [number, number],
    coord2: [number, number]
): number {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Filter signals based on distance from a reference point
 * @param signals Array of signals to filter
 * @param referencePoint [longitude, latitude] of the reference location
 * @param maxDistanceKm Maximum distance in kilometers (null = no filter)
 * @returns Filtered signals within the specified range
 */
export function filterSignalsByDistance<T extends { coordinates: [number, number] }>(
    signals: T[],
    referencePoint: [number, number],
    maxDistanceKm: number | null
): T[] {
    // If no distance limit, return all signals
    if (maxDistanceKm === null) {
        return signals;
    }

    return signals.filter((signal) => {
        const distance = calculateDistance(referencePoint, signal.coordinates);
        return distance <= maxDistanceKm;
    });
}

/**
 * Predefined range options for focal person terminals
 */
export const RANGE_OPTIONS = [
    { value: 1, label: '1 km', description: 'Immediate Area' },
    { value: 5, label: '5 km', description: 'Very Close' },
    { value: 10, label: '10 km', description: 'Close' },
    { value: 20, label: '20 km', description: 'Nearby' },
    { value: 50, label: '50 km', description: 'Extended' },
    { value: null, label: 'Unlimited', description: 'All Terminals' }
] as const;

export type RangeValue = typeof RANGE_OPTIONS[number]['value'];
