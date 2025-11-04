import { useCallback, useEffect, useState } from 'react';
import { fetchAllMapData, type MapSignal } from '../api/mapAlerts';

interface UseMapAlertsReturn {
    signals: MapSignal[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    addSignal: (signal: MapSignal) => void;
    updateSignal: (signal: MapSignal) => void;
    removeSignal: (alertId: string) => void;
}

/**
 * Custom hook to fetch and manage map alerts
 * Polls every 30 seconds for real-time updates
 */
export function useMapAlerts(): UseMapAlertsReturn {
    const [signals, setSignals] = useState<MapSignal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchSignals = useCallback(async () => {
        try {
            setError(null);
            const data = await fetchAllMapData();
            setSignals(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchSignals();
    }, [fetchSignals]);

    // Poll every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchSignals, 30000);
        return () => clearInterval(interval);
    }, [fetchSignals]);

    // Add a new signal (from WebSocket)
    const addSignal = useCallback((newSignal: MapSignal) => {
        setSignals(prev => {
            // Check if terminal already has a signal displayed
            const existingIndex = prev.findIndex(s => s.deviceId === newSignal.deviceId);
            
            if (existingIndex !== -1) {
                // Update the existing signal for this terminal
                console.log('[useMapAlerts] Terminal already exists, updating signal');
                const newSignals = [...prev];
                newSignals[existingIndex] = newSignal;
                return newSignals;
            }
            
            // Add new signal if terminal doesn't exist
            console.log('[useMapAlerts] Adding new signal for terminal');
            return [...prev, newSignal];
        });
    }, []);

    // Update an existing signal (from WebSocket)
    const updateSignal = useCallback((updatedSignal: MapSignal) => {
        setSignals(prev => {
            const index = prev.findIndex(s => s.deviceId === updatedSignal.deviceId);
            if (index === -1) {
                console.log('[useMapAlerts] Signal not found, adding instead');
                return [...prev, updatedSignal];
            }
            console.log('[useMapAlerts] Updating signal at index', index);
            const newSignals = [...prev];
            newSignals[index] = updatedSignal;
            return newSignals;
        });
    }, []);

    // Remove a signal by alertId (used when dispatched)
    const removeSignal = useCallback((alertId: string) => {
        setSignals(prev => {
            console.log('[useMapAlerts] Removing signal with alertId:', alertId);
            return prev.filter(s => s.alertId !== alertId);
        });
    }, []);

    return {
        signals,
        isLoading,
        error,
        refetch: fetchSignals,
        addSignal,
        updateSignal,
        removeSignal
    };
}
