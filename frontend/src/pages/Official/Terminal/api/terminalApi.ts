// API service for terminal CRUD operations
import { ApiException } from "@/pages/Official/LoginDispatcher/api/types";

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// Generic API request handler with authentication
async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    const token = localStorage.getItem("resqwave_token");

    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: "include",
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiException(
        data.message || `HTTP Error ${response.status}`,
        response.status,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }

    // Network or other errors
    throw new ApiException(
      error instanceof Error ? error.message : "Network error occurred",
    );
  }
}

// API Response Types (matching backend responses)
export interface TerminalApiResponse {
  id: string;
  name: string;
  devEUI?: string;
  status: "Online" | "Offline";
  availability?: "Available" | "Occupied";
  dateCreated: string;
  dateUpdated?: string;
  archived?: boolean;
}

// Get all active terminals
export async function getActiveTerminals(): Promise<TerminalApiResponse[]> {
  return apiRequest<TerminalApiResponse[]>("/terminal");
}

// Get all archived terminals
export async function getArchivedTerminals(): Promise<TerminalApiResponse[]> {
  return apiRequest<TerminalApiResponse[]>("/terminal/archived");
}

// Get single terminal by ID
export async function getTerminal(id: string): Promise<TerminalApiResponse> {
  return apiRequest<TerminalApiResponse>(`/terminal/${id}`);
}

// Get next terminal ID (for frontend preview)
export async function getNextTerminalId(): Promise<{ nextId: string }> {
  return apiRequest<{ nextId: string }>("/terminal/next-id");
}

// Create new terminal
export async function createTerminal(terminalData: {
  name: string;
  devEUI: string;
}): Promise<{ message: string; terminal: TerminalApiResponse }> {
  return apiRequest<{ message: string; terminal: TerminalApiResponse }>(
    "/terminal",
    {
      method: "POST",
      body: JSON.stringify(terminalData),
    },
  );
}

// Update terminal
export async function updateTerminal(
  id: string,
  terminalData: {
    name?: string;
    status?: "Online" | "Offline";
  },
): Promise<{ message: string; terminal: TerminalApiResponse }> {
  return apiRequest<{ message: string; terminal: TerminalApiResponse }>(
    `/terminal/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(terminalData),
    },
  );
}

// Archive terminal (soft delete)
export async function archiveTerminal(
  id: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/terminal/${id}`, {
    method: "DELETE",
  });
}

// Unarchive terminal
export async function unarchiveTerminal(
  id: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/terminal/${id}`, {
    method: "PATCH",
  });
}

// Permanently delete terminal (only archived terminals)
export async function permanentDeleteTerminal(
  id: string,
): Promise<{ message: string; deletedAlerts?: number }> {
  return apiRequest<{ message: string; deletedAlerts?: number }>(
    `/terminal/${id}/permanent`,
    {
      method: "DELETE",
    },
  );
}

// Helper function to safely format dates
function formatDateSafe(dateString: string): string {
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date received:", dateString);
      return "Invalid Date";
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "Invalid Date";
  }
}

// Helper function to convert backend response to frontend Terminal type
export function transformTerminalResponse(apiData: TerminalApiResponse) {
  return {
    id: apiData.id,
    name: apiData.name,
    status: apiData.status,
    availability: apiData.availability || "Available",
    dateCreated: formatDateSafe(apiData.dateCreated),
    dateUpdated: apiData.dateUpdated
      ? formatDateSafe(apiData.dateUpdated)
      : formatDateSafe(apiData.dateCreated),
  };
}

// Helper function to convert backend response to frontend TerminalDetails type
export function transformTerminalDetailsResponse(apiData: TerminalApiResponse) {
  return {
    devEUI: apiData.devEUI || "",
    id: apiData.id,
    name: apiData.name,
    status: apiData.status,
    availability: apiData.availability || "Available",
    dateCreated: formatDateSafe(apiData.dateCreated),
    dateUpdated: apiData.dateUpdated
      ? formatDateSafe(apiData.dateUpdated)
      : formatDateSafe(apiData.dateCreated),
  };
}
