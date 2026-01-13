// API service for dispatcher CRUD operations
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
export interface DispatcherApiResponse {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  createdAt: string;
  updatedAt?: string;
  photo?: string | { type: "Buffer"; data: number[] } | null; // LONGBLOB from backend
  createdBy?: string;
  archived?: boolean;
}

// Get all active dispatchers
export async function getActiveDispatchers(): Promise<DispatcherApiResponse[]> {
  return apiRequest<DispatcherApiResponse[]>("/dispatcher");
}

// Get all archived dispatchers
export async function getArchivedDispatchers(): Promise<
  DispatcherApiResponse[]
> {
  return apiRequest<DispatcherApiResponse[]>("/dispatcher/archived");
}

// Get single dispatcher by ID
export async function getDispatcher(
  id: string,
): Promise<DispatcherApiResponse> {
  return apiRequest<DispatcherApiResponse>(`/dispatcher/${id}`);
}

// Create new dispatcher
export async function createDispatcher(dispatcherData: {
  name: string;
  email: string;
  contactNumber: string;
}): Promise<{ message: string }> {
  const token = localStorage.getItem("resqwave_token");

  // Create FormData for multipart upload
  const formData = new FormData();
  formData.append("name", dispatcherData.name);
  formData.append("email", dispatcherData.email);
  formData.append("contactNumber", dispatcherData.contactNumber);

  const response = await fetch(`${API_BASE_URL}/dispatcher`, {
    method: "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      // Don't set Content-Type for FormData - browser will set it with boundary
    },
    credentials: "include",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new ApiException(
      result.message || `HTTP Error ${response.status}`,
      response.status,
    );
  }

  return result;
}

// Update dispatcher
export async function updateDispatcher(
  id: string,
  data: FormData,
): Promise<{ message: string }> {
  const token = localStorage.getItem("resqwave_token");

  const response = await fetch(`${API_BASE_URL}/dispatcher/${id}`, {
    method: "PUT",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      // Don't set Content-Type for FormData
    },
    credentials: "include",
    body: data,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new ApiException(
      result.message || `HTTP Error ${response.status}`,
      response.status,
    );
  }

  return result;
}

// Archive dispatcher (soft delete)
export async function archiveDispatcher(
  id: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/dispatcher/${id}`, {
    method: "DELETE",
  });
}

// Restore dispatcher from archive
export async function restoreDispatcher(
  id: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/dispatcher/${id}/restore`, {
    method: "PATCH",
  });
}

// Permanently delete dispatcher (hard delete)
export async function deleteDispatcherPermanently(
  id: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/dispatcher/${id}/permanent`, {
    method: "DELETE",
  });
}

// Check if email exists in database
export async function checkEmailExists(
  email: string,
  excludeId?: string
): Promise<{ exists: boolean }> {
  try {
    // Get all active dispatchers and check if email exists
    const dispatchers = await getActiveDispatchers();
    const emailExists = dispatchers.some(dispatcher => 
      dispatcher.email.toLowerCase() === email.toLowerCase() && 
      dispatcher.id !== excludeId
    );
    return { exists: emailExists };
  } catch (error) {
    // If there's an error fetching dispatchers, assume email doesn't exist
    // to avoid blocking legitimate users
    console.error('Error checking email existence:', error);
    return { exists: false };
  }
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

// Helper function to convert backend response to frontend Dispatcher type
export function transformDispatcherResponse(apiData: DispatcherApiResponse) {
  return {
    id: apiData.id,
    name: apiData.name,
    contactNumber: apiData.contactNumber,
    email: apiData.email,
    createdAt: formatDateSafe(apiData.createdAt),
  };
}

// Helper function to convert backend response to frontend DispatcherDetails type
export function transformDispatcherDetailsResponse(
  apiData: DispatcherApiResponse,
) {
  // Helper to convert photo BLOB/Buffer data to base64 data URL
  const processPhoto = (
    photoData: string | { type: "Buffer"; data: number[] } | null | undefined,
  ): string | undefined => {
    console.log("🔄 Processing photo data type:", typeof photoData);
    console.log("🔄 Photo data:", photoData);

    // Handle null, undefined, or empty values
    if (!photoData || photoData === null || photoData === undefined) {
      console.log("❌ No photo data");
      return undefined;
    }

    try {
      // If it's already a data URL, return as is
      if (typeof photoData === "string" && photoData.startsWith("data:")) {
        console.log("✅ Already a data URL");
        return photoData;
      }

      // If it's a base64 string without data URL prefix
      if (typeof photoData === "string" && photoData.length > 0) {
        console.log("✅ Converting base64 string to data URL");
        return `data:image/jpeg;base64,${photoData}`;
      }

      // Handle BLOB data from database (most common case)
      // MySQL LONGBLOB is returned as a Buffer object serialized as JSON
      if (
        photoData &&
        typeof photoData === "object" &&
        photoData.type === "Buffer" &&
        Array.isArray(photoData.data)
      ) {
        console.log(
          "🔄 Converting Buffer to base64, size:",
          photoData.data.length,
        );

        if (photoData.data.length === 0) {
          console.log("❌ Empty buffer");
          return undefined;
        }

        // Convert buffer data array to base64
        const uint8Array = new Uint8Array(photoData.data);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        console.log(
          "✅ Successfully converted Buffer to data URL, length:",
          dataUrl.length,
        );
        return dataUrl;
      }

      // Handle direct buffer/blob data
      if (photoData instanceof Uint8Array || photoData instanceof ArrayBuffer) {
        console.log("🔄 Converting ArrayBuffer/Uint8Array to base64");
        const uint8Array =
          photoData instanceof ArrayBuffer
            ? new Uint8Array(photoData)
            : photoData;

        if (uint8Array.length === 0) {
          console.log("❌ Empty array buffer");
          return undefined;
        }

        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        console.log(
          "✅ Successfully converted ArrayBuffer to data URL, length:",
          dataUrl.length,
        );
        return dataUrl;
      }

      console.warn(
        "⚠️ Unknown photo data format:",
        typeof photoData,
        "Constructor:",
        photoData?.constructor?.name,
      );
      return undefined;
    } catch (error) {
      console.error("❌ Error processing photo data:", error);
      return undefined;
    }
  };

  return {
    id: apiData.id,
    name: apiData.name,
    contactNumber: apiData.contactNumber,
    email: apiData.email,
    createdAt: formatDateSafe(apiData.createdAt),
    createdBy: apiData.createdBy,
    photo: processPhoto(apiData.photo),
  };
}
