import type { CommunityFormData } from "../types/forms";

interface PhotoUrls {
  focalPersonPhoto: string | null;
  altFocalPersonPhoto: string | null;
}

interface GlobalFormState {
  formData: CommunityFormData;
  photoUrls: PhotoUrls;
  notableInfoInputs: string[];
  isDirty: boolean;
  isEditing: boolean;
  editData: unknown;
}

const createInitialFormData = (): CommunityFormData => ({
  assignedTerminal: "",
  communityGroupName: "",
  totalIndividuals: "",
  totalFamilies: "",
  totalKids: 0,
  totalSeniorCitizen: 0,
  totalPregnantWomen: 0,
  totalPWDs: 0,
  floodwaterDuration: "",
  floodHazards: [],
  notableInfo: "",
  focalPersonPhoto: null,
  focalPersonFirstName: "",
  focalPersonLastName: "",
  focalPersonName: "",
  focalPersonContact: "",
  focalPersonEmail: "",
  focalPersonAddress: "",
  focalPersonCoordinates: "",
  altFocalPersonPhoto: null,
  altFocalPersonFirstName: "",
  altFocalPersonLastName: "",
  altFocalPersonName: "",
  altFocalPersonContact: "",
  altFocalPersonEmail: "",
  boundaryGeoJSON: "",
});

// Global state - persists across navigation
let globalFormState: GlobalFormState = {
  formData: createInitialFormData(),
  photoUrls: { focalPersonPhoto: null, altFocalPersonPhoto: null },
  notableInfoInputs: [],
  isDirty: false,
  isEditing: false,
  editData: null,
};

// Subscribers for state changes
const subscribers = new Set<() => void>();

// Global form store
export const formStore = {
  getState: () => globalFormState,

  setState: (updater: (state: GlobalFormState) => GlobalFormState) => {
    globalFormState = updater(globalFormState);
    subscribers.forEach((callback) => callback());
  },

  updateFormData: (data: Partial<CommunityFormData>) => {
    formStore.setState((state) => ({
      ...state,
      formData: { ...state.formData, ...data },
      isDirty: true,
    }));
  },

  setFormData: (data: CommunityFormData) => {
    formStore.setState((state) => ({
      ...state,
      formData: data,
    }));
  },

  updatePhotoUrls: (urls: Partial<PhotoUrls>) => {
    formStore.setState((state) => ({
      ...state,
      photoUrls: { ...state.photoUrls, ...urls },
    }));
  },

  setPhotoUrls: (urls: PhotoUrls) => {
    formStore.setState((state) => ({
      ...state,
      photoUrls: urls,
    }));
  },

  setNotableInfoInputs: (inputs: string[]) => {
    formStore.setState((state) => ({
      ...state,
      notableInfoInputs: inputs,
    }));
  },

  updateNotableInfoInputs: (updater: (prev: string[]) => string[]) => {
    formStore.setState((state) => ({
      ...state,
      notableInfoInputs: updater(state.notableInfoInputs),
      isDirty: true,
    }));
  },

  setIsDirty: (dirty: boolean) => {
    formStore.setState((state) => ({
      ...state,
      isDirty: dirty,
    }));
  },

  setIsEditing: (editing: boolean) => {
    formStore.setState((state) => ({
      ...state,
      isEditing: editing,
    }));
  },

  setEditData: (data: unknown) => {
    formStore.setState((state) => ({
      ...state,
      editData: data,
    }));
  },

  handleFileUpload: (
    field: "focalPersonPhoto" | "altFocalPersonPhoto",
    file: File | null,
  ) => {
    const currentState = formStore.getState();

    // Update form data
    formStore.setState((state) => ({
      ...state,
      formData: { ...state.formData, [field]: file },
      isDirty: true,
    }));

    // Create and store the photo URL for display
    if (file) {
      const url = URL.createObjectURL(file);
      formStore.updatePhotoUrls({ [field]: url });
    } else {
      // Clean up existing URL and remove it
      if (currentState.photoUrls[field]) {
        URL.revokeObjectURL(currentState.photoUrls[field]!);
      }
      formStore.updatePhotoUrls({ [field]: null });
    }
  },

  cleanupPhotoUrls: () => {
    const state = formStore.getState();
    if (
      state.photoUrls.focalPersonPhoto &&
      state.photoUrls.focalPersonPhoto.startsWith("blob:")
    ) {
      try {
        URL.revokeObjectURL(state.photoUrls.focalPersonPhoto);
      } catch {
        // Ignore cleanup errors
      }
    }

    if (
      state.photoUrls.altFocalPersonPhoto &&
      state.photoUrls.altFocalPersonPhoto.startsWith("blob:")
    ) {
      try {
        URL.revokeObjectURL(state.photoUrls.altFocalPersonPhoto);
      } catch {
        // Ignore cleanup errors
      }
    }
  },

  resetForm: () => {
    formStore.cleanupPhotoUrls();
    formStore.setState(() => ({
      formData: createInitialFormData(),
      photoUrls: { focalPersonPhoto: null, altFocalPersonPhoto: null },
      notableInfoInputs: [],
      isDirty: false,
      isEditing: false,
      editData: null,
    }));
  },

  subscribe: (callback: () => void) => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },
};
