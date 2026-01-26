import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs-focal";
import { useAuth } from "@/contexts/AuthContext";
import { useRef, useState } from "react";
import { ReportsTable } from "./components";
import ReportAlerts, { type ReportAlertsHandle } from "./components/ReportAlerts";
import { useReports } from "./hooks/useReports";

export function Reports() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(isAdmin() ? "archive" : "pending");
  const alertsRef = useRef<ReportAlertsHandle>(null);
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
        err instanceof Error ? err.message : "Failed to archive report"
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
        err instanceof Error ? err.message : "Failed to restore report"
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
          err instanceof Error ? err.message : "Failed to delete report"
        );
      }
    });
  };

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
            <CardHeader className="!shrink-0 !flex !flex-row !items-center !gap-2 !py-3 !px-0 !grid-cols-1 !auto-rows-auto">
              <CardTitle className="text-foreground text-2xl">
                Reports
              </CardTitle>
              <div className="flex items-center gap-3">
                <Tabs
                  value={activeTab}
                  defaultValue={isAdmin() ? "archive" : "pending"}
                  onValueChange={setActiveTab}
                >
                  <TabsList>
                    <TabsTrigger
                      value={isAdmin() ? "archive" : "pending"}
                      className="text-white text-base px-6 py-2 rounded transition-colors cursor-pointer hover:bg-[#333333]"
                    >
                      {isAdmin() ? "Archive" : "Pending"}
                      <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                        {isAdmin()
                          ? archivedReports.length
                          : pendingReports.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="completed"
                      className="text-white text-base px-6 py-2 rounded transition-colors cursor-pointer hover:bg-[#333333]"
                    >
                      Completed
                      <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                        {completedReports.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="!flex-1 !flex !flex-col !min-h-0 !overflow-hidden !p-0 !m-0">
              {activeTab === "completed" ? (
                <ReportsTable
                  type="completed"
                  data={completedReports}
                  onReportCreated={refreshAllReports}
                  onArchive={handleArchive}
                />
              ) : activeTab === "archive" ? (
                <ReportsTable
                  type="archive"
                  data={archivedReports}
                  onReportCreated={refreshAllReports}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                />
              ) : (
                <ReportsTable
                  type="pending"
                  data={pendingReports}
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
