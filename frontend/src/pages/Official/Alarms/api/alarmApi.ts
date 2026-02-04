import type { Alarm } from "../types";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

interface BackendAlarm {
  id: number;
  terminalID: string;
  terminalName: string;
  name: string;
  status: string;
  severity: string;
  createdAt: string;
  updatedAt: string;
  terminalAddress?: string;
}

// Transform backend data to frontend format
const transformAlarmData = (backendAlarm: BackendAlarm): Alarm => {
  return {
    id: backendAlarm.id.toString(),
    terminalId: backendAlarm.terminalID,
    terminalName: backendAlarm.terminalName,
    alert: backendAlarm.name,
    status: backendAlarm.status,
    severity: backendAlarm.severity,
    createdAt: formatDate(backendAlarm.createdAt),
    updatedAt: formatDate(backendAlarm.updatedAt),
    terminalAddress: backendAlarm.terminalAddress,
  };
};

// Format date to readable string
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return dateString;
  }
};

export const alarmApi = {
  // Fetch all alarms
  getAllAlarms: async (): Promise<Alarm[]> => {
    try {
      const token = localStorage.getItem("resqwave_token");
      
      const response = await fetch(`${API_BASE_URL}/alarms`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alarms: ${response.statusText}`);
      }

      const data: BackendAlarm[] = await response.json();
      return data.map(transformAlarmData);
    } catch (error) {
      console.error("Error fetching alarms:", error);
      throw error;
    }
  },

  // Fetch active alarms
  getActiveAlarms: async (): Promise<Alarm[]> => {
    try {
      const token = localStorage.getItem("resqwave_token");
      
      const response = await fetch(`${API_BASE_URL}/alarms/active`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch active alarms: ${response.statusText}`);
      }

      const data: BackendAlarm[] = await response.json();
      return data.map(transformAlarmData);
    } catch (error) {
      console.error("Error fetching active alarms:", error);
      throw error;
    }
  },

  // Fetch cleared alarms
  getClearedAlarms: async (): Promise<Alarm[]> => {
    try {
      const token = localStorage.getItem("resqwave_token");
      
      const response = await fetch(`${API_BASE_URL}/alarms/cleared`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cleared alarms: ${response.statusText}`);
      }

      const data: BackendAlarm[] = await response.json();
      return data.map(transformAlarmData);
    } catch (error) {
      console.error("Error fetching cleared alarms:", error);
      throw error;
    }
  },

  // Create a new alarm
  createAlarm: async (alarmData: {
    terminalID: string;
    name: string;
    status: string;
    severity: string;
  }): Promise<Alarm> => {
    try {
      const token = localStorage.getItem("resqwave_token");

      const response = await fetch(`${API_BASE_URL}/alarms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(alarmData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create alarm");
      }

      const data: BackendAlarm = await response.json();
      return transformAlarmData(data);
    } catch (error) {
      console.error("Error creating alarm:", error);
      throw error;
    }
  },
};
