import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";
import { getAvailableTerminals } from "../api/communityGroupApi";

interface Terminal {
  id: string;
  name: string;
  status: "Online" | "Offline";
  availability: "Available" | "Occupied";
}

interface UnarchiveNeighborhoodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnarchive: (terminalId: string) => Promise<void>;
  neighborhoodId: string;
  loading?: boolean;
}

export function UnarchiveNeighborhoodModal({
  open,
  onOpenChange,
  onUnarchive,
  neighborhoodId,
  loading = false,
}: UnarchiveNeighborhoodModalProps) {
  const [selectedTerminal, setSelectedTerminal] = useState<string>("");
  const [availableTerminals, setAvailableTerminals] = useState<Terminal[]>([]);
  const [isLoadingTerminals, setIsLoadingTerminals] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch available terminals when modal opens
  const fetchAvailableTerminals = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingTerminals(true);
      setError("");
      const terminals = await getAvailableTerminals();
      setAvailableTerminals(terminals);

      if (terminals.length === 0) {
        setError("No available terminals found. Please create a terminal first.");
      }
    } catch (err) {
      console.error("Error fetching available terminals:", err);
      setError("Failed to load available terminals");
      setAvailableTerminals([]);
    } finally {
      setIsLoadingTerminals(false);
    }
  }, []);

  // Reset form when opening/closing
  useEffect(() => {
    if (open) {
      setSelectedTerminal("");
      setError("");
      fetchAvailableTerminals();
    }
  }, [open, fetchAvailableTerminals]);

  const handleUnarchive = useCallback(async () => {
    // Prevent double clicks
    if (isSaving || loading) {
      return;
    }

    // Validate terminal selection
    if (!selectedTerminal) {
      setError("Please select a terminal to assign");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onUnarchive(selectedTerminal);
      // Close modal after successful unarchive
      onOpenChange(false);
      // Reset form
      setSelectedTerminal("");
    } catch (err) {
      console.error("Error unarchiving neighborhood:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to unarchive neighborhood. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedTerminal,
    onUnarchive,
    onOpenChange,
    isSaving,
    loading,
  ]);

  const isFormValid = (): boolean => {
    return !!selectedTerminal && availableTerminals.length > 0;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Prevent closing during save operation
        if (!newOpen && (isSaving || loading)) {
          return;
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="bg-[#171717] border-[#2a2a2a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-medium">
            Unarchive Neighborhood
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Neighborhood ID Display */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Neighborhood ID</Label>
            <div className="bg-[#262626] border border-[#404040] text-[#a1a1a1] rounded-md px-3 py-2">
              {neighborhoodId}
            </div>
          </div>

          {/* Terminal Selection Dropdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-white font-medium">
                Assign Terminal
                <span className="text-red-400 ml-1">*</span>
              </Label>
              <span className="text-[#a1a1a1] text-xs">
                {isLoadingTerminals
                  ? "Loading..."
                  : `${availableTerminals.length} available`}
              </span>
            </div>
            <Select
              value={selectedTerminal}
              onValueChange={setSelectedTerminal}
              disabled={
                isSaving ||
                loading ||
                isLoadingTerminals ||
                availableTerminals.length === 0
              }
            >
              <SelectTrigger className="bg-[#262626] border-[#404040] text-white placeholder:text-[#a1a1a1] focus:border-[#4285f4] disabled:opacity-50 disabled:cursor-not-allowed">
                <SelectValue placeholder="Select a terminal" />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-[#404040] text-white">
                {availableTerminals.map((terminal) => (
                  <SelectItem
                    key={terminal.id}
                    value={terminal.id}
                    className="focus:bg-[#404040] focus:text-white"
                  >
                    {terminal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>

          {/* Information Text */}
          <div className="bg-[#262626] border border-[#404040] rounded-md p-3">
            <p className="text-[#a1a1a1] text-xs leading-relaxed">
              <span className="text-white font-medium">Note:</span> Unarchiving
              this neighborhood will restore it to the active list and assign
              the selected terminal. The associated focal person account will
              also be unarchived and reactivated.
            </p>
          </div>

          {/* Unarchive Button */}
          <div className="pt-2">
            <Button
              onClick={handleUnarchive}
              disabled={!isFormValid() || isSaving || loading}
              className="w-full bg-[#4285f4] text-white hover:bg-[#3367d6] disabled:bg-[#404040] disabled:text-[#a1a1a1] py-3 text-lg flex items-center justify-center gap-2"
            >
              {(isSaving || loading) && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isSaving || loading ? "Unarchiving..." : "Unarchive Neighborhood"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
