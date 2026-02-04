import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ArchiveRestore, Info, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { createColumns, type Terminal } from "./components/Column";
import { CreateTerminalSheet } from "./components/CreateTerminalModal";
import { DataTable } from "./components/DataTable";
import {
  TerminalFilters,
  type FilterState,
} from "./components/TerminalFilters";
import TerminalAlerts, {
  type TerminalAlertsHandle,
} from "./components/TerminalAlerts";
import { TerminalInfoSheet } from "./components/TerminalInfoSheet";
import { useTerminals } from "./hooks/useTerminals";
import type { TerminalDetails, TerminalFormData } from "./types";

// Create archived columns for the archived tab
const makeArchivedColumns = (
  onMoreInfo: (t: Terminal) => void,
  onRestore?: (t: Terminal) => void,
  onDeletePermanent?: (t: Terminal) => void,
) =>
  createColumns({
    onMoreInfo,
    onEdit: undefined, // No edit for archived items
    onArchive: undefined, // No archive for already archived items
  }).map((column) => {
    if (column.id === "actions") {
      return {
        id: "actions",
        enableHiding: false,
        cell: ({ row }: { row: { original: Terminal } }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-[#a1a1a1] hover:text-white hover:bg-[#262626]"
              >
                <span className="sr-only">Open menu</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zM12 13a1 1 0 110-2 1 1 0 010 2zM12 20a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="left"
              sideOffset={2}
              className="bg-[#171717] border border-[#2a2a2a] text-white hover:text-white w-50 h-35 p-3 rounded-[5px] shadow-lg flex flex-col space-y-1"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMoreInfo(row.original);
                }}
                className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
              >
                <Info className="mr-2 h-4 w-4 text-white" />
                <span className="text-sm">More Info</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore?.(row.original);
                }}
                className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
              >
                <ArchiveRestore className="mr-2 h-4 w-4 text-white" />
                <span className="text-sm">Restore</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#404040]" />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePermanent?.(row.original);
                }}
                className="hover:bg-[#404040] focus:bg-[#FF00001A] text-[#FF0000] rounded-[5px] cursor-pointer hover:text-[#FF0000] focus:text-[#FF0000] text-sm"
              >
                <Trash2 className="mr-2 h-4 w-4 text-[#FF0000]" />
                <span>Delete Permanently</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      };
    }
    return column;
  });

export function Terminals() {
  // Use the custom hook for terminal data
  const {
    activeTerminals,
    archivedTerminals,
    infoById,
    loading,
    error,
    archiveTerminalById,
    createNewTerminal,
    permanentDeleteTerminalById,
    refreshData,
    fetchTerminalDetails,
    unarchiveTerminalById,
    updateTerminalById,
  } = useTerminals();

  // Alert reference
  const alertsRef = useRef<TerminalAlertsHandle>(null);

  // Local UI state
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedInfoData, setSelectedInfoData] = useState<
    TerminalDetails | undefined
  >(undefined);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    availability: "all",
    dateRange: "all",
    customStartDate: "",
    customEndDate: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [editData, setEditData] = useState<TerminalDetails | undefined>(
    undefined,
  );

  const handleMoreInfo = useCallback(
    async (terminal: Terminal) => {
      // Always fetch fresh data from API to get the most current info
      try {
        const fetchedDetails = await fetchTerminalDetails(terminal.id);
        if (fetchedDetails) {
          setSelectedInfoData(fetchedDetails);
        } else {
          setSelectedInfoData({
            devEUI: "",
            id: terminal.id,
            name: terminal.name,
            status: terminal.status,
            availability: terminal.availability,
            dateCreated: terminal.dateCreated,
            dateUpdated: terminal.dateUpdated,
          });
        }
      } catch (error) {
        console.error("Error fetching terminal details:", error);
        setSelectedInfoData({
          devEUI: "",
          id: terminal.id,
          name: terminal.name,
          status: terminal.status,
          availability: terminal.availability,
          dateCreated: terminal.dateCreated,
          dateUpdated: terminal.dateUpdated,
        });
      }

      setInfoOpen(true);
    },
    [fetchTerminalDetails],
  );

  const handleArchive = useCallback(
    async (terminal: Terminal) => {
      try {
        // Call the backend API to archive the terminal
        await archiveTerminalById(terminal.id);

        // Switch to archive tab to show the archived terminal
        setActiveTab("archived");

        // Show success alert
        alertsRef.current?.showArchiveSuccess(terminal.name);
      } catch (error) {
        console.error("Failed to archive terminal:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to archive terminal";
        alertsRef.current?.showError(errorMessage);
      }
    },
    [archiveTerminalById],
  );

  const handleRestore = useCallback(
    async (terminal: Terminal) => {
      try {
        await unarchiveTerminalById(terminal.id);
        console.log(`Terminal ${terminal.name} restored successfully`);
        alertsRef.current?.showRestoreSuccess(terminal.name);
      } catch (error) {
        console.error("Failed to restore terminal:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to restore terminal";
        alertsRef.current?.showError(errorMessage);
      }
    },
    [unarchiveTerminalById],
  );

  const handleDeletePermanent = useCallback(
    (terminal: Terminal) => {
      // Show confirmation dialog using the alert component
      alertsRef.current?.showDeleteConfirmation(
        terminal.id,
        terminal.name,
        async () => {
          try {
            // Permanently delete the terminal (backend handles alert cleanup automatically)
            const result = await permanentDeleteTerminalById(terminal.id);

            // Construct success message with deletion counts
            if (result.deletedAlerts && result.deletedAlerts > 0) {
              console.log(
                `Terminal ${terminal.name} permanently deleted with ${result.deletedAlerts} related alerts`,
              );
            }

            alertsRef.current?.showDeleteSuccess(terminal.name);
          } catch (error) {
            console.error("Failed to permanently delete terminal:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to permanently delete terminal";
            alertsRef.current?.showError(errorMessage);
          }
        },
      );
    },
    [permanentDeleteTerminalById],
  );

  const handleEdit = useCallback(
    (terminal: Terminal) => {
      setEditingTerminal(terminal);

      // Get the detailed info for this terminal, or create default data
      const detailed = infoById[terminal.id] || {
        id: terminal.id,
        name: terminal.name,
        status: terminal.status,
        availability: terminal.availability,
        dateCreated: terminal.dateCreated,
        dateUpdated: terminal.dateUpdated,
      };

      setEditData(detailed);
      setDrawerOpen(true);
    },
    [infoById],
  );

  const activeColumns = useMemo(
    () =>
      createColumns({
        onMoreInfo: handleMoreInfo,
        onEdit: handleEdit,
        onArchive: handleArchive,
      }),
    [handleMoreInfo, handleEdit, handleArchive],
  );
  const archivedColumns = useMemo(
    () =>
      makeArchivedColumns(handleMoreInfo, handleRestore, handleDeletePermanent),
    [handleMoreInfo, handleRestore, handleDeletePermanent],
  );

  // Helper function to parse date strings
  const parseFormattedDate = (dateStr: string): Date | null => {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Helper function to get date range
  const getDateRange = (range: string): { start: Date; end: Date } | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (range) {
      case "today":
        return { start: today, end: now };
      case "last7days": {
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        return { start, end: now };
      }
      case "last30days": {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        return { start, end: now };
      }
      case "last3months": {
        const start = new Date(today);
        start.setMonth(start.getMonth() - 3);
        return { start, end: now };
      }
      default:
        return null;
    }
  };

  // Check if any filters are active
  const isFiltered = useMemo(
    () =>
      filters.status !== "all" ||
      filters.availability !== "all" ||
      filters.dateRange !== "all",
    [filters],
  );

  const handleClearFilters = () => {
    setFilters({
      status: "all",
      availability: "all",
      dateRange: "all",
      customStartDate: "",
      customEndDate: "",
    });
  };

  // Filter function for search and filters
  const filterTerminals = (terminals: Terminal[]) => {
    let result = terminals;

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.filter(
        (terminal) =>
          terminal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          terminal.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
          terminal.availability
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          terminal.id.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply status filter
    if (filters.status !== "all") {
      result = result.filter((terminal) => terminal.status === filters.status);
    }

    // Apply availability filter
    if (filters.availability !== "all") {
      result = result.filter(
        (terminal) => terminal.availability === filters.availability,
      );
    }

    // Apply date range filter
    if (filters.dateRange !== "all") {
      result = result.filter((terminal) => {
        const terminalDate = parseFormattedDate(terminal.dateCreated);
        if (!terminalDate) return false;

        if (filters.dateRange === "custom") {
          if (filters.customStartDate && filters.customEndDate) {
            const startDate = new Date(filters.customStartDate);
            const endDate = new Date(filters.customEndDate);
            endDate.setHours(23, 59, 59, 999);

            return terminalDate >= startDate && terminalDate <= endDate;
          }
          return true;
        } else {
          const range = getDateRange(filters.dateRange);
          if (range) {
            return terminalDate >= range.start && terminalDate <= range.end;
          }
          return true;
        }
      });
    }

    return result;
  };

  const filteredActiveTerminals = filterTerminals(activeTerminals);
  const filteredArchivedTerminals = filterTerminals(archivedTerminals);

  const tableData =
    activeTab === "active"
      ? filteredActiveTerminals
      : filteredArchivedTerminals;
  const tableColumns = activeTab === "active" ? activeColumns : archivedColumns;

  const [saving, setSaving] = useState(false);

  const handleSaveTerminal = useCallback(
    async (formData: TerminalFormData) => {
      setSaving(true);

      try {
        if (editingTerminal) {
          // Update existing terminal
          await updateTerminalById(editingTerminal.id, {
            name: formData.name,
          });

          // Clear edit state
          setEditingTerminal(null);
          setEditData(undefined);
          setDrawerOpen(false);

          alertsRef.current?.showUpdateSuccess(formData.name);
        } else {
          // Create new terminal
          await createNewTerminal(formData);

          setDrawerOpen(false);
          alertsRef.current?.showCreateSuccess(formData.name);
        }
      } catch (err) {
        console.error("Error saving terminal:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save terminal";
        alertsRef.current?.showError(errorMessage);
      } finally {
        setSaving(false);
      }
    },
    [editingTerminal, createNewTerminal, updateTerminalById],
  );

  // Show loading state
  if (loading) {
    return (
      <div className="bg-[#171717] text-white p-4 sm:p-6 flex flex-col h-[calc(100vh-73px)] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-lg">Loading terminals...</p>
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
            <h1 className="text-2xl font-semibold text-white">
              Terminal Management
            </h1>
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
                  {activeTerminals.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("archived")}
                className={`px-4 py-2 rounded-[5px] text-sm font-medium transition-colors ${
                  activeTab === "archived"
                    ? "bg-[#404040] text-white"
                    : "bg-transparent text-[#a1a1a1] hover:text-white"
                }`}
              >
                Archived
                <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">
                  {archivedTerminals.length}
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <TerminalFilters
              filters={filters}
              onFiltersChange={setFilters}
              isFiltered={isFiltered}
              onClearFilters={handleClearFilters}
            />
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                searchVisible ? "w-64 opacity-100" : "w-0 opacity-0"
              }`}
            >
              <Input
                type="text"
                placeholder="Search terminals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-[#262626] border-[#404040] text-white placeholder:text-[#a1a1a1] focus:border-[#4285f4] transition-all duration-300"
                autoFocus={searchVisible}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="bg-[#262626] text-white hover:text-white hover:bg-[#333333] border border-[#404040] transition-all duration-200"
              onClick={() => {
                setSearchVisible(!searchVisible);
                if (searchVisible) {
                  setSearchQuery("");
                }
              }}
            >
              <svg
                className="h-4 w-4"
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
              className="bg-[#262626] text-white hover:text-white hover:bg-[#333333] border border-[#404040]"
              onClick={refreshData}
              title="Refresh data"
            >
              <svg
                className="h-4 w-4"
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
            <div className="ml-2">
              <Button
                onClick={() => {
                  setEditingTerminal(null);
                  setEditData(undefined);
                  setDrawerOpen(true);
                }}
                className="bg-[#4285f4] hover:bg-[#3367d6] text-white px-4 py-2 rounded-[5px] flex items-center gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create New Terminal
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <DataTable
            columns={tableColumns}
            data={tableData}
            onRowClick={(row) => handleMoreInfo(row as Terminal)}
          />
        </div>
      </div>

      {/* Info Sheet */}
      <TerminalInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        terminalData={selectedInfoData}
      />

      {/* Create Terminal Sheet */}
      <CreateTerminalSheet
        open={drawerOpen}
        onOpenChange={(open: boolean) => {
          if (!saving) {
            // Prevent closing while saving
            setDrawerOpen(open);
            if (!open) {
              // Clear edit state when closing
              setEditingTerminal(null);
              setEditData(undefined);
            }
          }
        }}
        editData={editData}
        onSave={handleSaveTerminal}
        loading={saving}
      />

      {/* Terminal Alerts */}
      <TerminalAlerts ref={alertsRef} />
    </div>
  );
}
