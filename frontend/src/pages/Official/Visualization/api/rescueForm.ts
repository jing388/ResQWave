import { apiFetch } from "@/pages/Official/Reports/api/api";

export interface CreateRescueFormRequest {
  focalUnreachable: boolean;
  waterLevel?: string;
  waterLevelDetails?: string;
  urgencyOfEvacuation?: string;
  urgencyDetails?: string;
  hazardPresent?: string;
  hazardDetails?: string;
  accessibility?: string;
  accessibilityDetails?: string;
  resourceNeeds?: string;
  resourceDetails?: string;
  otherInformation?: string;
  status: "Waitlisted" | "Dispatched";
}

export interface RescueFormResponse {
  id: string;
  emergencyID: string;
  dispatcherID: string;
  focalPersonID: string | null;
  focalUnreachable: boolean;
  waterLevel: string | null;
  urgencyOfEvacuation: string | null;
  hazardPresent: string | null;
  accessibility: string | null;
  resourceNeeds: string | null;
  otherInformation: string | null;
  status: "Waitlisted" | "Dispatched";
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a rescue form for an alert
 */
export async function createRescueForm(
  alertID: string,
  formData: CreateRescueFormRequest,
): Promise<RescueFormResponse> {
  try {
    const response = await apiFetch<RescueFormResponse>(`/forms/${alertID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    return response;
  } catch (error) {
    console.error("[RescueForm API] Error creating rescue form:", error);
    throw error;
  }
}

/**
 * Get a specific rescue form
 */
export async function getRescueForm(
  formID: string,
): Promise<RescueFormResponse> {
  try {
    const response = await apiFetch<RescueFormResponse>(`/forms/${formID}`);
    return response;
  } catch (error) {
    console.error("[RescueForm API] Error fetching rescue form:", error);
    throw error;
  }
}

/**
 * Get all rescue forms
 */
export async function getAllRescueForms(): Promise<RescueFormResponse[]> {
  try {
    const response = await apiFetch<RescueFormResponse[]>("/forms");
    return response;
  } catch (error) {
    console.error("[RescueForm API] Error fetching all rescue forms:", error);
    throw error;
  }
}

/**
 * Update rescue form status (for dispatching waitlisted forms)
 */
export async function updateRescueFormStatus(
  alertID: string,
  status: "Waitlisted" | "Dispatched",
): Promise<RescueFormResponse> {
  try {
    const response = await apiFetch<RescueFormResponse>(
      `/forms/${alertID}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      },
    );

    return response;
  } catch (error) {
    console.error("[RescueForm API] Error updating rescue form status:", error);
    throw error;
  }
}
