import { useCallback, useEffect, useState } from "react";
import { alarmApi } from "../api/alarmApi";
import type { Alarm } from "../types";

export const useAlarms = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all alarms
  const fetchAlarms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await alarmApi.getAllAlarms();
      setAlarms(data);
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
        setAlarms((prev) => [newAlarm, ...prev]);
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
    alarms,
    loading,
    error,
    createAlarm,
    refreshData,
  };
};
