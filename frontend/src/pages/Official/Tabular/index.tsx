import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs-focal";
import { ArrowUpDown, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { AlertInfoDialog } from "./components/AlertInfoDialog";
import { createColumns } from "./components/Columns";
import { DataTable } from "./components/DataTable";
import { mockLiveReportData } from "./data/mockData";
import type { AlertFilter, LiveReportAlert, TabType } from "./types";
import { applyAllFilters, getTabCounts } from "./utils/filters";

export function Tabular() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [alertTypeFilter, setAlertTypeFilter] = useState("All");
  const [selectedAlert, setSelectedAlert] = useState<LiveReportAlert | null>(
    null,
  );
  const [alertInfoOpen, setAlertInfoOpen] = useState(false);

  const handleMoreInfo = useCallback((alert: LiveReportAlert) => {
    setSelectedAlert(alert);
    setAlertInfoOpen(true);
  }, []);

  const handleAssign = useCallback((alert: LiveReportAlert) => {
    console.log("Assign alert:", alert);
    // TODO: Implement assign functionality
  }, []);

  const handleDispatch = useCallback((alert: LiveReportAlert) => {
    console.log("Dispatch alert:", alert);
    // TODO: Implement dispatch functionality
  }, []);

  const columns = useMemo(
    () =>
      createColumns({
        onMoreInfo: handleMoreInfo,
        onAssign: handleAssign,
        onDispatch: handleDispatch,
      }),
    [handleMoreInfo, handleAssign, handleDispatch],
  );

  const filters: AlertFilter = {
    tab: activeTab,
    search: searchQuery,
    alertType: alertTypeFilter,
  };

  const filteredAlerts = applyAllFilters(mockLiveReportData, filters);
  const tabCounts = getTabCounts(mockLiveReportData);

  return (
    <div className="flex flex-col h-full bg-[#171717] text-white p-6">
      {/* Header with Title and Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-white">Live Report</h1>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            defaultValue="all"
            onValueChange={(v: string) => setActiveTab(v as TabType)}
          >
            <TabsList>
              <TabsTrigger
                value="all"
                style={{
                  color: "#fff",
                  fontSize: "1rem",
                  padding: "0.5rem 1.5rem",
                  borderRadius: 4,
                  transition: "background 0.2s",
                  cursor: "pointer",
                }}
                className="tab-trigger"
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.background = "#333333")
                }
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                All
                <span
                  style={{
                    marginLeft: "0.5rem",
                    padding: "0.125rem 0.5rem",
                    background: "#707070",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                  }}
                >
                  {tabCounts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="unassigned"
                style={{
                  color: "#fff",
                  fontSize: "1rem",
                  padding: "0.5rem 1.5rem",
                  borderRadius: 4,
                  transition: "background 0.2s",
                  cursor: "pointer",
                }}
                className="tab-trigger"
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.background = "#333333")
                }
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                Unassigned
                <span
                  style={{
                    marginLeft: "0.5rem",
                    padding: "0.125rem 0.5rem",
                    background: "#707070",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                  }}
                >
                  {tabCounts.unassigned}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="waitlisted"
                style={{
                  color: "#fff",
                  fontSize: "1rem",
                  padding: "0.5rem 1.5rem",
                  borderRadius: 4,
                  transition: "background 0.2s",
                  cursor: "pointer",
                }}
                className="tab-trigger"
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.background = "#333333")
                }
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                Waitlisted
                <span
                  style={{
                    marginLeft: "0.5rem",
                    padding: "0.125rem 0.5rem",
                    background: "#707070",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                  }}
                >
                  {tabCounts.waitlisted}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="dispatched"
                style={{
                  color: "#fff",
                  fontSize: "1rem",
                  padding: "0.5rem 1.5rem",
                  borderRadius: 4,
                  transition: "background 0.2s",
                  cursor: "pointer",
                }}
                className="tab-trigger"
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.background = "#333333")
                }
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                Dispatched
                <span
                  style={{
                    marginLeft: "0.5rem",
                    padding: "0.125rem 0.5rem",
                    background: "#707070",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                  }}
                >
                  {tabCounts.dispatched}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search and Controls */}
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="flex items-center gap-3">
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
              className={`text-[#a1a1a1] hover:text-white hover:bg-[#262626] transition-all duration-200 ${searchVisible ? "bg-[#262626] text-white" : ""}`}
              onClick={() => {
                setSearchVisible(!searchVisible);
                if (searchVisible) {
                  setSearchQuery("");
                }
              }}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>

          {/* Sort Button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-[#a1a1a1] rounded-[5px] hover:text-white hover:bg-[#262626]"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>

          {/* Alert Type Filter */}
          <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
            <SelectTrigger className="w-48 bg-[#262626] border-[#404040] text-white">
              <SelectValue>Alert Type: {alertTypeFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#262626] border-[#404040] text-white">
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="USER-INITIATED">User Initiated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1">
        <DataTable
          columns={columns}
          data={filteredAlerts}
          onRowClick={(alert) => handleMoreInfo(alert)}
        />
      </div>

      {/* Alert Info Dialog */}
      <AlertInfoDialog
        alert={selectedAlert}
        open={alertInfoOpen}
        onOpenChange={setAlertInfoOpen}
      />
    </div>
  );
}
