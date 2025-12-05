import type { LiveReportAlert } from "../types";

// Mock data based on the signals from visualization, filtering only CRITICAL and USER-INITIATED
export const mockLiveReportData: LiveReportAlert[] = [
  {
    id: "RSQW-103",
    emergencyId: "EMG-103",
    communityGroup: "BAYBAYIN",
    alertType: "CRITICAL",
    status: "UNASSIGNED",
    lastSignalTime: "September 12, 2025 12:00:00 PM",
    address: "Corner Gen. Luna & Mabini",
  },
  {
    id: "RSQW-102",
    emergencyId: "EMG-102",
    communityGroup: "PENTUNAI HOA",
    alertType: "USER-INITIATED",
    status: "UNASSIGNED",
    lastSignalTime: "September 7, 2025 12:00:00 PM",
    address: "Lot 11, Paraiso Rd.",
  },
];
