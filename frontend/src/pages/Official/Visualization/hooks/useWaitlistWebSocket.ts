import { useSocket } from "@/contexts/SocketContext";
import { useCallback, useEffect } from "react";
import { useRescueWaitlist } from "../contexts/RescueWaitlistContext";

/**
 * Hook to handle real-time waitlist updates via WebSocket
 */
export function useWaitlistWebSocket() {
  const { socket, isConnected } = useSocket();
  const { removeFromWaitlistByAlertId } = useRescueWaitlist();

  const handleWaitlistFormRemoved = useCallback(
    (data: { alertId: string; rescueFormId: string; action: string }) => {
      console.log("[WaitlistWebSocket] Waitlist form removed received:", data);

      if (data.action === "dispatched") {
        // Remove the form from waitlist based on alertId
        console.log(
          "[WaitlistWebSocket] Removing waitlisted form for alert:",
          data.alertId,
        );
        removeFromWaitlistByAlertId(data.alertId);
      }
    },
    [removeFromWaitlistByAlertId],
  );

  useEffect(() => {
    if (!socket || !isConnected) {
      console.log(
        "[WaitlistWebSocket] Socket not ready, skipping waitlist listeners",
      );
      return;
    }

    console.log("[WaitlistWebSocket] Setting up waitlist listeners");

    // Listen for waitlist form removals
    socket.on("waitlist:formRemoved", handleWaitlistFormRemoved);

    // Cleanup
    return () => {
      console.log("[WaitlistWebSocket] Cleaning up waitlist listeners");
      socket.off("waitlist:formRemoved", handleWaitlistFormRemoved);
    };
  }, [socket, isConnected, handleWaitlistFormRemoved]);

  return { isConnected };
}
