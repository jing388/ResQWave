import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs-focal";
import { useState } from "react";
import { AlertTypeChart, ReportsTable } from "./components";
import { useReports } from "./hooks/useReports";

export function Reports() {
  const [activeTab, setActiveTab] = useState("completed");
  const { 
    pendingReports, 
    completedReports, 
    loading, 
    error,
    refreshAllReports
  } = useReports();


  return (
    <div 
      className="p-4 flex flex-col bg-[#171717] gap-1 h-[calc(100vh-73px)] max-h-[calc(100vh-73px)] overflow-hidden"
    >
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
        <div className="flex-1 flex flex-col min-h-0 gap-1">
          {/* Top section with chart - 40% of available height */}
          <div className="h-[40%] min-h-[200px]">
            {/* Alert Type Chart - Full width */}
            <Card className="border-border flex flex-col h-full" style={{ backgroundColor: "#211f1f" }}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-foreground">Alert Type</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Real-time data showing user-initiated and critical alerts from rescue forms
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <AlertTypeChart />
              </CardContent>
            </Card>
          </div>

          {/* Reports Table - 60% of available height */}
          <Card className="flex flex-col border-0 h-[60%] overflow-hidden min-h-0 max-h-[60%]">
            <CardHeader className="flex-shrink-0 flex flex-row items-center gap-2">
              <CardTitle className="text-foreground text-2xl">Reports</CardTitle>
              <div className="flex items-center gap-3">
                <Tabs value={activeTab} defaultValue="completed" onValueChange={setActiveTab}>
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
                      value="pending"
                      className="text-white text-base px-6 py-2 rounded transition-colors cursor-pointer hover:bg-[#333333]"
                    >
                      Pending
                      <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                        {pendingReports.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden min-h-0 max-h-full">
              {activeTab === "completed" ? (
                <ReportsTable 
                  type="completed" 
                  data={completedReports}
                  onReportCreated={refreshAllReports}
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