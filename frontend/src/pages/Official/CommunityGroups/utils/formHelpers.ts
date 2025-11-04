import type { CommunityGroupDetails } from "../types"
import type { CommunityFormData } from "../types/forms"

/**
 * Converts form data to the expected info data format for saving
 */
export const convertFormToInfoData = (
  formData: CommunityFormData,
  notableInfoInputs: string[]
): CommunityGroupDetails => {
  // Derive address, coordinates array, and boundary object for frontend-only persistence
  const address = formData.focalPersonAddress || ""
  let coordinatesArr: number[] = []

  if (formData.focalPersonCoordinates && formData.focalPersonCoordinates.includes(",")) {
    const [lngStr, latStr] = formData.focalPersonCoordinates.split(",")
    const lng = Number(lngStr)
    const lat = Number(latStr)
    if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
      coordinatesArr = [lng, lat]
    }
  }

  try {
    if (formData.boundaryGeoJSON) JSON.parse(formData.boundaryGeoJSON)
  } catch { /* Ignore JSON parse errors */ }

  return {
    name: formData.communityGroupName || "Untitled Community",
    terminalId: formData.assignedTerminal || "",
    communityId: "",
    individuals: formData.totalIndividuals,
    families: formData.totalFamilies,
    notableInfo: notableInfoInputs.filter((s) => s && s.trim().length > 0),
    hazards: formData.floodHazards,
    address: address || undefined,
    coordinates: coordinatesArr.length === 2 ? coordinatesArr.join(",") : undefined,
    focalPerson: {
      name: `${formData.focalPersonFirstName || ''} ${formData.focalPersonLastName || ''}`.trim() || formData.focalPersonName,
      photo: formData.focalPersonPhoto ? URL.createObjectURL(formData.focalPersonPhoto) : undefined,
      contactNumber: formData.focalPersonContact,
      email: formData.focalPersonEmail,
      houseAddress: formData.focalPersonAddress,
      coordinates: formData.focalPersonCoordinates,
    },
    alternativeFocalPerson: {
      altName: `${formData.altFocalPersonFirstName || ''} ${formData.altFocalPersonLastName || ''}`.trim() || formData.altFocalPersonName,
      altPhoto: formData.altFocalPersonPhoto ? URL.createObjectURL(formData.altFocalPersonPhoto) : undefined,
      altContactNumber: formData.altFocalPersonContact,
      altEmail: formData.altFocalPersonEmail,
    },
  }
}

/**
 * Creates initial form data structure
 */
export const createInitialFormData = (): CommunityFormData => ({
  assignedTerminal: "",
  communityGroupName: "",
  totalIndividuals: "0",
  totalFamilies: "0",
  totalKids: 0,
  totalSeniorCitizen: 0,
  totalPregnantWomen: 0,
  totalPWDs: 0,
  floodwaterDuration: "",
  floodHazards: [],
  notableInfo: "",
  focalPersonPhoto: null as File | null,
  focalPersonFirstName: "",
  focalPersonLastName: "",
  focalPersonName: "",
  focalPersonContact: "",
  focalPersonEmail: "",
  focalPersonAddress: "",
  focalPersonCoordinates: "",
  altFocalPersonPhoto: null as File | null,
  altFocalPersonFirstName: "",
  altFocalPersonLastName: "",
  altFocalPersonName: "",
  altFocalPersonContact: "",
  altFocalPersonEmail: "",
  boundaryGeoJSON: "",
})