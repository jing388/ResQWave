import { Button } from "@/components/ui/button";
import { fetchDetailedReportData, type DetailedReportData } from "@/pages/Official/Reports/api/api";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface PostRescueFormInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emergencyId: string | null;
}

export function PostRescueFormInfoSheet({
  open,
  onOpenChange,
  emergencyId,
}: PostRescueFormInfoSheetProps) {
  const [data, setData] = useState<DetailedReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && emergencyId) {
      setLoading(true);
      setError(null);
      fetchDetailedReportData(emergencyId)
        .then((result) => {
          setData(result);
        })
        .catch((err) => {
          console.error("Error fetching post rescue form data:", err);
          setError(err instanceof Error ? err.message : "Failed to load data");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, emergencyId]);

  const parseResourcesUsed = (resources: { name: string; quantity: number }[] | string) => {
    if (typeof resources === "string") {
      try {
        return JSON.parse(resources);
      } catch {
        return [];
      }
    }
    return resources || [];
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed top-0 right-0 h-full w-[540px] bg-[#171717] border-l border-[#2a2a2a] transform transition-transform duration-300 ease-in-out z-50 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#2a2a2a]">
          <div className="flex justify-between items-center">
            <h1 className="text-white text-xl font-medium">
              Post-Rescue Form Details
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 h-[calc(100vh-80px)]">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="text-white">Loading...</div>
            </div>
          )}

          {error && (
            <div className="mb-4 mt-6 p-4 bg-red-900/20 border border-red-600/50 rounded-[5px]">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Emergency Information Section */}
              <div className="mb-6 pt-4">
                {/* Title with white background */}
                <div className="bg-white rounded-[5px] p-4 mb-4">
                  <h3 className="text-black font-medium text-sm">
                    Emergency Information
                  </h3>
                </div>

                {/* Content with alternating backgrounds */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                    <span className="text-white/80 text-sm">Emergency ID</span>
                    <span className="text-white text-sm">
                      {data.emergencyId || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#171717] px-4 py-4 rounded-[5px]">
                    <span className="text-white/80 text-sm">
                      Neighborhood ID
                    </span>
                    <span className="text-white text-sm">
                      {data.neighborhoodId || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                    <span className="text-white/80 text-sm">Focal Person</span>
                    <span className="text-white text-sm">
                      {data.focalPersonName || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#171717] px-4 py-4 rounded-[5px]">
                    <span className="text-white/80 text-sm">Terminal Name</span>
                    <span className="text-white text-sm">
                      {data.terminalName || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                    <span className="text-white/80 text-sm">
                      Terminal Address
                    </span>
                    <span className="text-white text-sm text-right max-w-[300px]">
                      {data.focalPersonAddress || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#171717] px-4 py-4 rounded-[5px]">
                    <span className="text-white/80 text-sm">
                      Date & Time Occurred
                    </span>
                    <span className="text-white text-sm">
                      {data.dateTimeOccurred || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
                    <span className="text-white/80 text-sm">Alert Type</span>
                    <span className="text-white text-sm">
                      {data.alertType || "N/A"}
                    </span>
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

                {/* Content with improved grid layout */}
                <div className="space-y-4">
                  {/* Top Row - Dispatcher and Personnel in Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Dispatcher Name Card */}
                    <div className="bg-[#1d1d1d] border border-[#2a2a2a] rounded-[5px] p-4">
                      <div className="text-white/60 text-xs font-medium uppercase tracking-wide mb-2">
                        Dispatcher
                      </div>
                      <div className="text-white text-base font-semibold">
                        {data.dispatcherName || "N/A"}
                      </div>
                    </div>

                    {/* Personnel Deployed Card */}
                    <div className="bg-[#1d1d1d] border border-[#2a2a2a] rounded-[5px] p-4">
                      <div className="text-white/60 text-xs font-medium uppercase tracking-wide mb-2">
                        Personnel Deployed
                      </div>
                      <div className="text-white text-2xl font-bold">
                        {data.noOfPersonnelDeployed || "0"}
                      </div>
                    </div>
                  </div>

                  {/* Rescue Completion Time - Full Width */}
                  <div className="bg-linear-to-r from-[#1d1d1d] to-[#252525] border border-[#2a2a2a] rounded-[5px] p-4">
                    <div className="text-white/60 text-xs font-medium uppercase tracking-wide mb-2">
                      Rescue Completion Time
                    </div>
                    <div className="text-white text-base font-semibold">
                      {data.rescueCompletionTime || "N/A"}
                    </div>
                  </div>

                  {/* Resources Used Section */}
                  <div className="bg-[#1d1d1d] border border-[#2a2a2a] rounded-[5px] p-4">
                    <div className="text-white/60 text-xs font-medium uppercase tracking-wide mb-3">
                      Resources Used
                    </div>
                    <div className="space-y-2">
                      {parseResourcesUsed(data.resourcesUsed).length > 0 ? (
                        <div className="grid gap-2">
                          {parseResourcesUsed(data.resourcesUsed).map(
                            (resource: { name: string; quantity: number }, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-[#252525] px-3 py-2.5 rounded border border-[#333333] hover:border-[#404040] transition-colors"
                              >
                                <span className="text-white text-sm font-medium">
                                  {resource.name}
                                </span>
                                <span className="text-white/80 text-sm bg-[#1d1d1d] px-3 py-1 rounded-full">
                                  Qty: {resource.quantity}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="text-white/60 text-sm text-center py-3">
                          No resources specified
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Taken Section */}
                  <div className="bg-[#1d1d1d] border border-[#2a2a2a] rounded-[5px] p-4">
                    <div className="text-white/60 text-xs font-medium uppercase tracking-wide mb-3">
                      Actions Taken
                    </div>
                    <div className="bg-[#252525] rounded border border-[#333333] p-3">
                      {data.actionTaken ? (
                        <div className="space-y-2">
                          {data.actionTaken.split(", ").map((action, index) => (
                            <div 
                              key={index} 
                              className="flex items-start gap-2 text-white text-sm"
                            >
                              <span className="text-blue-400 mt-1 shrink-0">•</span>
                              <span className="leading-relaxed">{action}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-white/60 text-sm text-center py-2">
                          No actions specified
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
