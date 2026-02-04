import { useCallback, useEffect, useState } from "react";
import { alarmApi } from "../api/alarmApi";
import type { Alarm } from "../types";

export const useAlarms = () => {
  const [activeAlarms, setActiveAlarms] = useState<Alarm[]>([]);
  const [clearedAlarms, setClearedAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active and cleared alarms
  const fetchAlarms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both active and cleared alarms in parallel
      const [activeData, clearedData] = await Promise.all([
        alarmApi.getActiveAlarms(),
        alarmApi.getClearedAlarms(),
      ]);
      
      setActiveAlarms(activeData);
      setClearedAlarms(clearedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch alarms";
      setError(errorMessage);
      console.error("Error fetching alarms:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new alarm
  const createAlarm = useCallback(
    async (alarmData: {
      terminalID: string;
      name: string;
      status: string;
      severity: string;
    }) => {
      try {
        const newAlarm = await alarmApi.createAlarm(alarmData);
        
        // Add to appropriate list based on status
        if (newAlarm.status === "Active") {
          setActiveAlarms((prev) => [newAlarm, ...prev]);
        } else if (newAlarm.status === "Cleared") {
          setClearedAlarms((prev) => [newAlarm, ...prev]);
        }
        
        return newAlarm;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create alarm";
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Refresh data
  const refreshData = useCallback(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  // Initial fetch
  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  return {
    activeAlarms,
    clearedAlarms,
    loading,
    error,
    createAlarm,
    refreshData,
  };
};
