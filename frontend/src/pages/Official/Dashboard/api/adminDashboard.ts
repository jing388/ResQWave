import { apiFetch } from "@/pages/Official/Reports/api/api";

// Response types from backend
export interface AdminDashboardStats {
  payload: {
    activeTerminals: number;
    activeDispatchers: number;
    activeNeighborhoods: number;
    completedOperations: number;
    alertTypes: {
      critical: number;
      userInitiated: number;
      total: number;
    };
  };
}

export interface AggregatedMapData {
  neighborhoodID: number;
  terminalID: number | null;
  terminalStatus: "Online" | "Offline" | null;
  latestAlertTime: string | null;
  totalAlerts: number;
  focalPerson: string;
  address: string | { address?: string; coordinates?: string; lat?: number; lng?: number };
  contactNumber: string;
}

/**
 * Fetch admin dashboard statistics
 * Endpoint: GET /admin-dashboard/stats
 * Returns active counts and alert type breakdown
 */
export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  return await apiFetch<AdminDashboardStats>("/admin-dashboard/stats");
}

/**
 * Fetch aggregated map data for all neighborhoods
 * Endpoint: GET /admin-dashboard/map
 * Returns neighborhood data with terminals, focal persons, and alert information
 */
export async function fetchAggregatedMapData(): Promise<AggregatedMapData[]> {
  return await apiFetch<AggregatedMapData[]>("/admin-dashboard/map");
}

// Alert statistics response from /graph endpoint
export interface AlertStatsResponse {
  type: "daily" | "weekly" | "monthly" | "yearly";
  stats: {
    [key: string]: {
      userInitiated: number;
      critical: number;
    };
  };
}

/**
 * Fetch alert statistics for charts
 * Endpoint: GET /graph?type={daily|weekly|monthly|yearly}
 * Returns aggregated alert data grouped by time periods
 */
export async function fetchAlertStats(
  type: "daily" | "weekly" | "monthly" | "yearly"
): Promise<AlertStatsResponse> {
  return await apiFetch<AlertStatsResponse>(`/graph?type=${type}`);
}

/**
 * Fetch completed operations statistics for admin dashboard charts
 * Endpoint: GET /graph/completed-operations?type={daily|weekly|monthly|yearly}&startDate={date}&endDate={date}
 * Returns aggregated data from completed rescue forms grouped by completion date
 * Optionally accepts custom date range parameters
 */
export async function fetchCompletedOperationsStats(
  type: "daily" | "weekly" | "monthly" | "yearly",
  startDate?: Date,
  endDate?: Date
): Promise<AlertStatsResponse> {
  let url = `/graph/completed-operations?type=${type}`;
  
  // Add custom date range if provided
  if (startDate && endDate) {
    const startDateStr = startDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const endDateStr = endDate.toISOString().split('T')[0];
    url += `&startDate=${startDateStr}&endDate=${endDateStr}`;
    
    // Add timestamp to prevent browser caching
    url += `&_t=${Date.now()}`;
  }
  
  return await apiFetch<AlertStatsResponse>(url);
}
