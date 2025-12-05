import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";
import { createRescueForm, updateRescueFormStatus } from "../api/rescueForm";

interface RescueFormData {
  focalPerson: string;
  focalUnreachable: boolean;
  waterLevel: string;
  waterLevelDetails: string;
  urgencyLevel: string;
  urgencyDetails: string;
  hazards: string[];
  hazardDetails: string;
  accessibility: string;
  accessibilityDetails: string;
  resources: string[];
  resourceDetails: string;
  otherInfo: string;
  // Required for backend submission
  alertId?: string;
  // Optional fields for waitlisted items
  id?: string;
  timestamp?: string;
  status?: string;
  // Optional callback for dispatch confirmation
  dispatchCallback?: () => Promise<void>;
}

interface RescueFormPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  formData: RescueFormData;
  onWaitlist?: (formData: RescueFormData) => void;
  onDispatch?: (formData: RescueFormData) => void;
}

export default function RescueFormPreview({
  isOpen,
  onClose,
  onBack,
  formData,
  onWaitlist,
  onDispatch,
}: RescueFormPreviewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWaitlist = async () => {
    if (!formData.alertId) {
      setError("Alert ID is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit to backend with status 'Waitlisted'
      const response = await createRescueForm(formData.alertId, {
        focalUnreachable: formData.focalUnreachable,
        waterLevel: formData.waterLevel,
        waterLevelDetails: formData.waterLevelDetails,
        urgencyOfEvacuation: formData.urgencyLevel,
        urgencyDetails: formData.urgencyDetails,
        hazardPresent: formData.hazards.join(", "),
        hazardDetails: formData.hazardDetails,
        accessibility: formData.accessibility,
        accessibilityDetails: formData.accessibilityDetails,
        resourceNeeds: formData.resources.join(", "),
        resourceDetails: formData.resourceDetails,
        otherInformation: formData.otherInfo,
        status: "Waitlisted",
      });

      console.log(
        "[RescueFormPreview] Rescue form created (Waitlisted):",
        response,
      );

      // Call parent callback
      if (onWaitlist) {
        onWaitlist({ ...formData, id: response.id });
      }

      onClose();
    } catch (err: unknown) {
      const error = err as {
        message?: string;
        response?: { code?: string; message?: string };
      };
      console.error("[RescueFormPreview] Error creating rescue form:", err);

      // Check for admin-specific error using code or message
      const errorCode = error.response?.code;
      const errorMessage = error.response?.message || error.message || "";

      if (
        errorCode === "ADMIN_CANNOT_CREATE_RESCUE_FORM" ||
        errorMessage.includes("You are currently in the admin interface")
      ) {
        setError(
          "Cannot create rescue form: You are currently in the admin interface. Only dispatchers can create rescue forms.",
        );
      } else if (
        errorCode === "INVALID_USER_ROLE" ||
        errorMessage.includes("Only dispatchers can create rescue forms")
      ) {
        setError("Access denied: Only dispatchers can create rescue forms.");
      } else {
        setError(errorMessage || "Failed to create rescue form");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchRescue = async () => {
    if (!formData.alertId) {
      setError("Alert ID is required");
      return;
    }

    // Instead of making backend calls here, show confirmation dialog
    // The actual backend calls will be made when user confirms in the dialog
    console.log(
      "[RescueFormPreview] Showing dispatch confirmation for:",
      formData.focalPerson,
    );

    // Close the preview immediately
    onClose();

    // Show confirmation dialog with the actual dispatch logic as callback
    if (onDispatch) {
      const dispatchCallback = async () => {
        try {
          console.log(
            "[RescueFormPreview] Executing actual dispatch after confirmation",
          );
          console.log("[RescueFormPreview] Form data:", formData);
          console.log(
            "[RescueFormPreview] Has id?",
            "id" in formData,
            formData.id,
          );
          console.log("[RescueFormPreview] Status:", formData.status);

          let response;

          // Check if form already exists (has an id OR status is Waitlisted)
          if (formData.id || formData.status === "Waitlisted") {
            // Update existing form status to Dispatched
            console.log(
              "[RescueFormPreview] Updating existing form to Dispatched",
            );

            response = await updateRescueFormStatus(
              formData.alertId!,
              "Dispatched",
            );

            // Remove from waitlist if it was waitlisted
            console.log(
              "[RescueFormPreview] Waitlisted form dispatch completed",
            );
          } else {
            // Create new form with status 'Dispatched'
            console.log(
              "[RescueFormPreview] Creating new form with Dispatched status",
            );
            response = await createRescueForm(formData.alertId!, {
              focalUnreachable: formData.focalUnreachable,
              waterLevel: formData.waterLevel,
              waterLevelDetails: formData.waterLevelDetails,
              urgencyOfEvacuation: formData.urgencyLevel,
              urgencyDetails: formData.urgencyDetails,
              hazardPresent: formData.hazards.join(", "),
              hazardDetails: formData.hazardDetails,
              accessibility: formData.accessibility,
              accessibilityDetails: formData.accessibilityDetails,
              resourceNeeds: formData.resources.join(", "),
              resourceDetails: formData.resourceDetails,
              otherInformation: formData.otherInfo,
              status: "Dispatched",
            });
          }

          console.log(
            "[RescueFormPreview] Rescue form dispatched successfully:",
            response,
          );

          // The real-time updates will be triggered by the backend automatically
          // Show success alert after dispatch
          // (This will be handled by the parent component)
        } catch (err: unknown) {
          console.error(
            "[RescueFormPreview] Error dispatching rescue form:",
            err,
          );
          // Handle error in confirmation callback
          throw err;
        }
      };

      // Pass the form data and the dispatch callback to show confirmation dialog
      onDispatch({ ...formData, dispatchCallback });
    }
  };

  const renderSelectedOptions = (options: string[] | string) => {
    if (Array.isArray(options)) {
      return options.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-2">
          {options.map((option, index) => (
            <span
              key={index}
              className="bg-white text-black px-3 py-1 rounded text-sm"
            >
              {option}
            </span>
          ))}
        </div>
      ) : null;
    } else {
      return options ? (
        <div className="mt-2">
          <span className="bg-white text-black px-3 py-1 rounded text-sm">
            {options}
          </span>
        </div>
      ) : null;
    }
  };

  const renderDetailText = (details: string) => {
    return details ? (
      <div className="mt-3 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-3">
        <p className="text-white text-sm">{details}</p>
      </div>
    ) : null;
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[400px] bg-[#171717] border-l border-[#2a2a2a] transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ zIndex: 70 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-[#2a2a2a]">
        <div className="flex justify-between items-center">
          <h1 className="text-white text-xl font-medium">
            Confirm Rescue Form
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 h-[calc(100vh-160px)]">
        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Focal Person */}
        <div className="mb-6 pt-6">
          <input
            type="text"
            value={`Focal Person: ${formData.focalPerson}`}
            disabled
            title="Focal Person Name"
            className="w-full bg-white text-black px-4 py-3 rounded-md text-sm font-medium"
          />
        </div>

        {/* Focal Unreachable */}
        {formData.focalUnreachable && (
          <div className="mb-6">
            <div className="flex items-center gap-3 text-white">
              <div className="w-4 h-4 bg-white rounded border"></div>
              <span className="text-sm">Focal Unreachable</span>
            </div>
          </div>
        )}

        {/* 1. Water Level */}
        <div className="mb-6">
          <h3 className="text-white font-medium text-sm mb-2">
            1. Water Level
          </h3>
          <p className="text-gray-400 text-sm mb-2">
            How high is the floodwater now compared to rescue family, seats,
            chest, above head?
          </p>
          {renderSelectedOptions(formData.waterLevel)}
          {renderDetailText(formData.waterLevelDetails)}
        </div>

        {/* 2. Urgency of Evacuation */}
        <div className="mb-6">
          <h3 className="text-white font-medium text-sm mb-2">
            2. Urgency of Evacuation
          </h3>
          <p className="text-gray-400 text-sm mb-2">
            Are residents still safe inside, or is evacuation needed
            immediately?
          </p>
          {renderSelectedOptions(formData.urgencyLevel)}
          {renderDetailText(formData.urgencyDetails)}
        </div>

        {/* 3. Hazards Present */}
        <div className="mb-6">
          <h3 className="text-white font-medium text-sm mb-2">
            3. Hazards Present
          </h3>
          <p className="text-gray-400 text-sm mb-2">
            Do you see any hazards like wires, currents, or debris?
          </p>
          {renderSelectedOptions(formData.hazards)}
          {renderDetailText(formData.hazardDetails)}
        </div>

        {/* 4. Accessibility */}
        <div className="mb-6">
          <h3 className="text-white font-medium text-sm mb-2">
            4. Accessibility
          </h3>
          <p className="text-gray-400 text-sm mb-2">
            Is the area accessible for rescue vehicles or only boats?
          </p>
          {renderSelectedOptions(formData.accessibility)}
          {renderDetailText(formData.accessibilityDetails)}
        </div>

        {/* 5. Resources Needs */}
        <div className="mb-6">
          <h3 className="text-white font-medium text-sm mb-2">
            5. Resources Needs
          </h3>
          <p className="text-gray-400 text-sm mb-2">
            Is the area accessible for rescue vehicles or only boats?
          </p>
          {renderSelectedOptions(formData.resources)}
          {renderDetailText(formData.resourceDetails)}
        </div>

        {/* 6. Other Information */}
        {formData.otherInfo && (
          <div className="mb-8">
            <h3 className="text-white font-medium text-sm mb-2">
              6. Other Information
            </h3>
            {renderDetailText(formData.otherInfo)}
          </div>
        )}
      </div>

      {/* Sticky Footer Buttons */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#171717] border-t border-[#2a2a2a]">
        <div className="flex gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            disabled={isSubmitting}
            className="flex-1 bg-transparent border-[#2a2a2a] text-white hover:bg-[#2a2a2a] hover:text-white h-12"
          >
            Back
          </Button>
          <Button
            onClick={handleWaitlist}
            disabled={isSubmitting}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white h-12 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Waitlist"}
          </Button>
          <Button
            onClick={handleDispatchRescue}
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Dispatch Rescue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
