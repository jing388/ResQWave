import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { checkEmailExists } from "../api/dispatcherApi";
import type { DispatcherDetails, DispatcherFormData } from "../types";
import { CloseCreateDialog } from "./CloseCreateDialog";

interface FormData {
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string; // Add general error for network issues
}

interface DispatcherDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (
    dispatcherData: DispatcherDetails,
    formData?: DispatcherFormData
  ) => Promise<boolean>; // Make async and return success status
  editData?: DispatcherDetails;
  isEditing?: boolean;
  saving?: boolean;
  serverErrors?: FormErrors; // Add prop for server-side errors
  onClearServerError?: (fieldName: string) => void; // Add callback to clear specific server errors
}

export function CreateDispatcherSheet({
  open,
  onOpenChange,
  onSave,
  editData,
  isEditing = false,
  saving = false,
  serverErrors = {},
  onClearServerError,
}: DispatcherDrawerProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [localErrors, setLocalErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Merge local errors with server errors, with server errors taking precedence
  const errors = useMemo(
    () => ({ ...localErrors, ...serverErrors }),
    [localErrors, serverErrors]
  );

  // Clear local errors when server errors change (to allow fresh start)
  useEffect(() => {
    if (Object.keys(serverErrors).length === 0) {
      setLocalErrors({});
    }
  }, [serverErrors]);

  // Validation functions
  const validateName = useCallback(
    (name: string, field: string): string | undefined => {
      if (!name.trim()) return `${field} is required`;
      if (/\d/.test(name)) return `${field} should not contain numbers`;
      if (name.trim().length < 2)
        return `${field} must be at least 2 characters long`;
      return undefined;
    },
    []
  );

  const validateContactNumber = useCallback(
    (contact: string): string | undefined => {
      if (!contact.trim()) return "Contact number is required";
      const cleanContact = contact.replace(/\D/g, ""); // Remove non-digits
      if (cleanContact.length !== 11)
        return "Contact number must be exactly 11 digits";
      if (!cleanContact.startsWith("09"))
        return "Contact number must start with 09";
      return undefined;
    },
    []
  );

  const validateEmail = useCallback((email: string): string | undefined => {
    if (!email.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return undefined;
  }, []);

  const validatePassword = useCallback(
    (password: string): string | undefined => {
      if (!isEditing && !password.trim()) return "Password is required";
      if (!isEditing && password.length < 8)
        return "Password must be at least 8 characters long";

      if (!isEditing) {
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[@$!%*?&_]/.test(password);

        if (!hasUppercase)
          return "Password must include at least one uppercase letter";
        if (!hasLowercase)
          return "Password must include at least one lowercase letter";
        if (!hasNumber) return "Password must include at least one number";
        if (!hasSpecialChar)
          return "Password must include at least one special character (@, $, !, %, *, ?, &, _)";
      }

      return undefined;
    },
    [isEditing]
  );

  const validateConfirmPassword = useCallback(
    (confirmPassword: string, password: string): string | undefined => {
      if (!isEditing && !confirmPassword.trim())
        return "Please confirm your password";
      if (!isEditing && confirmPassword !== password)
        return "Passwords do not match";
      return undefined;
    },
    [isEditing]
  );

  // Validate email uniqueness on blur
  const handleEmailBlur = useCallback(async () => {
    const email = formData.email.trim();

    // First check basic email validation
    const basicError = validateEmail(email);
    if (basicError) {
      setLocalErrors((prev) => ({ ...prev, email: basicError }));
      return;
    }

    // If email is valid, check for uniqueness
    if (email) {
      setIsCheckingEmail(true);
      try {
        const excludeId = isEditing && editData ? editData.id : undefined;
        const result = await checkEmailExists(email, excludeId);

        if (result.exists) {
          setLocalErrors((prev) => ({
            ...prev,
            email: "Email is already in use by another dispatcher",
          }));
        } else {
          // Clear email error if it was about duplication
          setLocalErrors((prev) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { email: _, ...rest } = prev;
            return rest;
          });
        }
      } catch (error) {
        console.error("Error checking email uniqueness:", error);
        // Don't show error to user for network issues during blur validation
      } finally {
        setIsCheckingEmail(false);
      }
    }
  }, [formData.email, validateEmail, isEditing, editData]);

  // Check if form is valid
  const isFormValid = (): boolean => {
    const hasValidFirstName = !validateName(formData.firstName, "First name");
    const hasValidLastName = !validateName(formData.lastName, "Last name");
    const hasValidContact = !validateContactNumber(formData.contactNumber);
    const hasValidEmail = !validateEmail(formData.email);
    const hasValidPassword = isEditing || !validatePassword(formData.password);
    const hasValidConfirmPassword =
      isEditing ||
      !validateConfirmPassword(formData.confirmPassword, formData.password);

    return (
      hasValidFirstName &&
      hasValidLastName &&
      hasValidContact &&
      hasValidEmail &&
      hasValidPassword &&
      hasValidConfirmPassword
    );
  };

  // Reset form when opening/closing or when edit data changes
  useEffect(() => {
    if (open && isEditing && editData) {
      // Split the full name for editing
      const nameParts = editData.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      setFormData({
        firstName,
        lastName,
        contactNumber: editData.contactNumber,
        email: editData.email,
        password: "",
        confirmPassword: "",
      });
      setLocalErrors({});
      setIsDirty(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
    } else if (open && !isEditing) {
      // Reset for new dispatcher
      setFormData({
        firstName: "",
        lastName: "",
        contactNumber: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setLocalErrors({});
      setIsDirty(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [open, isEditing, editData]);

  // Special handler for name fields to reject numbers
  const handleNameChange = useCallback(
    (field: "firstName" | "lastName", value: string) => {
      // Remove any numbers from the input
      const filteredValue = value.replace(/\d/g, "");

      setFormData((prev) => ({
        ...prev,
        [field]: filteredValue,
      }));

      // Clear error when user starts typing
      if (errors[field]) {
        setLocalErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }

      // Real-time validation
      const fieldName = field === "firstName" ? "First name" : "Last name";
      const error = validateName(filteredValue, fieldName);
      setLocalErrors((prev) => ({ ...prev, [field]: error }));
      setIsDirty(true);
    },
    [errors, validateName]
  );

  // Special handler for contact number with digit limiting
  const handleContactNumberChange = useCallback(
    (value: string) => {
      // Remove all non-digits
      const digitsOnly = value.replace(/\D/g, "");

      // Limit to 11 digits maximum
      if (digitsOnly.length <= 11) {
        setFormData((prev) => ({
          ...prev,
          contactNumber: digitsOnly,
        }));

        // Clear local error when user starts typing
        if (localErrors.contactNumber) {
          setLocalErrors((prev) => ({
            ...prev,
            contactNumber: undefined,
          }));
        }

        // Clear server error when user starts typing
        if (serverErrors.contactNumber && onClearServerError) {
          onClearServerError("contactNumber");
        }

        // Real-time validation
        const error = validateContactNumber(digitsOnly);
        setLocalErrors((prev) => ({ ...prev, contactNumber: error }));
        setIsDirty(true);
      }
    },
    [
      localErrors.contactNumber,
      serverErrors.contactNumber,
      onClearServerError,
      validateContactNumber,
    ]
  );

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear local error for this field when user starts typing
      if (localErrors[field as keyof FormErrors]) {
        setLocalErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }

      // Clear server error for this field when user starts typing
      if (serverErrors[field as keyof FormErrors] && onClearServerError) {
        onClearServerError(field as string);
      }

      // Real-time validation for specific fields
      if (field === "email") {
        const error = validateEmail(value);
        setLocalErrors((prev) => ({ ...prev, email: error }));
      } else if (field === "password") {
        const error = validatePassword(value);
        setLocalErrors((prev) => ({ ...prev, password: error }));
        // Also revalidate confirm password if it exists
        if (formData.confirmPassword) {
          const confirmError = validateConfirmPassword(
            formData.confirmPassword,
            value
          );
          setLocalErrors((prev) => ({
            ...prev,
            confirmPassword: confirmError,
          }));
        }
      } else if (field === "confirmPassword") {
        const error = validateConfirmPassword(value, formData.password);
        setLocalErrors((prev) => ({ ...prev, confirmPassword: error }));
      }

      setIsDirty(true);
    },
    [
      localErrors,
      serverErrors,
      onClearServerError,
      formData.password,
      formData.confirmPassword,
      validateEmail,
      validatePassword,
      validateConfirmPassword,
    ]
  );

  const handleSave = useCallback(async () => {
    // Validate all fields
    const newErrors: FormErrors = {};

    const firstNameError = validateName(formData.firstName, "First name");
    if (firstNameError) {
      newErrors.firstName = firstNameError;
    }

    const lastNameError = validateName(formData.lastName, "Last name");
    if (lastNameError) {
      newErrors.lastName = lastNameError;
    }

    const contactError = validateContactNumber(formData.contactNumber);
    if (contactError) {
      newErrors.contactNumber = contactError;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    if (!isEditing) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        newErrors.password = passwordError;
      }

      const confirmPasswordError = validateConfirmPassword(
        formData.confirmPassword,
        formData.password
      );
      if (confirmPasswordError) {
        newErrors.confirmPassword = confirmPasswordError;
      }
    }

    // If there are errors, show them and return
    if (Object.keys(newErrors).length > 0) {
      setLocalErrors(newErrors);
      return;
    }

    const dispatcherData: DispatcherDetails = {
      id: isEditing && editData ? editData.id : `CG-${Date.now()}`,
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      contactNumber: formData.contactNumber.trim(),
      email: formData.email.trim(),
      createdAt:
        isEditing && editData
          ? editData.createdAt
          : new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
      createdBy: isEditing && editData ? editData.createdBy : "Franxine Orias",
    };

    // Prepare raw form data for API calls
    const rawFormData: DispatcherFormData = {
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      email: formData.email.trim(),
      contactNumber: formData.contactNumber.trim(),
      password: formData.password.trim() || undefined, // Don't send empty password
    };

    // Call the parent's save handler and wait for result
    if (onSave) {
      const success = await onSave(dispatcherData, rawFormData);

      // Only close the sheet if save was successful
      if (success) {
        setIsDirty(false);
        onOpenChange(false);
      }
      // If unsuccessful, the sheet stays open and server errors will be displayed via serverErrors prop
    }
  }, [
    formData,
    isEditing,
    editData,
    onSave,
    onOpenChange,
    validateName,
    validateContactNumber,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
  ]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [isDirty, onOpenChange]);

  const handleDiscard = useCallback(() => {
    setIsDirty(false);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[540px] bg-[#171717] border-l border-[#2a2a2a] text-white p-0 flex flex-col"
        >
          <SheetHeader className="px-6 py-4 border-b border-[#2a2a2a] flex flex-row items-center justify-between">
            <SheetTitle className="text-white text-lg font-semibold">
              {isEditing ? "Edit Dispatcher" : "New Dispatcher"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-white text-xs">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleNameChange("firstName", e.target.value)
                  }
                  className={`bg-[#171717] text-white rounded-[5px] focus:ring-1 focus:ring-gray-600 ${
                    errors.firstName
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#2a2a2a] focus:border-gray-600"
                  }`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-white text-xs">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleNameChange("lastName", e.target.value)}
                  className={`bg-[#171717] text-white rounded-[5px] focus:ring-1 focus:ring-gray-600 ${
                    errors.lastName
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#2a2a2a] focus:border-gray-600"
                  }`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label htmlFor="contactNumber" className="text-white text-xs">
                Contact Number
              </Label>
              <Input
                id="contactNumber"
                type="tel"
                value={formData.contactNumber}
                onChange={(e) => handleContactNumberChange(e.target.value)}
                maxLength={11}
                className={`bg-[#171717] text-white rounded-[5px] focus:ring-1 focus:ring-gray-600 ${
                  errors.contactNumber
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#2a2a2a] focus:border-gray-600"
                }`}
              />
              {errors.contactNumber && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.contactNumber}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="email" className="text-white text-xs">
                  Email
                </Label>
                {isCheckingEmail && (
                  <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                )}
              </div>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onBlur={handleEmailBlur}
                disabled={isCheckingEmail}
                className={`bg-[#171717] text-white rounded-[5px] focus:ring-1 focus:ring-gray-600 ${
                  errors.email
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#2a2a2a] focus:border-gray-600"
                } ${isCheckingEmail ? "opacity-75" : ""}`}
              />
              {errors.email && (
                <div className="text-red-400 text-xs flex items-center gap-1">
                  {errors.email}
                </div>
              )}
            </div>

            {/* Password Fields (only for new dispatchers) */}
            {!isEditing && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white text-xs">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className={`bg-[#171717] text-white rounded-[5px] focus:ring-1 focus:ring-gray-600 pr-10 ${
                        errors.password
                          ? "border-red-500 focus:border-red-500"
                          : "border-[#2a2a2a] focus:border-gray-600"
                      }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-white text-xs"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      className={`bg-[#171717] text-white rounded-[5px] focus:ring-1 focus:ring-gray-600 pr-10 ${
                        errors.confirmPassword
                          ? "border-red-500 focus:border-red-500"
                          : "border-[#2a2a2a] focus:border-gray-600"
                      }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-[#171717] border-t border-[#2a2a2a] px-6 py-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 bg-transparent border-[#2a2a2a] text-white hover:text-white hover:bg-[#262626] rounded-[5px]"
              >
                Discard
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isFormValid() || saving}
                className={`flex-1 text-white rounded-[5px] transition-colors flex items-center gap-2 ${
                  isFormValid() && !saving
                    ? "bg-[#4285f4] hover:bg-[#3367d6] cursor-pointer"
                    : "bg-gray-500 cursor-not-allowed opacity-50"
                }`}
              >
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {saving ? "Saving..." : isEditing ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Close Confirmation Dialog */}
      <CloseCreateDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        onDiscard={handleDiscard}
      />
    </>
  );
}
