import { useEffect, useState } from "react";
import { formStore } from "../store/formStore";

export function useFormStore() {
  const [state, setState] = useState(() => formStore.getState());

  useEffect(() => {
    const unsubscribe = formStore.subscribe(() => {
      setState(formStore.getState());
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    updateFormData: formStore.updateFormData,
    setFormData: formStore.setFormData,
    updatePhotoUrls: formStore.updatePhotoUrls,
    setPhotoUrls: formStore.setPhotoUrls,
    setNotableInfoInputs: formStore.setNotableInfoInputs,
    updateNotableInfoInputs: formStore.updateNotableInfoInputs,
    setIsDirty: formStore.setIsDirty,
    setIsEditing: formStore.setIsEditing,
    setEditData: formStore.setEditData,
    handleFileUpload: formStore.handleFileUpload,
    cleanupPhotoUrls: formStore.cleanupPhotoUrls,
    resetForm: formStore.resetForm,
  };
}
