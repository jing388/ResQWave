import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AlarmFilters, type FilterState } from "./components/AlarmFilters";
import { useNavigate } from "react-router-dom";
import { AlarmInfoSheet } from "./components/AlarmInfoSheet";
import { createColumns } from "./components/Column";
import { DataTable } from "./components/DataTable";
import { useAlarms } from "./hooks/useAlarms";
import type { Alarm } from "./types";

export function Alarms() {
  const [activeTab, setActiveTab] = useState<"active" | "cleared">("active");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    severity: "all",
    createdAtRange: "all",
    createdAtStartDate: "",
    createdAtEndDate: "",
    updatedAtRange: "all",
    updatedAtStartDate: "",
    updatedAtEndDate: "",
  });

  const navigate = useNavigate();
  
  // Use the custom hook to fetch alarms from backend
  const { activeAlarms, clearedAlarms, loading, error, refreshData } = useAlarms();

  const handleMoreInfo = (alarm: Alarm) => {
    setSelectedAlarm(alarm);
    setInfoSheetOpen(true);
  };

  const handleEdit = (alarm: Alarm) => {
    // Navigate to Dashboard map view with terminal info
    navigate(
      `/dashboard?tab=map-view&terminalID=${alarm.terminalId}&terminalName=${encodeURIComponent(alarm.terminalName)}&autoOpen=true`
    );
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
    [handleMoreInfo, handleEdit, handleArchive],
  );

  // Helper function to parse date strings
  const parseFormattedDate = (dateStr: string): Date => {
    return new Date(dateStr);
  };

  // Helper function to get date range
  const getDateRange = (
    range: string,
    customStart?: string,
    customEnd?: string,
  ) => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (range) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "last7days":
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case "last30days":
        startDate = new Date(now.setDate(now.getDate() - 30));
        endDate = new Date();
        break;
      case "last3months":
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        endDate = new Date();
        break;
      case "custom":
        if (customStart) startDate = new Date(customStart);
        if (customEnd) endDate = new Date(customEnd);
        break;
      default:
        return { startDate: null, endDate: null };
    }

    return { startDate, endDate };
  };

  // Check if filters are active
  const isFiltered = useMemo(() => {
    return (
      filters.severity !== "all" ||
      filters.createdAtRange !== "all" ||
      filters.updatedAtRange !== "all"
    );
  }, [filters]);

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      severity: "all",
      createdAtRange: "all",
      createdAtStartDate: "",
      createdAtEndDate: "",
      updatedAtRange: "all",
      updatedAtStartDate: "",
      updatedAtEndDate: "",
    });
  };

  // Filter function for search and filters
  const filterAlarms = (alarms: Alarm[]) => {
    let filtered = [...alarms];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (alarm) =>
          alarm.terminalId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alarm.terminalName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          alarm.alert.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alarm.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alarm.severity.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply severity filter
    if (filters.severity !== "all") {
      filtered = filtered.filter(
        (alarm) => alarm.severity === filters.severity,
      );
    }

    // Apply Created At date range filter
    if (filters.createdAtRange !== "all") {
      const { startDate, endDate } = getDateRange(
        filters.createdAtRange,
        filters.createdAtStartDate,
        filters.createdAtEndDate,
      );

      if (startDate || endDate) {
        filtered = filtered.filter((alarm) => {
          const alarmDate = parseFormattedDate(alarm.createdAt);
          if (startDate && endDate) {
            return alarmDate >= startDate && alarmDate <= endDate;
          } else if (startDate) {
            return alarmDate >= startDate;
          } else if (endDate) {
            return alarmDate <= endDate;
          }
          return true;
        });
      }
    }

    // Apply Updated At date range filter
    if (filters.updatedAtRange !== "all") {
      const { startDate, endDate } = getDateRange(
        filters.updatedAtRange,
        filters.updatedAtStartDate,
        filters.updatedAtEndDate,
      );

      if (startDate || endDate) {
        filtered = filtered.filter((alarm) => {
          const alarmDate = parseFormattedDate(alarm.updatedAt);
          if (startDate && endDate) {
            return alarmDate >= startDate && alarmDate <= endDate;
          } else if (startDate) {
            return alarmDate >= startDate;
          } else if (endDate) {
            return alarmDate <= endDate;
          }
          return true;
        });
      }
    }

    return filtered;
  };

  // Get the appropriate data based on active tab
  const currentAlarms = activeTab === "active" ? activeAlarms : clearedAlarms;
  const filteredAlarms = filterAlarms(currentAlarms);

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

  return (
    <div className="bg-[#171717] text-white p-4 sm:p-6 flex flex-col h-[calc(100vh-73px)]">
      <div className="w-full max-w-9xl mx-auto flex-1 flex flex-col min-h-0">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L3.054 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <span className="text-red-400">Error: {error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
            >
              Retry
            </Button>
          </div>
        )}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <h1 className="text-2xl font-semibold text-white">Alarms</h1>
            <div className="flex items-center gap-1 bg-[#262626] rounded-[5px] p-1">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2 rounded-[5px] text-sm font-medium transition-colors ${
                  activeTab === "active"
                    ? "bg-[#404040] text-white"
                    : "bg-transparent text-[#a1a1a1] hover:text-white"
                }`}
              >
                Active
                <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                  {activeAlarms.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("cleared")}
                className={`px-4 py-2 rounded-[5px] text-sm font-medium transition-colors ${
                  activeTab === "cleared"
                    ? "bg-[#404040] text-white"
                    : "bg-transparent text-[#a1a1a1] hover:text-white"
                }`}
              >
                Cleared
                <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                  {clearedAlarms.length}
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <AlarmFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={handleClearFilters}
              isFiltered={isFiltered}
            />
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
              variant="outline"
              size="sm"
              className={`bg-[#262626] border border-[#404040] text-white hover:bg-[#333333] hover:text-white h-[38px] ${
                searchVisible ? "bg-[#333333]" : ""
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
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="bg-[#262626] border border-[#404040] text-white hover:bg-[#333333] hover:text-white h-[38px]"
            >
              <RefreshCcw className="h-4 w-4" />
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
