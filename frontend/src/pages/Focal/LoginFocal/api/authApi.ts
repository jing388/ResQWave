import type {
    FocalPasswordResetResponse,
    FocalPasswordUpdateResponse,
    FocalResetCodeVerificationResponse
} from "./types";
import { ApiException } from "./types";

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// Generic API request handler
async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
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
        data,
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

// Password Reset Flow APIs for Focal Users

// Request password reset - sends code to email
export async function requestFocalPasswordReset(emailOrNumber: string): Promise<FocalPasswordResetResponse> {
  return apiRequest("/focal/reset", {
    method: "POST",
    body: JSON.stringify({ emailOrNumber }),
  });
}

// Verify reset code
export async function verifyFocalResetCode(
  userID: number,
  code: string,
): Promise<FocalResetCodeVerificationResponse> {
  return apiRequest("/verifyResetCode", {
    method: "POST",
    body: JSON.stringify({ userID, code }),
  });
}

// Reset password with new password
export async function resetFocalPassword(
  userID: number,
  code: string,
  newPassword: string,
): Promise<FocalPasswordUpdateResponse> {
  return apiRequest("/resetPassword", {
    method: "POST",
    body: JSON.stringify({ userID, code, newPassword }),
  });
}

// Resend verification code
export async function resendFocalPasswordResetCode(emailOrNumber: string): Promise<FocalPasswordResetResponse> {
  return requestFocalPasswordReset(emailOrNumber);
}