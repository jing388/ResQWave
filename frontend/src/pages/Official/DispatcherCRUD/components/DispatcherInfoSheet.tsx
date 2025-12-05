import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CircleUserRound } from "lucide-react";
import type { DispatcherInfoSheetProps } from "../types";

export function DispatcherInfoSheet({
  open,
  onOpenChange,
  dispatcherData,
}: DispatcherInfoSheetProps) {
  // Safety check - don't render if no data
  if (!dispatcherData) {
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
              Dispatcher Information
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-6 py-6 space-y-6">
          {/* Dispatcher Icon Section */}
          <div className="space-y-4">
            <div className="bg-[#0b0b0b] rounded-[6px] flex justify-center mt-1">
              <div className="relative w-full max-w-full h-40 rounded-[8px] overflow-hidden bg-[#111] flex items-center justify-center">
                <CircleUserRound
                  className="w-24 h-24 text-[#a1a1a1]"
                  strokeWidth={1.5}
                />
                <div className="absolute bottom-3 right-3 text-[#666] text-base">
                  Dispatcher
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#2a2a2a]"></div>

          {/* Information Fields */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">ID</span>
              <span className="text-white text-sm">{dispatcherData.id}</span>
            </div>
            <div className="border-t border-[#2a2a2a]"></div>
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">
                FULL NAME
              </span>
              <span className="text-white text-sm">{dispatcherData.name}</span>
            </div>
            <div className="border-t border-[#2a2a2a]"></div>
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">
                CONTACT NUMBER
              </span>
              <span className="text-white text-sm">
                {dispatcherData.contactNumber}
              </span>
            </div>
            <div className="border-t border-[#2a2a2a]"></div>
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">EMAIL</span>
              <span className="text-white text-sm">{dispatcherData.email}</span>
            </div>
            <div className="border-t border-[#2a2a2a]"></div>
            <div className="flex justify-between items-center">
              <span className="text-white text-sm pl-3 font-bold">
                CREATED DATE
              </span>
              <span className="text-white text-sm">
                {dispatcherData.createdAt}
              </span>
            </div>
            {dispatcherData.createdBy && (
              <>
                <div className="border-t border-[#2a2a2a]"></div>
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm pl-3 font-bold">
                    CREATED BY
                  </span>
                  <span className="text-white text-sm">
                    {dispatcherData.createdBy}
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
