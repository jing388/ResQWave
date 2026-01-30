import { API_BASE_URL, apiFetch } from "@/pages/Official/Reports/api/api";
import type { CommunityFormData } from "../types/forms";
/**
 * Archive a neighborhood (move from active to archived)
 * Sets archived from 0 to 1 in the neighborhood table
 */
export async function archiveNeighborhood(
  id: string,
): Promise<{ message: string }> {
  return apiFetch(`/neighborhood/${id}`, { method: "DELETE" });
}

/**
 * Permanently delete an archived neighborhood from the database
 */
export async function deleteNeighborhood(
  id: string,
): Promise<{ message: string }> {
  return apiFetch(`/neighborhood/${id}/permanent`, { method: "DELETE" });
}

/**
 * Unarchive a neighborhood and assign it to a terminal
 * Moves neighborhood from archived to active
 */
export async function unarchiveNeighborhood(
  id: string,
  terminalID: string,
): Promise<{ message: string }> {
  return apiFetch(`/neighborhood/${id}/restore`, {
    method: "PATCH",
    body: JSON.stringify({ terminalID }),
  });
}

/**
 * Update an existing neighborhood and its focal person (like EditAboutCommunity pattern)
 */
export async function updateNeighborhood(
  id: string,
  formData: CommunityFormData,
  photos?: {
    mainPhoto?: File;
    altPhoto?: File;
  },
  deletedPhotos?: {
    mainPhotoDeleted?: boolean;
    altPhotoDeleted?: boolean;
  },
): Promise<{ message: string }> {
  const payload = transformFormDataToPayload(formData);

  // First, update the neighborhood data (without photos)
  const response = (await apiFetch(`/neighborhood/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })) as { message: string };

  // Get the neighborhood details to get the focal person ID
  const neighborhoodDetails = (await getNeighborhoodDetails(id)) as Record<
    string,
    unknown
  >;
  const focalPersonData = neighborhoodDetails.focalPerson as Record<
    string,
    unknown
  > | null;
  const focalPersonId = focalPersonData?.id as string;

  if (!focalPersonId) {
    throw new Error("Focal person not found for this neighborhood");
  }

  // Handle photo deletions first (like EditAboutCommunity)
  if (deletedPhotos?.altPhotoDeleted) {
    await deleteAltFocalPhoto(id);
  }

  // Handle photo uploads (like EditAboutCommunity)
  if (photos?.mainPhoto) {
    await updateFocalPersonPhoto(focalPersonId, photos.mainPhoto);
  }

  if (photos?.altPhoto) {
    await uploadAltFocalPhoto(id, photos.altPhoto);
  }

  return response;
}

export interface CreateCommunityGroupPayload {
  terminalID: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  password?: string;
  address: string;
  altFirstName?: string;
  altLastName?: string;
  altEmail?: string;
  altContactNumber?: string;
  noOfHouseholds: string;
  noOfResidents: string;
  floodSubsideHours: string;
  hazards: string[];
  otherInformation: string;
}

import type { CommunityGroupDetails } from "../types";

/**
 * Fetch authenticated photos for a focal person
 */
export async function fetchFocalPersonPhotos(focalPersonId: string): Promise<{
  mainPhoto?: string;
  altPhoto?: string;
}> {
  const [mainPhoto, altPhoto] = await Promise.all([
    fetchAuthenticatedPhoto(`/focalperson/${focalPersonId}/photo`),
    fetchAuthenticatedPhoto(`/focalperson/${focalPersonId}/altPhoto`),
  ]);

  return {
    mainPhoto,
    altPhoto,
  };
}

/**
 * Fetch photo blob with authentication and convert to object URL
 */
async function fetchAuthenticatedPhoto(
  endpoint: string,
): Promise<string | undefined> {
  try {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    const rawResponse = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("resqwave_token")}`,
      },
    });

    if (!rawResponse.ok) {
      console.error(
        "Photo fetch failed:",
        rawResponse.status,
        rawResponse.statusText,
      );
      return undefined;
    }

    const blob = await rawResponse.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error fetching photo:", error);
    return undefined;
  }
}

/**
 * Fetch neighborhood details from backend and transform to frontend CommunityGroupDetails
 */
export async function fetchNeighborhoodDetailsTransformed(
  id: string,
): Promise<CommunityGroupDetails> {
  const raw = (await getNeighborhoodDetails(id)) as Record<string, unknown>;

  const focal = (raw.focalPerson as Record<string, unknown>) || null;

  // Do not parse address here; just pass as string
  const focalPerson = focal
    ? {
        name:
          [focal.firstName, focal.lastName].filter(Boolean).join(" ") ||
          focal.firstName ||
          focal.name ||
          null,
        photo: focal.photo
          ? `${API_BASE_URL}/focalperson/${focal.id}/photo`
          : undefined,
        contactNumber: focal.contactNumber || null,
        email: focal.email || null,
        houseAddress: focal.address || raw.address || null,
        coordinates: raw.coordinates || focal.coordinates || undefined,
      }
    : {
        name: null,
        photo: undefined,
        contactNumber: null,
        email: null,
        houseAddress: raw.address || null,
        coordinates: raw.coordinates || undefined,
      };

  const alt = focal
    ? {
        altName:
          [focal.altFirstName, focal.altLastName].filter(Boolean).join(" ") ||
          focal.altFirstName ||
          focal.altName ||
          null,
        altPhoto: focal.alternativeFPImage
          ? `${API_BASE_URL}/focalperson/${focal.id}/altPhoto`
          : undefined,
        altContactNumber: focal.altContactNumber || null,
        altEmail: focal.altEmail || null,
      }
    : {
        altName: null,
        altPhoto: undefined,
        altContactNumber: null,
        altEmail: null,
      };

  return {
    name: String(raw.name || focalPerson.name || `Neighborhood ${raw.id}`),
    terminalId: String(raw.terminalID || raw.terminalId || ""),
    communityId: String(raw.id),
    individuals: String(raw.noOfResidents || ""),
    families: String(raw.noOfHouseholds || ""),
    floodSubsideHours: String(raw.floodSubsideHours || ""),
    hazards: raw.hazards
      ? Array.isArray(raw.hazards)
        ? raw.hazards
        : [String(raw.hazards)]
      : [],
    notableInfo: raw.otherInformation
      ? Array.isArray(raw.otherInformation)
        ? raw.otherInformation
        : [String(raw.otherInformation)]
      : [],
    address: (function () {
      if (focal && focal.address) {
        try {
          if (typeof focal.address === "string") {
            const parsed = JSON.parse(focal.address);
            return parsed.address || focal.address;
          }
          return focal.address;
        } catch {
          return focal.address;
        }
      }
      return raw.address || "N/A";
    })(),
    coordinates: (function () {
      if (focal && focal.address) {
        try {
          if (typeof focal.address === "string") {
            const parsed = JSON.parse(focal.address);
            if (parsed.coordinates && typeof parsed.coordinates === "string") {
              return parsed.coordinates;
            }
          }
        } catch {
          /* Ignore missing hazard errors */
        }
      }
      return typeof raw.coordinates === "string" &&
        raw.coordinates.trim() !== ""
        ? raw.coordinates
        : undefined;
    })(),
    focalPerson: {
      name: focalPerson.name ? String(focalPerson.name) : null,
      photo: focalPerson.photo || undefined,
      contactNumber: focalPerson.contactNumber
        ? String(focalPerson.contactNumber)
        : null,
      email: focalPerson.email ? String(focalPerson.email) : null,
      houseAddress: focalPerson.houseAddress
        ? String(focalPerson.houseAddress)
        : null,
      coordinates: focalPerson.coordinates
        ? String(focalPerson.coordinates)
        : null,
    },
    alternativeFocalPerson: {
      altName: String(alt.altName || ""),
      altPhoto: alt.altPhoto || undefined,
      altContactNumber: String(alt.altContactNumber || ""),
      altEmail: String(alt.altEmail || ""),
    },
  };
}

export interface CreateCommunityGroupResponse {
  message: string;
  newFocalID: string;
  newNeighborhoodID: string;
  generatedPassword?: string;
}

/**
 * Transforms frontend form data to backend API payload format
 */
export function transformFormDataToPayload(
  formData: CommunityFormData,
): CreateCommunityGroupPayload {
  // Parse coordinates from the string format
  // IMPORTANT: Coordinates MUST be in "lng, lat" format (Mapbox standard)
  // This will be stored as JSON: {"address":"...","coordinates":"lng, lat"}
  const addressData = {
    address: formData.focalPersonAddress,
    coordinates: formData.focalPersonCoordinates,
  };

  // Convert address to string format as expected by backend
  const addressString =
    typeof addressData === "object"
      ? JSON.stringify(addressData)
      : String(addressData);

  return {
    terminalID: formData.assignedTerminal,
    firstName: formData.focalPersonFirstName,
    lastName: formData.focalPersonLastName,
    email: formData.focalPersonEmail,
    contactNumber: formData.focalPersonContact,
    address: addressString,
    altFirstName: formData.altFocalPersonFirstName || undefined,
    altLastName: formData.altFocalPersonLastName || undefined,
    altEmail: formData.altFocalPersonEmail || undefined,
    altContactNumber: formData.altFocalPersonContact || undefined,
    noOfHouseholds: formData.totalFamilies || "",
    noOfResidents: formData.totalIndividuals || "",
    floodSubsideHours: formData.floodwaterDuration || "",
    hazards: formData.floodHazards,
    otherInformation: formData.notableInfo || "",
  };
}

/**
 * Creates a new community group by creating focal person and neighborhood records
 */
/**
 * Upload alternative focal person photo separately (like EditAboutCommunity)
 */
export async function uploadAltFocalPhoto(
  neighborhoodId: string,
  photo: File,
): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append("alternativeFPImage", photo);

  const token = localStorage.getItem("resqwave_token");

  const response = await fetch(
    `${API_BASE_URL}/neighborhood/${neighborhoodId}/alt-photo`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    },
  );

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      try {
        errorMessage = (await response.text()) || errorMessage;
      } catch {
        // Keep the original statusText if both fail
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Delete alternative focal person photo (like EditAboutCommunity)
 */
export async function deleteAltFocalPhoto(
  neighborhoodId: string,
): Promise<{ message: string }> {
  const token = localStorage.getItem("resqwave_token");

  const response = await fetch(
    `${API_BASE_URL}/neighborhood/${neighborhoodId}/alt-photo`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      try {
        errorMessage = (await response.text()) || errorMessage;
      } catch {
        // Keep the original statusText if both fail
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Update main focal person photo separately
 */
export async function updateFocalPersonPhoto(
  focalPersonId: string,
  photo: File,
): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append("photo", photo);

  const token = localStorage.getItem("resqwave_token");

  const response = await fetch(
    `${API_BASE_URL}/focalperson/${focalPersonId}/photos`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    },
  );

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      try {
        errorMessage = (await response.text()) || errorMessage;
      } catch {
        // Keep the original statusText if both fail
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function createCommunityGroup(
  formData: CommunityFormData,
  photos?: {
    mainPhoto?: File;
    altPhoto?: File;
  },
): Promise<CreateCommunityGroupResponse> {
  const payload = transformFormDataToPayload(formData);

  // Use FormData to handle both JSON data and file uploads
  const formDataToSend = new FormData();

  // Add all text fields
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // For arrays, send as JSON string
        formDataToSend.append(key, JSON.stringify(value));
      } else {
        formDataToSend.append(key, String(value));
      }
    }
  });

  // Add photo files if provided
  if (photos?.mainPhoto) {
    formDataToSend.append("photo", photos.mainPhoto);
  }
  if (photos?.altPhoto) {
    formDataToSend.append("altPhoto", photos.altPhoto);
  }

  const token = localStorage.getItem("resqwave_token");

  const response = await fetch(`${API_BASE_URL}/focalperson`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      // Don't set Content-Type - browser will set it with boundary for multipart
    },
    body: formDataToSend,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If JSON parsing fails, try text
      try {
        errorMessage = (await response.text()) || errorMessage;
      } catch {
        // Keep the original statusText if both fail
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export interface Terminal {
  id: string;
  name: string;
  status: "Online" | "Offline";
  availability: "Available" | "Occupied";
  createdAt: string;
  updatedAt?: string;
  archived?: boolean;
}

/**
 * Fetches all active terminals from the backend
 */
export async function getAllTerminals(): Promise<Terminal[]> {
  return apiFetch("/terminal");
}

/**
 * Fetches only available terminals (not occupied) for assignment
 */
export async function getAvailableTerminals(): Promise<Terminal[]> {
  const allTerminals = await getAllTerminals();
  // Filter to show only available terminals (not occupied)
  return allTerminals.filter(
    (terminal) => !terminal.archived && terminal.availability === "Available",
  );
}

export interface NeighborhoodApiResponse {
  neighborhoodID: string;
  terminalID?: string; // Add terminalID to the interface
  terminalStatus: string;
  focalPerson: string | null;
  contactNumber: string | null;
  address: string | null;
  registeredAt: string | null;
}

/**
 * Fetches all active neighborhoods/community groups from backend
 */
export async function getNeighborhoods(): Promise<NeighborhoodApiResponse[]> {
  return apiFetch("/neighborhood");
}

/**
 * Fetches archived neighborhoods/community groups from backend
 */
export async function getArchivedNeighborhoods(): Promise<
  NeighborhoodApiResponse[]
> {
  return apiFetch("/neighborhood/archived");
}

/**
 * Fetches detailed neighborhood information by ID
 */
export async function getNeighborhoodDetails(
  id: string,
): Promise<Record<string, unknown>> {
  return apiFetch(`/neighborhood/${id}`);
}

/**
 * Fetches neighborhood details by terminal ID
 */
export async function getNeighborhoodByTerminalId(
  terminalId: string,
): Promise<CommunityGroupDetails | null> {
  try {
    // Get all neighborhoods and find the one with matching terminal ID
    const neighborhoods = await getNeighborhoods();
    const neighborhood = neighborhoods.find((n) => n.terminalID === terminalId);

    if (!neighborhood) {
      console.warn(`No neighborhood found for terminal ID: ${terminalId}`);
      return null;
    }

    // Get detailed information using the neighborhood ID
    return await fetchNeighborhoodDetailsTransformed(
      neighborhood.neighborhoodID,
    );
  } catch (error) {
    console.error("Error fetching neighborhood by terminal ID:", error);
    return null;
  }
}

/**
 * Transforms backend neighborhood data to frontend CommunityGroup format
 */
export function transformNeighborhoodToCommunityGroup(
  neighborhood: NeighborhoodApiResponse,
  isArchived: boolean = false,
): import("../types").CommunityGroup {
  // Map terminal status to our frontend status format
  const getStatus = (terminalStatus: string): "ONLINE" | "OFFLINE" | "N/A" => {
    // For archived neighborhoods, always show N/A regardless of terminal status
    if (isArchived) return "N/A";

    if (terminalStatus === "Online") return "ONLINE";
    if (terminalStatus === "Offline") return "OFFLINE";
    return "N/A";
  };

  // Format date with better error handling
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "Unknown";
    try {
      const date = new Date(dateStr);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date received:", dateStr);
        return "Invalid Date";
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", dateStr, error);
      return "Unknown";
    }
  };

  return {
    id: neighborhood.neighborhoodID,
    name:
      neighborhood.focalPerson || `Neighborhood ${neighborhood.neighborhoodID}`,
    status: getStatus(neighborhood.terminalStatus),
    focalPerson: neighborhood.focalPerson || "Unknown",
    contactNumber: neighborhood.contactNumber || "N/A",
    address: neighborhood.address || "No address provided",
    registeredAt: formatDate(neighborhood.registeredAt),
  };
}

/**
 * Check if email exists in focal persons database
 */
export async function checkFocalEmailExists(
  email: string,
  excludeFocalId?: string
): Promise<{ exists: boolean }> {
  try {
    // Get all focal persons and check if email exists
    const response = await apiFetch("/focalperson", { method: "GET" });
    const focalPersons = response as Array<{
      id: string;
      email: string;
      altEmail?: string;
    }>;
    
    const emailExists = focalPersons.some(focal => {
      const matchesMainEmail = focal.email?.toLowerCase() === email.toLowerCase();
      const matchesAltEmail = focal.altEmail?.toLowerCase() === email.toLowerCase();
      const isDifferentFocal = focal.id !== excludeFocalId;
      
      return (matchesMainEmail || matchesAltEmail) && isDifferentFocal;
    });
    
    return { exists: emailExists };
  } catch (error) {
    // If there's an error fetching focal persons, assume email doesn't exist
    // to avoid blocking legitimate users
    console.error('Error checking focal email existence:', error);
    return { exists: false };
  }
}
