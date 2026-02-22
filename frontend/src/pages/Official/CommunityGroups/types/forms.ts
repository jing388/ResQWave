// Form-specific types for CreateCommunityGroupSheet

// Family details structure (matches backend)
export interface FamilyDetail {
  familyName: string;
  members: string[];
}

export interface CommunityFormData {
  assignedTerminal: string;
  communityGroupName: string;
  totalIndividuals: string;
  totalFamilies: string;
  totalKids: number;
  totalSeniorCitizen: number;
  totalPregnantWomen: number;
  totalPWDs: number;
  floodwaterDuration: string;
  floodHazards: string[];
  familyDetails: FamilyDetail[];
  notableInfo: string;
  focalPersonPhoto: File | null;
  focalPersonFirstName: string;
  focalPersonLastName: string;
  focalPersonName: string;
  focalPersonContact: string;
  focalPersonEmail: string;
  focalPersonAddress: string;
  focalPersonCoordinates: string;
  altFocalPersonPhoto: File | null;
  altFocalPersonFirstName: string;
  altFocalPersonLastName: string;
  altFocalPersonName: string;
  altFocalPersonContact: string;
  altFocalPersonEmail: string;
  boundaryGeoJSON: string;
}

export interface PhotoUrls {
  focalPersonPhoto: string | null;
  altFocalPersonPhoto: string | null;
}

export interface FormSnapshot {
  formData: CommunityFormData;
  notableInfoInputs: string[];
  isEditing: boolean;
  editData?: unknown;
}

export interface SessionState {
  snapshot: FormSnapshot | null;
  shouldReopen: boolean;
}

// Utility types for form field updates
export type FormField = keyof CommunityFormData;
export type FormUpdateFunction = <K extends FormField>(
  field: K,
  value: CommunityFormData[K],
) => void;

// Photo handling types
export interface PhotoHandlers {
  handlePhotoUpload: (
    type: "focalPersonPhoto" | "altFocalPersonPhoto",
    file: File | null,
  ) => void;
  removePhoto: (type: "focalPersonPhoto" | "altFocalPersonPhoto") => void;
}
