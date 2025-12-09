import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs-focal";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { ReportsTable } from "./components";
import type { TransformedCompletedReport } from "./hooks/useReports";
import { useReports } from "./hooks/useReports";

export function Reports() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("completed");
  const [archivedReports, setArchivedReports] = useState<
    TransformedCompletedReport[]
  >([]);
  const {
    pendingReports,
    completedReports,
    loading,
    error,
    refreshAllReports,
  } = useReports();

  // Archive function (frontend-only for now)
  const handleArchive = (reportId: string) => {
    const reportToArchive = completedReports.find(
      (report) => report.emergencyId === reportId
    );
    if (reportToArchive) {
      setArchivedReports((prev) => [...prev, reportToArchive]);
      // In a real implementation, this would call an API to archive the report
      refreshAllReports(); // This would remove it from completed reports
    }
  };

  // Restore function
  const handleRestore = (reportId: string) => {
    setArchivedReports((prev) =>
      prev.filter((report) => report.emergencyId !== reportId)
    );
    // In a real implementation, this would call an API to restore the report
    refreshAllReports();
  };

  // Delete function
  const handleDelete = (reportId: string) => {
    setArchivedReports((prev) =>
      prev.filter((report) => report.emergencyId !== reportId)
    );
    // In a real implementation, this would call an API to permanently delete the report
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
                  defaultValue="completed"
                  onValueChange={setActiveTab}
                >
                  <TabsList>
                    <TabsTrigger
                      value="completed"
                      className="text-white text-base px-6 py-2 rounded transition-colors cursor-pointer hover:bg-[#333333]"
                    >
                      Completed
                      <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                        {completedReports.length}
                      </span>
                    </TabsTrigger>
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
    </div>
  );
}
