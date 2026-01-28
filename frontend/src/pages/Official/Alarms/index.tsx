import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AlarmInfoSheet } from "./components/AlarmInfoSheet";
import { createColumns } from "./components/Column";
import { DataTable } from "./components/DataTable";
import { useAlarms } from "./hooks/useAlarms";
import type { Alarm } from "./types";

export function Alarms() {
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  
  // Use the custom hook to fetch alarms from backend
  const { alarms, loading, error, refreshData } = useAlarms();

  const handleMoreInfo = (alarm: Alarm) => {
    setSelectedAlarm(alarm);
    setInfoSheetOpen(true);
  };

  const handleEdit = (alarm: Alarm) => {
    console.log("Edit alarm:", alarm);
    // TODO: Implement edit functionality
  };

  const handleArchive = (alarm: Alarm) => {
    console.log("Archive alarm:", alarm);
    // TODO: Implement archive functionality
  };

  const columns = useMemo(
    () =>
      createColumns({
        onMoreInfo: handleMoreInfo,
        onEdit: handleEdit,
        onArchive: handleArchive,
      }),
    [],
  );

  // Filter function for search
  const filterAlarms = (alarms: Alarm[]) => {
    if (!searchQuery.trim()) return alarms;

    return alarms.filter(
      (alarm) =>
        alarm.terminalId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alarm.terminalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alarm.alert.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alarm.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alarm.severity.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const filteredAlarms = filterAlarms(alarms);

  // Show loading state
  if (loading) {
    return (
      <div className="bg-[#171717] text-white p-4 sm:p-6 flex flex-col h-[calc(100vh-73px)] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-lg">Loading alarms...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-[#171717] text-white p-4 sm:p-6 flex flex-col h-[calc(100vh-73px)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg text-red-500">Error: {error}</p>
          <Button
            onClick={refreshData}
            className="bg-white text-black hover:bg-gray-200"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#171717] text-white p-4 sm:p-6 flex flex-col h-[calc(100vh-73px)]">
      <div className="w-full max-w-9xl mx-auto flex-1 flex flex-col min-h-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2 md:mb-4 gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">Alarms</h1>
          </div>

          <div className="flex items-center gap-1">
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                searchVisible ? "w-64 opacity-100" : "w-0 opacity-0"
              }`}
            >
              <Input
                type="text"
                placeholder="Search alarms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-[#262626] border-[#404040] text-white placeholder:text-[#a1a1a1] focus:border-[#4285f4] transition-all duration-300"
                autoFocus={searchVisible}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={`text-[#a1a1a1] hover:text-white hover:bg-[#262626] transition-all duration-200 ${
                searchVisible ? "bg-[#262626] text-white" : ""
              }`}
              onClick={() => {
                setSearchVisible(!searchVisible);
                if (searchVisible) {
                  setSearchQuery("");
                }
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <DataTable
            columns={columns}
            data={filteredAlarms}
            onRowClick={(row) => handleMoreInfo(row as Alarm)}
          />
        </div>
      </div>

      {/* Alarm Info Sheet */}
      <AlarmInfoSheet
        open={infoSheetOpen}
        onOpenChange={setInfoSheetOpen}
        alarmData={selectedAlarm}
      />
    </div>
  );
}
