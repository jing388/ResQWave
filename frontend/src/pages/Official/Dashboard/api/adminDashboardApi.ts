const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export interface MapPinData {
  neighborhoodID: string;
  terminalID: string;
  terminalName: string;
  terminalStatus: string;
  latestAlertTime: string | null;
  totalAlerts: number;
  focalPerson: string;
  address: string | Record<string, unknown>;// Can be string or parsed JSON object
  contactNumber: string;
}

/**
 * Fetch aggregated map data from backend
 * This endpoint returns all neighborhoods with their terminals and focal persons
 */
export const fetchAggregatedMapData = async (): Promise<MapPinData[]> => {
  try {
    const token = localStorage.getItem("resqwave_token");
    const response = await fetch(`${API_BASE_URL}/admin-dashboard/map`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("[adminDashboardApi] Error fetching aggregated map data:", error);
    throw error;
  }
};
