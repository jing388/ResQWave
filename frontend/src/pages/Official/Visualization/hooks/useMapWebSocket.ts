import { useSocket } from "@/contexts/SocketContext";
import { useCallback, useEffect } from "react";
import type { MapAlertResponse, MapSignal } from "../api/mapAlerts";
import { transformToMapSignal } from "../api/mapAlerts";

interface UseMapWebSocketProps {
  onNewAlert: (signal: MapSignal) => void;
  onAlertStatusUpdate?: (updatedSignal: MapSignal) => void;
  onWaitlistFormRemoved?: (data: {
    alertId: string;
    rescueFormId: string;
    action: string;
  }) => void;
}

/**
 * Hook to listen for real-time map alerts via WebSocket
 */
export function useMapWebSocket({
  onNewAlert,
  onAlertStatusUpdate,
  onWaitlistFormRemoved,
}: UseMapWebSocketProps) {
  const { socket, isConnected } = useSocket();

  const handleMapReport = useCallback(
    (data: MapAlertResponse) => {
      console.log("[WebSocket] New map report received:", data);

      try {
        // Transform the data using the same function as REST API
        const signal = transformToMapSignal(data);

        if (!signal) {
          console.warn("[WebSocket] Could not transform map report:", data);
          return;
        }

        console.log("[WebSocket] Transformed signal:", signal);
        onNewAlert(signal);
      } catch (error) {
        console.error("[WebSocket] Error processing map report:", error);
      }
    },
    [onNewAlert],
  );

  const handleAlertStatusUpdate = useCallback(
    (data: MapAlertResponse) => {
      console.log("[WebSocket] Alert status update received:", data);

      try {
        // Transform the data using the same function as REST API
        const signal = transformToMapSignal(data);

        if (!signal) {
          console.warn(
            "[WebSocket] Could not transform alert status update:",
            data,
          );
          return;
        }

        console.log("[WebSocket] Transformed status update signal:", signal);
        if (onAlertStatusUpdate) {
          onAlertStatusUpdate(signal);
        }
      } catch (error) {
        console.error(
          "[WebSocket] Error processing alert status update:",
          error,
        );
      }
    },
    [onAlertStatusUpdate],
  );

  const handleWaitlistFormRemoved = useCallback(
    (data: { alertId: string; rescueFormId: string; action: string }) => {
      console.log("[WebSocket] Waitlist form removed received:", data);

      if (onWaitlistFormRemoved) {
        onWaitlistFormRemoved(data);
      }
    },
    [onWaitlistFormRemoved],
  );

  useEffect(() => {
    if (!socket || !isConnected) {
      console.log("[WebSocket] Socket not ready, skipping map alert listeners");
      return;
    }

    console.log("[WebSocket] Setting up map alert listeners");

    // Listen for new map alerts
    socket.on("mapReport:new", handleMapReport);

    // Listen for alert status updates (dispatched alerts)
    socket.on("alert:statusUpdate", handleAlertStatusUpdate);

    // Listen for waitlist form removals
    socket.on("waitlist:formRemoved", handleWaitlistFormRemoved);

    // Cleanup
    return () => {
      console.log("[WebSocket] Cleaning up map alert listeners");
      socket.off("mapReport:new", handleMapReport);
      socket.off("alert:statusUpdate", handleAlertStatusUpdate);
      socket.off("waitlist:formRemoved", handleWaitlistFormRemoved);
    };
  }, [
    socket,
    isConnected,
    handleMapReport,
    handleAlertStatusUpdate,
    handleWaitlistFormRemoved,
  ]);

  return { isConnected };
}
