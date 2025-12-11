// src/lib/api.ts
// Utility for making API requests to the backend using the VITE_BACKEND_URL env variable

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// Extended Error interface for API errors with response data
interface ApiError extends Error {
  response?: unknown;
}

// Global logout handler for 401/403 errors
let logoutCallback: (() => void) | null = null;

export function setGlobalLogoutCallback(callback: () => void) {
  logoutCallback = callback;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // Prefer focalToken if present, else fallback to resqwave_token
  const token =
    localStorage.getItem("focalToken") ||
    localStorage.getItem("resqwave_token");

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: "include", // send cookies if needed
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
  });

  // Handle authentication errors
  if (res.status === 401 || res.status === 403) {
    // First, try to get the error response to check if it's an admin restriction
    let errorData: { message?: string; code?: string } | null = null;
    let isAdminRestriction = false;

    try {
      const responseText = await res.text();
      errorData = JSON.parse(responseText);

      // Check if this is an admin restriction error rather than authentication error
      if (
        errorData?.code === "ADMIN_CANNOT_CREATE_RESCUE_FORM" ||
        errorData?.message?.includes("You are currently in the admin interface")
      ) {
        isAdminRestriction = true;
      }
    } catch {
      // If we can't parse the response, treat as authentication error
    }

    // If it's an admin restriction, don't trigger logout - just throw the error
    if (isAdminRestriction && errorData) {
      throw new Error(errorData.message || "Access denied");
    }

    // Check if this is a focal route - don't trigger official logout for focal auth errors
    const isFocalRoute =
      window.location.pathname.startsWith("/focal") ||
      window.location.pathname.startsWith("/login-focal") ||
      window.location.pathname.startsWith("/verification-signin-focal") ||
      window.location.pathname.startsWith("/forgot-password-focal") ||
      window.location.pathname.startsWith("/register");

    if (isFocalRoute) {
      // For focal routes, only clear focal tokens
      localStorage.removeItem("focalToken");
      localStorage.removeItem("focalId");
      sessionStorage.removeItem("focalTempToken");
    } else {
      // For official routes, clear official tokens and trigger logout
      localStorage.removeItem("resqwave_token");
      localStorage.removeItem("resqwave_user");
      sessionStorage.removeItem("tempToken");
      sessionStorage.removeItem("userType");

      // Call global logout callback if set (triggers navigation in AuthContext)
      if (logoutCallback) {
        logoutCallback();
      }
    }

    const error = errorData?.message || "Session expired. Please login again.";
    throw new Error(error);
  }

  if (!res.ok) {
    let errorMessage = res.statusText;
    let errorResponse;

    try {
      const responseText = await res.text();
      try {
        errorResponse = JSON.parse(responseText);
        if (errorResponse.message) {
          errorMessage = errorResponse.message;
        }
      } catch {
        // If JSON parsing fails, use the text as is
        errorMessage = responseText || res.statusText;
      }
    } catch {
      errorMessage = res.statusText;
    }

    const error = new Error(errorMessage);
    // Add the full error response as a property for more detailed error handling
    if (errorResponse) {
      (error as ApiError).response = errorResponse;
    }
    throw error;
  }

  return res.json();
}

// Reports API functions
export interface PendingReport {
  alertId: string;
  terminalName: string;
  alertType: string;
  dispatcherName: string;
  rescueStatus: string;
  createdAt: string;
  address: string;
  coordinates?: string;
  neighborhoodId?: string;
  focalPersonName?: string;
}

export interface CompletedReport {
  alertId: string;
  terminalName: string;
  alertType: string;
  dispatcherName: string;
  rescueStatus: string;
  createdAt: string;
  completedAt: string;
  address: string;
}

export interface ArchivedReport {
  emergencyId: string;
  terminalName: string;
  focalFirstName: string;
  focalLastName: string;
  dateTimeOccurred: string;
  alertType: string;
  houseAddress: string;
  dispatchedName: string;
  completionDate: string;
}

export async function fetchPendingReports(
  refresh = false,
): Promise<PendingReport[]> {
  let url = refresh ? "/post/pending?refresh=true" : "/post/pending";
  if (refresh) {
    url += `&t=${Date.now()}`; // Add timestamp to prevent browser caching
  }
  const options = refresh
    ? {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    : {};
  return apiFetch<PendingReport[]>(url, options);
}

export async function fetchCompletedReports(
  refresh = false,
): Promise<CompletedReport[]> {
  let url = refresh ? "/post/completed?refresh=true" : "/post/completed";
  if (refresh) {
    url += `&t=${Date.now()}`; // Add timestamp to prevent browser caching
  }
  const options = refresh
    ? {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    : {};
  return apiFetch<CompletedReport[]>(url, options);
}

export async function fetchArchivedReports(
  refresh = false,
): Promise<ArchivedReport[]> {
  let url = refresh ? "/post/archived?refresh=true" : "/post/archived";
  if (refresh) {
    url += `&t=${Date.now()}`; // Add timestamp to prevent browser caching
  }
  const options = refresh
    ? {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    : {};
  return apiFetch<ArchivedReport[]>(url, options);
}

export async function clearReportsCache(): Promise<unknown> {
  return apiFetch("/post/cache", {
    method: "DELETE",
  });
}

export async function createPostRescueForm(
  alertId: string,
  data: {
    noOfPersonnelDeployed: number;
    resourcesUsed: { name: string; quantity: number }[];
    actionTaken: string;
  },
): Promise<unknown> {
  return apiFetch(`/post/${alertId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function archivePostRescueForm(
  alertId: string,
): Promise<unknown> {
  return apiFetch(`/post/archive/${alertId}`, {
    method: "DELETE",
  });
}

export async function restorePostRescueForm(
  alertId: string,
): Promise<unknown> {
  return apiFetch(`/post/restore/${alertId}`, {
    method: "POST",
  });
}

export async function deletePostRescueForm(
  alertId: string,
): Promise<unknown> {
  return apiFetch(`/post/delete/${alertId}`, {
    method: "DELETE",
  });
}

// Chart data interfaces and functions
export interface AlertTypeChartData {
  date: string;
  userInitiated: number;
  critical: number;
}

export async function fetchAlertTypeChartData(
  timeRange: string = "last3months",
): Promise<AlertTypeChartData[]> {
  return apiFetch<AlertTypeChartData[]>(
    `/post/chart/alert-types?timeRange=${timeRange}`,
  );
}

// Detailed report data interface and function for PDF generation
export interface DetailedReportData {
  alertId: string;
  emergencyId: string;
  neighborhoodId: string;
  terminalName: string;
  focalPersonName: string;
  focalPersonAddress: string;
  focalPersonContactNumber: string;
  waterLevel: string;
  urgencyOfEvacuation: string;
  hazardPresent: string;
  accessibility: string;
  resourceNeeds: string;
  otherInformation: string;
  alertType: string;
  timeOfRescue: string;
  dateTimeOccurred: string;
  dispatcherName: string;
  rescueFormId: string;
  postRescueFormId: string;
  noOfPersonnelDeployed: string;
  resourcesUsed: { name: string; quantity: number }[] | string;
  actionTaken: string;
  rescueCompletionTime: string;
}

export async function fetchDetailedReportData(
  alertId: string,
): Promise<DetailedReportData> {
  return apiFetch<DetailedReportData>(`/post/report/${alertId}`);
}
