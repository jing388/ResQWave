import { X } from "lucide-react";
import { useState } from "react";
import { getNeighborhoodByTerminalId } from "../../CommunityGroups/api/communityGroupApi";
import { CommunityGroupInfoSheet } from "../../CommunityGroups/components/CommunityGroupInfoSheet";
import type { CommunityGroupDetails } from "../../CommunityGroups/types";

interface AdminPinPopoverProps {
  popover: {
    lng: number;
    lat: number;
    screen: { x: number; y: number };
    terminalID: string;
    terminalName: string;
    terminalStatus: string;
    timeSent: string;
    focalPerson: string;
    address: string;
    contactNumber: string;
    totalAlerts: number;
  } | null;
  onClose: () => void;
  onMoreInfo?: () => void;
  onOpenInsights?: (terminalID: string, terminalName: string) => void;
}

export function AdminPinPopover({
  popover,
  onClose,
  onOpenInsights,
}: AdminPinPopoverProps) {
  // Community info sheet state
  const [communityInfoOpen, setCommunityInfoOpen] = useState(false);
  const [communityData, setCommunityData] = useState<
    CommunityGroupDetails | undefined
  >(undefined);
  const [loadingCommunityData, setLoadingCommunityData] = useState(false);

  const handleMoreInfo = async () => {
    if (!popover?.terminalID) {
      console.error("[AdminPinPopover] No terminal ID available for More Info");
      return;
    }

    setLoadingCommunityData(true);
    try {
      const data = await getNeighborhoodByTerminalId(popover.terminalID);
      if (data) {
        setCommunityData(data);
        setCommunityInfoOpen(true);
      } else {
        console.warn(
          "[AdminPinPopover] No community data found for terminal:",
          popover.terminalID,
        );
      }
    } catch (error) {
      console.error("[AdminPinPopover] Error fetching community data:", error);
    } finally {
      setLoadingCommunityData(false);
    }
  };

  if (!popover) return null;

  // Terminal name from backend
  const terminalName = popover.terminalName || popover.terminalID || "N/A";

  const popoverWidth = 390;
  const popoverHeight = 320;
  const offsetX = popoverWidth / 1.40;
  const offsetY = popoverHeight + 135;

  return (
    <>
      <div
        id="admin-pin-popover-wrapper"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate(${popover.screen.x - offsetX}px, ${popover.screen.y - offsetY}px)`,
          zIndex: "var(--z-map-popover, 1000)",
          pointerEvents: "none",
        }}
      >
        <div style={{ position: "relative", minWidth: 370, maxWidth: 420 }}>
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.80)",
              color: "#fff",
              boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
              padding: "15px 18px 15px 18px",
              fontFamily: "inherit",
              borderRadius: 5,
            }}
          >
            {/* Header with close button */}
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold uppercase text-base">
                {terminalName}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:cursor-pointer pointer-events-auto transition-colors p-1"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Information rows */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex gap-3">
                <div className="w-[180px] text-sm font-medium">Device ID</div>
                <div className="ml-auto text-right text-sm max-w-[170px] whitespace-normal break-words">
                  {popover.terminalID || "N/A"}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-[180px] text-sm font-medium">Status</div>
                <div className="ml-auto text-right text-sm max-w-[170px] whitespace-normal break-words">
                  {popover.terminalStatus || "N/A"}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-[180px] text-sm font-medium">Time Sent</div>
                <div className="ml-auto text-right text-sm max-w-[170px] whitespace-normal break-words">
                  {popover.timeSent || "N/A"}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-[180px] text-sm font-medium">Focal Person</div>
                <div className="ml-auto text-right text-sm max-w-[170px] whitespace-normal break-words">
                  {popover.focalPerson || "N/A"}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-[180px] text-sm font-medium">House Address</div>
                <div className="ml-auto text-right text-sm max-w-[170px] whitespace-normal break-words">
                  {popover.address || "N/A"}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-[180px] text-sm font-medium">Contact No.</div>
                <div className="ml-auto text-right text-sm max-w-[170px] whitespace-normal break-words">
                  {popover.contactNumber || "N/A"}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-[180px] text-sm font-medium">Alerts</div>
                <div className="ml-auto text-right text-sm max-w-[170px] whitespace-normal break-words">
                  {popover.totalAlerts || 0}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 pointer-events-auto">
              <button
                onClick={handleMoreInfo}
                disabled={loadingCommunityData}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                {loadingCommunityData ? "Loading..." : "More Info"}
              </button>
              <button
                onClick={() => {
                  if (onOpenInsights && popover) {
                    onOpenInsights(popover.terminalID, terminalName);
                  }
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                AI Insights
              </button>
            </div>

            {/* Downward pointer/arrow */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                bottom: "-23px",
                width: 0,
                height: 0,
                borderLeft: "20px solid transparent",
                borderRight: "20px solid transparent",
                borderTop: "24px solid rgba(0,0,0,0.80)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Community Group Info Sheet */}
      <CommunityGroupInfoSheet
        open={communityInfoOpen}
        onOpenChange={setCommunityInfoOpen}
        communityData={communityData}
      />
    </>
  );
}
