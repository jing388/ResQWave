import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs-focal";
import { useAuth } from "@/contexts/AuthContext";
import { useRef, useState, useMemo } from "react";
import { ReportsTable } from "./components";
import ReportAlerts, {
  type ReportAlertsHandle,
} from "./components/ReportAlerts";
import { ReportFilters, type FilterState } from "./components/ReportFilters";
import { useReports } from "./hooks/useReports";

export function Reports() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(
    isAdmin() ? "completed" : "pending",
  );
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const alertsRef = useRef<ReportAlertsHandle>(null);
  const [filters, setFilters] = useState<FilterState>({
    alertType: "all",
    dateRange: "all",
    dispatcher: "all",
    barangay: "all",
  });
  const {
    pendingReports,
    completedReports,
    archivedReports,
    loading,
    error,
    archiveReport,
    restoreReport,
    deleteReport,
    refreshAllReports,
  } = useReports();

  // Archive function - now calls backend
  const handleArchive = async (reportId: string) => {
    try {
      await archiveReport(reportId);
      alertsRef.current?.showArchiveSuccess(reportId);
      // Switch to archive tab to show the archived report
      setActiveTab("archive");
      // refreshAllReports is called automatically in archiveReport
    } catch (err) {
      console.error("Failed to archive report:", err);
      alertsRef.current?.showError(
        err instanceof Error ? err.message : "Failed to archive report",
      );
    }
  };

  // Restore function
  const handleRestore = async (reportId: string) => {
    try {
      await restoreReport(reportId);
      alertsRef.current?.showRestoreSuccess(reportId);
      // Switch to completed tab to show the restored report
      setActiveTab("completed");
    } catch (err) {
      console.error("Failed to restore report:", err);
      alertsRef.current?.showError(
        err instanceof Error ? err.message : "Failed to restore report",
      );
    }
  };

  // Delete function with confirmation
  const handleDelete = async (reportId: string) => {
    alertsRef.current?.showDeleteConfirmation(reportId, async () => {
      try {
        await deleteReport(reportId);
        alertsRef.current?.showDeleteSuccess(reportId);
      } catch (err) {
        console.error("Failed to delete report:", err);
        alertsRef.current?.showError(
          err instanceof Error ? err.message : "Failed to delete report",
        );
      }
    });
  };

  // Parse date from formatted string (MM/DD/YYYY | HH:MM AM/PM)
  const parseFormattedDate = (dateString: string): Date => {
    try {
      const [datePart] = dateString.split(" | ");
      const [month, day, year] = datePart.split("/");
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } catch {
      return new Date(dateString);
    }
  };

  // Get date range for filtering
  const getDateRange = () => {
    const now = new Date();
    const startOfDay = (date: Date) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = (date: Date) =>
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999,
      );

    switch (filters.dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "last7days": {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        return { start: startOfDay(start), end: endOfDay(now) };
      }
      case "last30days": {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        return { start: startOfDay(start), end: endOfDay(now) };
      }
      case "last3months": {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 3);
        return { start: startOfDay(start), end: endOfDay(now) };
      }
      case "custom":
        if (filters.customStartDate && filters.customEndDate) {
          return {
            start: startOfDay(filters.customStartDate),
            end: endOfDay(filters.customEndDate),
          };
        }
        return null;
      default:
        return null;
    }
  };

  // Filter function for search and filters
  const filterReports = <
    T extends {
      emergencyId: string;
      communityName: string;
      alertType: string;
      dispatcher: string;
      address: string;
      dateTimeOccurred: string;
    },
  >(
    reports: T[],
  ) => {
    let filtered = reports;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (report) =>
          report.emergencyId
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          report.communityName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          report.alertType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.dispatcher.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.address.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply alert type filter
    if (filters.alertType !== "all") {
      filtered = filtered.filter(
        (report) => report.alertType === filters.alertType,
      );
    }

    // Apply date range filter
    const dateRange = getDateRange();
    if (dateRange) {
      filtered = filtered.filter((report) => {
        const reportDate = parseFormattedDate(report.dateTimeOccurred);
        return reportDate >= dateRange.start && reportDate <= dateRange.end;
      });
    }

    // Apply dispatcher filter
    if (filters.dispatcher !== "all") {
      filtered = filtered.filter(
        (report) => report.dispatcher === filters.dispatcher,
      );
    }

    // Apply barangay filter
    if (filters.barangay !== "all") {
      filtered = filtered.filter(
        (report) => report.communityName === filters.barangay,
      );
    }

    return filtered;
  };

  // Get unique dispatchers and barangays for filter options
  const allReports = useMemo(() => {
    return [...pendingReports, ...completedReports, ...archivedReports];
  }, [pendingReports, completedReports, archivedReports]);

  const uniqueDispatchers = useMemo(() => {
    const dispatchers = new Set(allReports.map((r) => r.dispatcher));
    return Array.from(dispatchers).sort();
  }, [allReports]);

  const uniqueBarangays = useMemo(() => {
    const barangays = new Set(allReports.map((r) => r.communityName));
    return Array.from(barangays).sort();
  }, [allReports]);

  // Apply filters to each report type
  const filteredPendingReports = filterReports(pendingReports);
  const filteredCompletedReports = filterReports(completedReports);
  const filteredArchivedReports = filterReports(archivedReports);

  return (
    <div className="p-2 px-6 flex flex-col bg-[#171717] gap-0 h-[calc(100vh-73px)] max-h-[calc(100vh-73px)] overflow-hidden">
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="text-white">Loading reports...</div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-32">
          <div className="text-red-400">Error: {error}</div>
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 flex flex-col min-h-0 gap-0">
          {/* Chart section commented out for now */}
          {/* <div className="h-[40%] min-h-[200px]">
            <Card
              className="border-border flex flex-col h-full"
              style={{ backgroundColor: "#211f1f" }}
            >
              <CardHeader className="flex-shrink-0 flex flex-row items-start justify-between">
                <div className="flex flex-col">
                  <CardTitle className="text-foreground">Alert Type</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Real-time data showing user-initiated and critical alerts
                    from rescue forms
                  </CardDescription>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40 bg-[#2a2a2a] border-[#404040] text-white hover:bg-[#333333]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-[#404040]">
                    <SelectItem
                      value="last3months"
                      className="text-white hover:bg-[#404040] focus:bg-[#404040]"
                    >
                      Last 30 days
                    </SelectItem>
                    <SelectItem
                      value="last6months"
                      className="text-white hover:bg-[#404040] focus:bg-[#404040]"
                    >
                      Last 6 months
                    </SelectItem>
                    <SelectItem
                      value="lastyear"
                      className="text-white hover:bg-[#404040] focus:bg-[#404040]"
                    >
                      Last year
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <AlertTypeChart timeRange={timeRange} />
              </CardContent>
            </Card>
          </div> */}

          {/* Reports Table - Full height now */}
          <Card className="!flex !flex-col !border-0 !flex-1 !min-h-0 !overflow-hidden !gap-0 !py-0 !px-0 !bg-[#171717] !shadow-none !rounded-none">
            <CardHeader className="!shrink-0 !flex !flex-row !items-center !justify-between !gap-3 !py-3 !px-0">
              {/* Left side: Title and Tabs */}
              <div className="flex items-center gap-3">
                <CardTitle className="text-foreground text-2xl whitespace-nowrap">
                  Reports
                </CardTitle>
                <Tabs
                  value={activeTab}
                  defaultValue={isAdmin() ? "completed" : "pending"}
                  onValueChange={setActiveTab}
                >
                  <TabsList>
                    {isAdmin() ? (
                      <>
                        <TabsTrigger
                          value="completed"
                          className="text-white text-base px-6 py-2 rounded transition-colors cursor-pointer hover:bg-[#333333]"
                        >
                          Completed
                          <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                            {filteredCompletedReports.length}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="archive"
                          className="text-white text-base px-6 py-2 rounded transition-colors cursor-pointer hover:bg-[#333333]"
                        >
                          Archive
                          <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                            {filteredArchivedReports.length}
                          </span>
                        </TabsTrigger>
                      </>
                    ) : (
                      <>
                        <TabsTrigger
                          value="pending"
                          className="text-white text-base px-6 py-2 rounded transition-colors cursor-pointer hover:bg-[#333333]"
                        >
                          Pending
                          <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                            {filteredPendingReports.length}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="completed"
                          className="text-white text-base px-6 py-2 rounded transition-colors cursor-pointer hover:bg-[#333333]"
                        >
                          Completed
                          <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                            {filteredCompletedReports.length}
                          </span>
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>
                </Tabs>
              </div>

              {/* Right side: Filters, Search and Refresh */}
              <div className="flex items-center gap-2">
                <ReportFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  dispatchers={uniqueDispatchers}
                  barangays={uniqueBarangays}
                />
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    searchVisible ? "w-64 opacity-100" : "w-0 opacity-0"
                  }`}
                >
                  <Input
                    type="text"
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 bg-[#262626] border-[#404040] text-white placeholder:text-[#a1a1a1] focus:border-[#4285f4] transition-all duration-300"
                    autoFocus={searchVisible}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`bg-[#262626] border border-[#404040] text-white hover:bg-[#333333] transition-all duration-200 ${searchVisible ? "bg-[#333333]" : ""}`}
                  onClick={() => {
                    setSearchVisible(!searchVisible);
                    if (searchVisible) {
                      setSearchQuery("");
                    }
                  }}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-[#262626] border border-[#404040] text-white hover:bg-[#333333]"
                  onClick={refreshAllReports}
                  title="Refresh data"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8.002 8.002 0 0115.356 2M4.582 9H9M15 15v5h.582m0-5.582A8.001 8.001 0 0019.418 15M15 20.582V15a8.002 8.002 0 00-4.418-7.164"
                    />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="!flex-1 !flex !flex-col !min-h-0 !overflow-hidden !p-0 !m-0">
              {activeTab === "completed" ? (
                <ReportsTable
                  type="completed"
                  data={filteredCompletedReports}
                  onReportCreated={refreshAllReports}
                  onArchive={handleArchive}
                />
              ) : activeTab === "archive" ? (
                <ReportsTable
                  type="archive"
                  data={filteredArchivedReports}
                  onReportCreated={refreshAllReports}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                />
              ) : (
                <ReportsTable
                  type="pending"
                  data={filteredPendingReports}
                  onReportCreated={refreshAllReports}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <ReportAlerts ref={alertsRef} />
    </div>
  );
}
