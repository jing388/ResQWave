import { useRescueForm } from "@/components/Official/RescueFormContext";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";
import RescueFormPreview from "./RescueFormPreview";

interface RescueFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  focalPerson?: string;
  alertId?: string; // Backend emergency/alert ID for rescue form submission
  onWaitlist?: (formData: unknown) => void;
  onDispatch?: (formData: unknown) => void;
}

export default function RescueFormSheet({
  isOpen,
  onClose,
  focalPerson = "Gwyneth Uy",
  alertId,
  onWaitlist,
  onDispatch,
}: RescueFormSheetProps) {
  const { isRescuePreviewOpen, setIsRescuePreviewOpen } = useRescueForm();
  const [focalUnreachable, setFocalUnreachable] = useState(false);
  const [waterLevel, setWaterLevel] = useState("");
  const [waterLevelDetails, setWaterLevelDetails] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("");
  const [urgencyDetails, setUrgencyDetails] = useState("");
  const [hazards, setHazards] = useState<string[]>([]);
  const [hazardDetails, setHazardDetails] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [accessibilityDetails, setAccessibilityDetails] = useState("");
  const [resources, setResources] = useState<string[]>([]);
  const [resourceDetails, setResourceDetails] = useState("");
  const [otherInfo, setOtherInfo] = useState("");

  const waterLevelOptions = [
    "Above Head",
    "Chest Deep",
    "Ankle Deep",
    "Waist Deep",
    "Knee Deep",
  ];

  const urgencyOptions = [
    "Immediate evacuation needed",
    "Urgent - within 1 hour",
    "Soon - within 4 hours",
    "Safe for now",
    "Monitoring Situation",
  ];

  const hazardOptions = [
    "Live electrical wires",
    "Strong water current",
    "Dangerous debris",
    "Structural damage",
    "Chemical spills",
  ];

  const accessibilityOptions = [
    "Vehicle accessible",
    "Boat accessible",
    "Walking accessible",
    "All access blocked",
  ];

  const resourceOptions = [
    "Rescue Boat",
    "Medical assistance",
    "Additional personnel",
    "Standard rescue team",
  ];

  const handleHazardToggle = (hazard: string) => {
    setHazards((prev) =>
      prev.includes(hazard)
        ? prev.filter((h) => h !== hazard)
        : [...prev, hazard],
    );
  };

  const handleResourceToggle = (resource: string) => {
    setResources((prev) =>
      prev.includes(resource)
        ? prev.filter((r) => r !== resource)
        : [...prev, resource],
    );
  };

  const handleSubmit = () => {
    setIsRescuePreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsRescuePreviewOpen(false);
    onClose();
  };

  const handleBackToForm = () => {
    setIsRescuePreviewOpen(false);
  };

  const formData = {
    focalPerson,
    focalUnreachable,
    waterLevel,
    waterLevelDetails,
    urgencyLevel,
    urgencyDetails,
    hazards,
    hazardDetails,
    accessibility,
    accessibilityDetails,
    resources,
    resourceDetails,
    otherInfo,
    alertId, // Include alertId for backend submission
  };

  return (
    <>
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-[#171717] border-l border-[#2a2a2a] transform transition-transform duration-300 ease-in-out ${
          isOpen && !isRescuePreviewOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ zIndex: 60 }}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#2a2a2a]">
          <div className="flex justify-between items-center">
            <h1 className="text-white text-xl font-medium">Rescue Form</h1>
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
          {/* Focal Person */}
          <div className="mb-6 pt-6">
            <label className="block text-gray-300 text-sm mb-2">
              Focal Person
            </label>
            <input
              type="text"
              value={`Focal Person: ${focalPerson}`}
              disabled
              title="Focal Person Name"
              className="w-full bg-white text-black px-4 py-3 rounded-md text-sm font-medium"
            />
          </div>

          {/* Focal Unreachable Checkbox */}
          <div className="mb-6">
            <label className="flex items-center gap-3 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={focalUnreachable}
                onChange={(e) => setFocalUnreachable(e.target.checked)}
                className="w-4 h-4 rounded border-gray-400"
              />
              <span className="text-sm">Focal Unreachable</span>
            </label>
          </div>

          {/* 1. Water Level */}
          <div className="mb-6">
            <h3 className="text-white font-medium text-sm mb-2">
              1. Water Level
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              How high is the floodwater now compared to rescue family, seats,
              chest, above head?
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {waterLevelOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setWaterLevel(option)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    waterLevel === option
                      ? "bg-white text-black"
                      : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Add additional details (Optional)..."
              value={waterLevelDetails}
              onChange={(e) => setWaterLevelDetails(e.target.value)}
              className="w-full bg-[#2a2a2a] text-white px-3 py-3 rounded text-sm border border-[#3a3a3a] resize-none"
              rows={3}
            />
          </div>

          {/* 2. Urgency of Evacuation */}
          <div className="mb-6">
            <h3 className="text-white font-medium text-sm mb-2">
              2. Urgency of Evacuation
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Are residents still safe inside, or is evacuation needed
              immediately?
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {urgencyOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setUrgencyLevel(option)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    urgencyLevel === option
                      ? "bg-white text-black"
                      : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Add additional details (Optional)..."
              value={urgencyDetails}
              onChange={(e) => setUrgencyDetails(e.target.value)}
              className="w-full bg-[#2a2a2a] text-white px-3 py-3 rounded text-sm border border-[#3a3a3a] resize-none"
              rows={3}
            />
          </div>

          {/* 3. Hazards Present */}
          <div className="mb-6">
            <h3 className="text-white font-medium text-sm mb-2">
              3. Hazards Present
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Do you see any hazards like wires, currents, or debris?
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {hazardOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleHazardToggle(option)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    hazards.includes(option)
                      ? "bg-white text-black"
                      : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Add additional details (Optional)..."
              value={hazardDetails}
              onChange={(e) => setHazardDetails(e.target.value)}
              className="w-full bg-[#2a2a2a] text-white px-3 py-3 rounded text-sm border border-[#3a3a3a] resize-none"
              rows={3}
            />
          </div>

          {/* 4. Accessibility */}
          <div className="mb-6">
            <h3 className="text-white font-medium text-sm mb-2">
              4. Accessibility
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Is the area accessible for rescue vehicles or only boats?
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {accessibilityOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setAccessibility(option)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    accessibility === option
                      ? "bg-white text-black"
                      : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Add additional details (Optional)..."
              value={accessibilityDetails}
              onChange={(e) => setAccessibilityDetails(e.target.value)}
              className="w-full bg-[#2a2a2a] text-white px-3 py-3 rounded text-sm border border-[#3a3a3a] resize-none"
              rows={3}
            />
          </div>

          {/* 5. Resources Needs */}
          <div className="mb-6">
            <h3 className="text-white font-medium text-sm mb-2">
              5. Resources Needs
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Is the area accessible for rescue vehicles or only boats?
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {resourceOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleResourceToggle(option)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    resources.includes(option)
                      ? "bg-white text-black"
                      : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Add additional details (Optional)..."
              value={resourceDetails}
              onChange={(e) => setResourceDetails(e.target.value)}
              className="w-full bg-[#2a2a2a] text-white px-3 py-3 rounded text-sm border border-[#3a3a3a] resize-none"
              rows={3}
            />
          </div>

          {/* 6. Other Information */}
          <div className="mb-8">
            <h3 className="text-white font-medium text-sm mb-2">
              6. Other Information
            </h3>
            <textarea
              placeholder="Additional details, special circumstances, or other relevant information..."
              value={otherInfo}
              onChange={(e) => setOtherInfo(e.target.value)}
              className="w-full bg-[#2a2a2a] text-white px-3 py-3 rounded text-sm border border-[#3a3a3a] resize-none"
              rows={4}
            />
          </div>
        </div>

        {/* Sticky Footer Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#171717] border-t border-[#2a2a2a]">
          <div className="flex gap-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-transparent border-[#2a2a2a] text-white hover:bg-[#2a2a2a] hover:text-white h-12"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12"
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>

      {/* Rescue Form Preview - Rendered separately */}
      <RescueFormPreview
        isOpen={isRescuePreviewOpen}
        onClose={handleClosePreview}
        onBack={handleBackToForm}
        formData={formData}
        onWaitlist={onWaitlist}
        onDispatch={onDispatch}
      />
    </>
  );
}
