import { Button } from "@/components/ui/button";
import { createPostRescueForm } from "@/pages/Official/Reports/api/api";
import { X } from "lucide-react";
import { useState } from "react";

interface RescueCompletionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Callback for successful submission
  emergencyData?: {
    emergencyId: string;
    communityName: string;
    neighborhoodId?: string;
    focalPersonName?: string;
    alertType: string;
    dispatcher: string;
    dateTimeOccurred: string;
    address: string;
    terminalName?: string;
    coordinates?: string;
  };
}

interface Resource {
  name: string;
  quantity: number;
}

export function RescueCompletionForm({
  isOpen,
  onClose,
  onSuccess,
  emergencyData,
}: RescueCompletionFormProps) {
  const [personnelDeployed, setPersonnelDeployed] = useState<number>(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [showResourceInput, setShowResourceInput] = useState(false);
  const [showActionInput, setShowActionInput] = useState(false);
  const [newResource, setNewResource] = useState("");
  const [newAction, setNewAction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addResource = () => {
    if (showResourceInput && newResource.trim()) {
      setResources([...resources, { name: newResource.trim(), quantity: 1 }]);
      setNewResource("");
      // Keep the input field open for adding more resources
    } else {
      setShowResourceInput(true);
    }
  };

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const updateResourceQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return; // Prevent quantity from going below 1
    const updatedResources = [...resources];
    updatedResources[index].quantity = quantity;
    setResources(updatedResources);
  };

  const addAction = () => {
    if (showActionInput && newAction.trim()) {
      setActions([...actions, newAction.trim()]);
      setNewAction("");
      // Keep the input field open for adding more actions
    } else {
      setShowActionInput(true);
    }
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!emergencyData?.emergencyId) {
      setError("Emergency ID is required");
      return;
    }

    if (personnelDeployed <= 0) {
      setError("Number of personnel deployed must be greater than 0");
      return;
    }

    if (resources.length === 0) {
      setError("At least one resource must be specified");
      return;
    }

    if (actions.length === 0) {
      setError("At least one action must be specified");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createPostRescueForm(emergencyData.emergencyId, {
        noOfPersonnelDeployed: personnelDeployed,
        resourcesUsed: resources,
        actionTaken: actions.join(", "),
      });

      // Call success callback immediately to refresh reports data
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setPersonnelDeployed(0);
      setResources([]);
      setActions([]);

      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save rescue completion form",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      {/* Sheet */}
      <div
        className={`fixed top-0 right-0 h-full w-[540px] bg-[#171717] border-l border-[#2a2a2a] transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#2a2a2a]">
          <div className="flex justify-between items-center">
            <h1 className="text-white text-xl font-medium">
              Rescue Completion Form
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
          {/* Error Display */}
          {error && (
            <div className="mb-4 mt-6 p-4 bg-red-900/20 border border-red-600/50 rounded-[5px]">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Emergency Information Section */}
          <div className="mb-6 pt-4">
            {/* Title with white background */}
            <div className="bg-white rounded-[5px] p-4 mb-4">
              <h3 className="text-black font-medium text-sm">Emergency Information</h3>
            </div>

            {/* Content with alternating backgrounds */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                <span className="text-white/80 text-sm">
                  Emergency ID
                </span>
                <span className="text-white text-sm">
                  {emergencyData?.emergencyId || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#171717] px-4 py-4 rounded-[5px]">
                <span className="text-white/80 text-sm">
                  Neighborhood ID
                </span>
                <span className="text-white text-sm">
                  {emergencyData?.neighborhoodId ||
                    emergencyData?.communityName ||
                    "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                <span className="text-white/80 text-sm">
                  Focal Person
                </span>
                <span className="text-white text-sm">
                  {emergencyData?.focalPersonName || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#171717] px-4 py-4 rounded-[5px]">
                <span className="text-white/80 text-sm">
                  Terminal Name
                </span>
                <span className="text-white text-sm">
                  {emergencyData?.terminalName || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                <span className="text-white/80 text-sm">
                  Terminal Address
                </span>
                <span className="text-white text-sm text-right">
                  {emergencyData?.address || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#171717] px-4 py-4 rounded-[5px]">
                <span className="text-white/80 text-sm">
                  Terminal Coordinates
                </span>
                <span className="text-white text-sm">
                  {emergencyData?.coordinates || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                <span className="text-white/80 text-sm">
                  Alert Type
                </span>
                <div
                  className={`px-2 py-1 border rounded text-xs font-medium ${
                    emergencyData?.alertType?.toLowerCase() === "critical"
                      ? "border-red-500 text-red-500"
                      : emergencyData?.alertType?.toLowerCase() ===
                          "user-initiated"
                        ? "border-yellow-500 text-yellow-500"
                        : "border-gray-500 text-gray-500"
                  }`}
                >
                  {emergencyData?.alertType?.toUpperCase() || "UNKNOWN"}
                </div>
              </div>

            </div>
          </div>

          {/* Post Rescue Operation Report Section */}
          <div className="mb-6">
            {/* Title with white background */}
            <div className="bg-white rounded-[5px] p-3 mb-4">
              <h3 className="text-black font-medium">
                Post Rescue Operation Report
              </h3>
            </div>

            {/* Content with sheet background */}
            <div className="space-y-6">
              {/* Personnel Deployed */}
              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  1. No. of Personnel Deployed
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={personnelDeployed}
                    onChange={(e) =>
                      setPersonnelDeployed(parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-[#171717] border border-[#3a3a3a] text-white px-3 py-3 rounded text-sm focus:border-blue-500 focus:outline-none pr-8"
                    title="Number of personnel deployed"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setPersonnelDeployed((prev) => prev + 1)}
                        className="text-gray-400 hover:text-gray-300 text-xs leading-none"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPersonnelDeployed((prev) => Math.max(0, prev - 1))
                        }
                        className="text-gray-400 hover:text-gray-300 text-xs leading-none"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resources Used */}
              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  2. Resources Used
                </label>

                {/* Resource List */}
                <div className="space-y-2 mb-4">
                  {resources.map((resource, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={resource.name}
                        readOnly
                        title="Resource name"
                        className="flex-1 bg-[#171717] border border-[#3a3a3a] text-white px-3 py-3 rounded text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <div className="relative">
                        <input
                          type="text"
                          value={resource.quantity}
                          onChange={(e) =>
                            updateResourceQuantity(
                              index,
                              parseInt(e.target.value) || 1
                            )
                          }
                          title="Resource quantity"
                          className="w-24 bg-[#171717] border border-[#3a3a3a] text-white px-3 py-3 rounded text-sm text-center focus:border-blue-500 focus:outline-none pr-8"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateResourceQuantity(
                                  index,
                                  resource.quantity + 1
                                )
                              }
                              className="text-gray-400 hover:text-gray-300 text-xs leading-none"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateResourceQuantity(
                                  index,
                                  resource.quantity - 1
                                )
                              }
                              className="text-gray-400 hover:text-gray-300 text-xs leading-none"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeResource(index)}
                        className="bg-[#171717] border border-[#3a3a3a] text-gray-400 hover:text-red-400 hover:border-red-400 transition-colors rounded p-3"
                        title="Remove resource"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Resource Input Field */}
                {showResourceInput && (
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="text"
                      value={newResource}
                      onChange={(e) => setNewResource(e.target.value)}
                      placeholder="Enter resource name..."
                      className="flex-1 bg-[#171717] border border-[#3a3a3a] text-white px-3 py-3 rounded text-sm focus:border-blue-500 focus:outline-none"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addResource();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowResourceInput(false);
                          setNewResource("");
                        }
                      }}
                      onBlur={() => {
                        // Auto-add resource when user clicks away if there's input
                        if (newResource.trim()) {
                          addResource();
                        } else {
                          setShowResourceInput(false);
                        }
                      }}
                    />
                    <div className="relative">
                      <input
                        type="text"
                        value={1}
                        readOnly
                        title="Default quantity"
                        className="w-24 bg-[#171717] border border-[#3a3a3a] text-white px-3 py-3 rounded text-sm text-center focus:border-blue-500 focus:outline-none pr-8"
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-400 text-xs leading-none">▲</span>
                          <span className="text-gray-400 text-xs leading-none">▼</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowResourceInput(false);
                        setNewResource("");
                      }}
                      className="bg-[#171717] border border-[#3a3a3a] text-gray-400 hover:text-red-400 hover:border-red-400 transition-colors rounded p-3"
                      title="Cancel adding resource"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Add Resource Button */}
                <button
                  onClick={addResource}
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 hover:bg-[#333333] hover:text-white flex items-center justify-center gap-2 py-3 rounded text-sm transition-colors"
                >
                  + Add resource
                </button>
              </div>

              {/* Actions Taken */}
              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  3. Actions Taken
                </label>

                {/* Actions List */}
                <div className="space-y-2 mb-4">
                  {actions.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-[#171717] rounded-[5px] p-3 border border-[#3a3a3a]"
                    >
                      <span className="text-white">{action}</span>
                      <button
                        onClick={() => removeAction(index)}
                        className="text-[#3a3a3a] hover:text-red-400 h-6 w-6 rounded flex items-center justify-center transition-colors"
                        title="Remove action"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Action Input Field */}
                {showActionInput && (
                  <div className="space-y-2 mb-4">
                    <textarea
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      placeholder="Enter action description..."
                      className="w-full bg-[#171717] text-white px-3 py-3 rounded text-sm border border-[#3a3a3a] resize-none focus:border-blue-500 focus:outline-none"
                      rows={3}
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addAction();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowActionInput(false);
                          setNewAction("");
                        }
                      }}
                      onBlur={() => {
                        // Auto-add action when user clicks away if there's input
                        if (newAction.trim()) {
                          addAction();
                        } else {
                          setShowActionInput(false);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Add Action Button */}
                <button
                  onClick={addAction}
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 hover:bg-[#333333] hover:text-white flex items-center justify-center gap-2 py-3 rounded text-sm transition-colors"
                >
                  + Add action
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#171717] border-t border-[#2a2a2a]">
          <div className="flex gap-4">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
              className="flex-1 rounded-[5px] bg-transparent border-[#2a2a2a] text-white hover:bg-[#2a2a2a] hover:text-white h-12"
            >
              Back
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-[5px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
