import { useCallback, useState } from "react";
import type { MapSignal } from "../api/mapAlerts";
import type { InfoBubble, Signal, SignalPopover } from "../types/signals";
import { useMapAlerts } from "./useMapAlerts";
import { useMapWebSocket } from "./useMapWebSocket";

export default function useSignals() {
  const {
    signals: mapSignals,
    isLoading,
    error,
    addSignal,
    updateSignal,
  } = useMapAlerts();

  const [popover, setPopover] = useState<SignalPopover | null>(null);
  const [infoBubble, setInfoBubble] = useState<InfoBubble | null>(null);
  const [infoBubbleVisible, setInfoBubbleVisible] = useState(true);

  // Handle new alerts from WebSocket
  const handleNewAlert = useCallback(
    (newSignal: MapSignal) => {
      console.log("[useSignals] New alert from WebSocket:", newSignal);
      // addSignal now handles both adding new and updating existing
      addSignal(newSignal);
    },
    [addSignal],
  );

  // Handle alert status updates from WebSocket (for dispatched alerts)
  const handleAlertStatusUpdate = useCallback(
    (updatedSignal: MapSignal) => {
      console.log(
        "[useSignals] Alert status update from WebSocket:",
        updatedSignal,
      );
      // Update the existing signal with new status/alertType
      updateSignal(updatedSignal);
    },
    [updateSignal],
  );

  // Handle waitlist form removal from WebSocket
  const handleWaitlistFormRemoved = useCallback(
    (data: { alertId: string; rescueFormId: string; action: string }) => {
      console.log("[useSignals] Waitlist form removed from WebSocket:", data);
      // This will be handled by the context - we just log it here for debugging
      // The actual removal will be handled by the waitlist context
    },
    [],
  );

  // Set up WebSocket listener
  const { isConnected } = useMapWebSocket({
    onNewAlert: handleNewAlert,
    onAlertStatusUpdate: handleAlertStatusUpdate,
    onWaitlistFormRemoved: handleWaitlistFormRemoved,
  });

  // Transform backend MapSignal[] to frontend Signal[] format
  const transformedSignals: Signal[] = mapSignals.map((signal) => {
    const alertType = determineAlertType(signal);

    return {
      coordinates: signal.coordinates || [0, 0],
      properties: {
        alertId: signal.alertId, // Include alertId for rescue form submission
        status: signal.terminalStatus.toUpperCase() as "ONLINE" | "OFFLINE",
        deviceId: signal.deviceId,
        focalPerson: signal.focalPerson,
        address: signal.address,
        name: signal.deviceName,
        alertType: alertType as
          | "CRITICAL"
          | "USER-INITIATED"
          | "ONLINE"
          | "OFFLINE"
          | "DISPATCHED",
        contactNumber: signal.contactNumber,
        timeSent: signal.timeSent,
        alertStatus: signal.alertStatus, // Pass through alert status
      },
      boundary: [],
    };
  });

  const getDistressCoord = (): [number, number] => {
    return (
      (transformedSignals[0]?.coordinates as [number, number]) || [
        121.04040046802031, 14.7721611560019,
      ]
    );
  };

  return {
    otherSignals: transformedSignals,
    ownCommunitySignal: transformedSignals[0] || null,
    popover,
    setPopover,
    infoBubble,
    setInfoBubble,
    infoBubbleVisible,
    setInfoBubbleVisible,
    getDistressCoord,
    isLoading,
    error,
    isConnected,
  } as const;
}

/**
 * Determines the alert type based on signal data
 * Returns terminal status if no alert exists, or DISPATCHED if alert was completed
 */
function determineAlertType(signal: MapSignal): string {
  // Check if alert was dispatched (rescue completed)
  if (signal.alertStatus === "null") {
    return "NULL";
  }

  // Check if there's an active alert
  if (
    !signal.alertType ||
    signal.alertType === "null" ||
    signal.alertType === ""
  ) {
    return signal.terminalStatus.toUpperCase();
  }

  if (signal.alertType === "User-Initiated") {
    return "USER-INITIATED";
  }

  if (signal.alertType === "Critical") {
    return "CRITICAL";
  }

  return signal.terminalStatus.toUpperCase();
}
