import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDetailedReportData, type DetailedReportData } from "../api/api";

interface RescueFormInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emergencyId: string | null;
}

export function RescueFormInfoSheet({
  open,
  onOpenChange,
  emergencyId,
}: RescueFormInfoSheetProps) {
  const [rescueFormData, setRescueFormData] = useState<DetailedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !emergencyId) {
      setRescueFormData(null);
      setError(null);
      return;
    }

    const fetchRescueFormData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchDetailedReportData(emergencyId);
        setRescueFormData(data);
      } catch (err) {
        console.error("[RescueFormInfoSheet] Error fetching rescue form data:", err);
        setError("Failed to load rescue form data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRescueFormData();
  }, [open, emergencyId]);

  const renderSelectedOptions = (options: string) => {
    if (!options || options.trim() === "") return null;

    // Split by comma if multiple options
    const optionArray = options.split(",").map((opt) => opt.trim()).filter((opt) => opt !== "");

    return optionArray.length > 0 ? (
      <div className="flex flex-wrap gap-2 mt-2">
        {optionArray.map((option, index) => (
          <span
            key={index}
            className="bg-[#505050]/50 border border-[#505050] text-white px-4 py-2 rounded-full text-sm"
          >
            {option}
          </span>
        ))}
      </div>
    ) : null;
  };

  const renderDetailText = (details: string) => {
    return details && details.trim() !== "" ? (
      <div className="mt-3 p-3">
        <p className="text-white text-sm">{details}</p>
      </div>
    ) : null;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[500px] bg-[#171717] border-[#2a2a2a] text-white p-0 overflow-y-auto rounded-[5px] z-160"
      >
        <SheetHeader className="sticky top-0 z-10 bg-[#171717] px-4 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between h-12">
            <SheetTitle className="text-white text-xl font-normal">
              Rescue Form
            </SheetTitle>
            <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
              <X className="h-5 w-5 text-white" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="px-5 pt-4 pb-2 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-white/60">Loading rescue form data...</div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-[5px]">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {rescueFormData && !isLoading && (
            <>
              {/* 1. Water Level */}
              <div className="bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                <h3 className="text-white/80 text-sm font-normal mb-2">
                  1. Water Level
                </h3>
                <p className="text-white/60 text-sm mb-2">
                  How high is the floodwater now compared to rescue family, seats,
                  chest, above head?
                </p>
                {renderSelectedOptions(rescueFormData.waterLevel)}
              </div>

              {/* 2. Urgency of Evacuation */}
              <div className="bg-[#171717] px-4 py-4 rounded-[5px]">
                <h3 className="text-white/80 text-sm font-normal mb-2">
                  2. Urgency of Evacuation
                </h3>
                <p className="text-white/60 text-sm mb-2">
                  Are residents still safe inside, or is evacuation needed
                  immediately?
                </p>
                {renderSelectedOptions(rescueFormData.urgencyOfEvacuation)}
              </div>

              {/* 3. Hazards Present */}
              <div className="bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                <h3 className="text-white/80 text-sm font-normal mb-2">
                  3. Hazards Present
                </h3>
                <p className="text-white/60 text-sm mb-2">
                  Do you see any hazards like wires, currents, or debris?
                </p>
                {renderSelectedOptions(rescueFormData.hazardPresent)}
              </div>

              {/* 4. Accessibility */}
              <div className="bg-[#171717] px-4 py-4 rounded-[5px]">
                <h3 className="text-white/80 text-sm font-normal mb-2">
                  4. Accessibility
                </h3>
                <p className="text-white/60 text-sm mb-2">
                  Is the area accessible for rescue vehicles or only boats?
                </p>
                {renderSelectedOptions(rescueFormData.accessibility)}
              </div>

              {/* 5. Resources Needs */}
              <div className="bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                <h3 className="text-white/80 text-sm font-normal mb-2">
                  5. Resources Needs
                </h3>
                <p className="text-white/60 text-sm mb-2">
                  What critical resources, such as food, water, medical supplies, or
                  personnel, are needed at this time?
                </p>
                {renderSelectedOptions(rescueFormData.resourceNeeds)}
              </div>

              {/* 6. Other Information */}
              {rescueFormData.otherInformation && rescueFormData.otherInformation.trim() !== "" && (
                <div className="px-4 py-4">
                  <h3 className="text-white/80 text-sm font-normal mb-2">
                    6. Other Information
                  </h3>
                  {renderDetailText(rescueFormData.otherInformation)}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default RescueFormInfoSheet;
