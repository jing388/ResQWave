import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TerminalDetails } from "../types";

interface TerminalInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminalData?: TerminalDetails;
}

export function TerminalInfoSheet({
  open,
  onOpenChange,
  terminalData,
}: TerminalInfoSheetProps) {
  // Safety check - don't render if no data
  if (!terminalData) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[500px] bg-[#171717] border-[#2a2a2a] text-white p-0 overflow-y-auto rounded-[5px]"
      >
        <SheetHeader className="px-6 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white text-xl font-medium">
              Terminal Information
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-6 py-6 space-y-6">
          {/* Terminal Icon Section */}
          <div className="space-y-4">
            <div className="bg-[#0b0b0b] rounded-[6px] flex justify-center mt-1">
              <div className="relative w-full max-w-full h-40 rounded-[8px] overflow-hidden bg-[#111] flex items-center justify-center">
                <div className="w-24 h-24 bg-[#3a3a3a] rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-[#a1a1a1]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="2"
                      y="4"
                      width="20"
                      height="16"
                      rx="2"
                      strokeWidth="2"
                    />
                    <path
                      d="M6 8h.01M10 8h.01M14 8h.01M6 12h.01M10 12h.01M14 12h.01"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="absolute bottom-3 right-3 text-[#666] text-base">
                  Terminal Device
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#2a2a2a]"></div>

          {/* Information Fields */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">ID</span>
              <span className="text-white text-sm">{terminalData.id}</span>
            </div>
            <div className="border-t border-[#2a2a2a]"></div>
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">NAME</span>
              <span className="text-white text-sm">{terminalData.name}</span>
            </div>
            <div className="border-t border-[#2a2a2a]"></div>
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">STATUS</span>
              <span
                className={`text-sm font-semibold ${terminalData.status === "Online" ? "text-green-400" : "text-red-400"}`}
              >
                {terminalData.status}
              </span>
            </div>
            <div className="border-t border-[#2a2a2a]"></div>
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">
                AVAILABILITY
              </span>
              <span
                className={`text-sm font-semibold ${terminalData.availability === "Available" ? "text-blue-400" : "text-yellow-400"}`}
              >
                {terminalData.availability}
              </span>
            </div>
            <div className="border-t border-[#2a2a2a]"></div>
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">
                CREATED DATE
              </span>
              <span className="text-white text-sm">
                {terminalData.dateCreated}
              </span>
            </div>
            <div className="border-t border-[#2a2a2a]"></div>
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">
                UPDATED DATE
              </span>
              <span className="text-white text-sm">
                {terminalData.dateUpdated}
              </span>
            </div>
            {terminalData.archived !== undefined && (
              <>
                <div className="border-t border-[#2a2a2a]"></div>
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm pl-3 font-bold">
                    ARCHIVED
                  </span>
                  <span
                    className={`text-sm font-semibold ${terminalData.archived ? "text-orange-400" : "text-green-400"}`}
                  >
                    {terminalData.archived ? "Yes" : "No"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
