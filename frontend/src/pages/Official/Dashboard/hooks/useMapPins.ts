import { useEffect, useState } from "react";
import { getSocket } from "../../../../services/socketService";
import type { MapPinData } from "../api/adminDashboardApi";
import { fetchAggregatedMapData } from "../api/adminDashboardApi";

interface MapAlertUpdate {
  alertId: string;
  alertType: string;
  timeSent: string;
  alertStatus: string;
  terminalId: string;
  terminalName: string;
  terminalStatus: string;
  focalPersonId: string | null;
  focalFirstName: string;
  focalLastName: string;
  focalAddress: string | Record<string, unknown>;
  focalContactNumber: string;
}

/**
 * Hook to manage map pins data with real-time updates
 */
export const useMapPins = () => {
  const [pins, setPins] = useState<MapPinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial data fetch
  useEffect(() => {
    const loadPins = async () => {
      try {
        setLoading(true);
        const data = await fetchAggregatedMapData();
        setPins(data);
        setError(null);
      } catch (err) {
        console.error("[useMapPins] Error loading pins:", err);
        setError("Failed to load map pins");
      } finally {
        setLoading(false);
      }
    };

    loadPins();
  }, []);

  // Real-time updates via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleMapUpdate = (update: MapAlertUpdate) => {
      console.log("[useMapPins] Received real-time update:", update);

      setPins((prevPins) => {
        // Find the pin to update
        const pinIndex = prevPins.findIndex(
          (pin) => pin.terminalID === update.terminalId
        );

        if (pinIndex === -1) {
          // New pin - add it
          return [
            ...prevPins,
            {
              neighborhoodID: "", // Not provided in socket update
              terminalID: update.terminalId,
              terminalStatus: update.terminalStatus,
              latestAlertTime: update.timeSent,
              totalAlerts: 1,
              focalPerson: `${update.focalFirstName} ${update.focalLastName}`.trim(),
              address: update.focalAddress,
              contactNumber: update.focalContactNumber,
            },
          ];
        } else {
          // Update existing pin
          const updatedPins = [...prevPins];
          updatedPins[pinIndex] = {
            ...updatedPins[pinIndex],
            terminalStatus: update.terminalStatus,
            latestAlertTime: update.timeSent,
            totalAlerts: updatedPins[pinIndex].totalAlerts + 1,
          };
          return updatedPins;
        }
      });
    };

    // Listen for real-time map updates
    socket.on("mapReport:new", handleMapUpdate);

    return () => {
      socket.off("mapReport:new", handleMapUpdate);
    };
  }, []);

  return { pins, loading, error };
};
