import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RadioReceiver, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Alarm } from "../types";

interface AlarmInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alarmData: Alarm | null;
}

interface AlarmDetails {
  id: string;
  terminalId: string;
  terminalName: string;
  terminalAddress: string;
  alert: string;
  description: string;
  status: string;
  severity: string;
  createdAt: string;
  updatedAt: string;
}

export function AlarmInfoSheet({
  open,
  onOpenChange,
  alarmData,
}: AlarmInfoSheetProps) {
  const [alarmDetails, setAlarmDetails] = useState<AlarmDetails | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper function to get description based on alarm name
  const getAlarmDescription = (alarmName: string): string => {
    switch (alarmName) {
      case "Critical Battery Level":
        return "System warning threshold for critically low battery.";
      case "Extended Downtime":
        return "Prolonged period of terminal unavailability triggering a distress signal.";
      default:
        return "No description available";
    }
  };

  useEffect(() => {
    if (!alarmData || !open) return;

    const fetchAlarmDetails = async () => {
      setLoading(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
        const token = localStorage.getItem("resqwave_token");

        const response = await fetch(`${API_BASE_URL}/alarms/${alarmData.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch alarm details");
        }

        const data = await response.json();
        
        const alarmName = data.name || alarmData.alert;
        
        // Format the data
        setAlarmDetails({
          id: data.terminalID || alarmData.terminalId,
          terminalId: data.terminalID || alarmData.terminalId,
          terminalName: data.terminalName || alarmData.terminalName,
          terminalAddress: data.terminalAddress || alarmData.terminalAddress || "N/A",
          alert: alarmName,
          description: getAlarmDescription(alarmName),
          status: data.status || alarmData.status,
          severity: data.severity || alarmData.severity,
          createdAt: formatDate(data.createdAt || alarmData.createdAt),
          updatedAt: formatDate(data.updatedAt || alarmData.updatedAt),
        });
      } catch (error) {
        console.error("Error fetching alarm details:", error);
        // Fallback to alarmData
        setAlarmDetails({
          id: alarmData.terminalId,
          terminalId: alarmData.terminalId,
          terminalName: alarmData.terminalName,
          terminalAddress: alarmData.terminalAddress || "N/A",
          alert: alarmData.alert,
          description: getAlarmDescription(alarmData.alert),
          status: alarmData.status,
          severity: alarmData.severity,
          createdAt: alarmData.createdAt,
          updatedAt: alarmData.updatedAt,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAlarmDetails();
  }, [alarmData, open]);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  if (!alarmData) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[500px] bg-[#171717] border-[#2a2a2a] text-white p-0 overflow-y-auto rounded-[5px] z-[160]"
      >
        <SheetHeader className="sticky top-0 z-10 bg-[#171717] px-4 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between h-12">
            <SheetTitle className="text-white text-xl font-normal">
              Alarm Information
            </SheetTitle>
            <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
              <X className="h-5 w-5 text-white" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="px-5 pt-4 pb-2 flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : alarmDetails ? (
          <div className="px-5 pt-4 pb-2 space-y-2">
            {/* Terminal Icon/Image */}
            <div className="bg-[#171717] flex justify-center py-8 px-2 rounded-[5px] mt-0 mb-4">
              <div className="relative w-full max-w-full h-48 rounded-[5px] overflow-hidden bg-[#2a2a2a] flex items-center justify-center">
                {/* Terminal Icon */}
                <div className="w-32 h-32 bg-[#404040] rounded-full flex items-center justify-center">
                  <RadioReceiver className="w-16 h-16 text-[#666666]" />
                </div>
                {/* Terminal ID Badge */}
                <div className="absolute bottom-4 right-4 text-white text-sm font-medium">
                  {alarmDetails.terminalId}
                </div>
              </div>
            </div>

            {/* Terminal Name */}
            <div className="flex justify-between items-center bg-[#171717] px-4 py-4 rounded-[5px]">
              <span className="text-white/80 text-sm">Terminal Name</span>
              <span className="text-white text-sm">{alarmDetails.terminalName}</span>
            </div>

            {/* Terminal Address */}
            <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
              <span className="text-white/80 text-sm">Terminal Address</span>
              <span className="text-white text-sm text-right">
                {alarmDetails.terminalAddress}
              </span>
            </div>

            {/* Alert */}
            <div className="flex justify-between items-center bg-[#171717] px-4 py-4 rounded-[5px]">
              <span className="text-white/80 text-sm">Alert</span>
              <span className="text-white text-sm">{alarmDetails.alert}</span>
            </div>

            {/* Description */}
            <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
              <span className="text-white/80 text-sm">Description</span>
              <span className="text-white text-sm text-right">
                {alarmDetails.description}
              </span>
            </div>

            {/* Status */}
            <div className="flex justify-between items-center bg-[#171717] px-4 py-4 rounded-[5px]">
              <span className="text-white/80 text-sm">Status</span>
              <div
                className={`inline-flex items-center justify-center px-3 py-1 rounded-[5px] border text-xs font-medium uppercase ${
                  alarmDetails.status === "Active"
                    ? "border-green-500 text-green-500 bg-green-500/10"
                    : "border-blue-500 text-blue-500 bg-blue-500/10"
                }`}
              >
                {alarmDetails.status}
              </div>
            </div>

            {/* Severity */}
            <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
              <span className="text-white/80 text-sm">Severity</span>
              <div
                className={`inline-flex items-center justify-center px-3 py-1 rounded-[5px] border text-xs font-medium uppercase ${
                  alarmDetails.severity === "Major"
                    ? "border-red-500 text-red-500 bg-red-500/10"
                    : "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                }`}
              >
                {alarmDetails.severity}
              </div>
            </div>

            {/* Created On */}
            <div className="flex justify-between items-center bg-[#171717] px-4 py-4 rounded-[5px]">
              <span className="text-white/80 text-sm">Created On</span>
              <span className="text-white text-sm">{alarmDetails.createdAt}</span>
            </div>

            {/* Last Update */}
            <div className="flex justify-between items-center bg-[#1d1d1d] px-4 py-4 rounded-[5px]">
              <span className="text-white/80 text-sm">Last Update</span>
              <span className="text-white text-sm">{alarmDetails.updatedAt}</span>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-4 pb-2 flex items-center justify-center min-h-[400px]">
            <p className="text-white/60">No alarm data available</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default AlarmInfoSheet;
