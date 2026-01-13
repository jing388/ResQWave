import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useState } from "react";
import type { TerminalDrawerProps, TerminalFormData } from "../types";

interface FormData {
  id: string;
  name: string;
  devEUI: string;
}

interface FormErrors {
  id?: string;
  name?: string;
  devEUI?: string;
}

export function CreateTerminalSheet({
  open,
  onOpenChange,
  onSave,
  editData,
}: TerminalDrawerProps) {
  const isEditing = !!editData;

  const [formData, setFormData] = useState<FormData>({
    id: "",
    name: "",
    devEUI: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  // Removed unused isDirty state
  // Validate terminal ID (for new terminals only)
  const validateId = (id: string): string | undefined => {
    if (!id.trim()) return "Terminal ID is required";
    if (!/^RSQW-\d{3}$/.test(id.trim()))
      return "ID must be in format RSQW-XXX (e.g., RSQW-002)";
    return undefined;
  };
  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return "Terminal name is required";
    if (name.trim().length < 2)
      return "Terminal name must be at least 2 characters long";
    return undefined;
  };

  const validateDevEUI = (devEUI: string): string | undefined => {
    if (!devEUI.trim()) return "DevEUI is required";
    // DevEUI is typically 16 hex characters (8 bytes)
    if (!/^[0-9A-Fa-f]{16}$/.test(devEUI.trim()))
      return "DevEUI must be 16 hexadecimal characters";
    return undefined;
  };

  // Check if form is valid
  const isFormValid = (): boolean => {
    const hasValidName = !validateName(formData.name);
    const hasValidId = isEditing || !validateId(formData.id);
    const hasValidDevEUI = !validateDevEUI(formData.devEUI);
    return hasValidName && hasValidId && hasValidDevEUI;
  };

  // Reset form when opening/closing or when edit data changes
  useEffect(() => {
    if (open && isEditing && editData) {
      setFormData({
        id: editData.id,
        name: editData.name,
        devEUI: editData.devEUI || "",
      });
      setErrors({});
      // setIsDirty removed
    } else if (open && !isEditing) {
      // Reset for new terminal
      setFormData({
        id: "",
        name: "",
        devEUI: "",
      });
      setErrors({});
      // setIsDirty removed
    }
  }, [open, isEditing, editData]);

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field when user starts typing
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }

      // Real-time validation
      if (field === "id" && !isEditing) {
        const error = validateId(value);
        setErrors((prev) => ({ ...prev, id: error }));
      } else if (field === "name") {
        const error = validateName(value);
        setErrors((prev) => ({ ...prev, name: error }));
      } else if (field === "devEUI") {
        const error = validateDevEUI(value);
        setErrors((prev) => ({ ...prev, devEUI: error }));
      }

      // setIsDirty removed
    },
    [errors, isEditing],
  );

  const handleSave = useCallback(() => {
    // Validate all fields
    const idError = isEditing ? undefined : validateId(formData.id);
    const nameError = validateName(formData.name);
    const devEUIError = validateDevEUI(formData.devEUI);

    const newErrors: FormErrors = {
      id: idError,
      name: nameError,
      devEUI: devEUIError,
    };

    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some(
      (error) => error !== undefined,
    );

    if (hasErrors) {
      console.log("Validation errors:", newErrors);
      return;
    }

    // Prepare the data for saving (TerminalFormData)
    const terminalFormData: TerminalFormData = {
      name: formData.name.trim(),
      devEUI: formData.devEUI.trim(),
      status: "Offline", // Default status
      availability: "Available", // Default availability
    };

    // Call the onSave callback (only pass TerminalFormData)
    onSave?.(terminalFormData);
    // Don't close here - let the parent handle success/error and close
  }, [formData, onSave, isEditing]);

  // Removed unused handleClose function

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#171717] border-[#2a2a2a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-medium">
            Terminal Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Terminal ID Field */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-white font-medium">Terminal ID</Label>
              {!isEditing && (
                <span className="text-[#a1a1a1] text-sm">RSQW-002</span>
              )}
              {isEditing && (
                <span className="text-[#a1a1a1] text-sm">{formData.id}</span>
              )}
            </div>
            {!isEditing && (
              <>
                <Input
                  value={formData.id}
                  onChange={(e) => handleInputChange("id", e.target.value)}
                  className="bg-[#262626] border-[#404040] text-white placeholder:text-[#a1a1a1] focus:border-[#4285f4]"
                  placeholder="RSQW-XXX"
                />
                {errors.id && (
                  <p className="text-red-400 text-xs">{errors.id}</p>
                )}
              </>
            )}
          </div>

          {/* Terminal Name Field */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Terminal Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="bg-[#262626] border-[#404040] text-white placeholder:text-[#a1a1a1] focus:border-[#4285f4]"
            />
            {errors.name && (
              <p className="text-red-400 text-xs">{errors.name}</p>
            )}
          </div>

          {/* DevEUI Field */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-white font-medium">DevEUI</Label>
              <span className="text-[#a1a1a1] text-sm">16 hex chars</span>
            </div>
            <Input
              value={formData.devEUI}
              onChange={(e) => handleInputChange("devEUI", e.target.value)}
              className="bg-[#262626] border-[#404040] text-white placeholder:text-[#a1a1a1] focus:border-[#4285f4]"
              placeholder="0123456789ABCDEF"
              maxLength={16}
            />
            {errors.devEUI && (
              <p className="text-red-400 text-xs">{errors.devEUI}</p>
            )}
          </div>

          {/* Create Button */}
          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={!isFormValid()}
              className="w-full bg-[#4285f4] text-white hover:bg-[#3367d6] disabled:bg-[#404040] disabled:text-[#a1a1a1] py-3 text-lg"
            >
              {isEditing ? "Update Terminal" : "Create Terminal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
