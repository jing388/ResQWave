import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArchiveRestore, Info, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  archiveNeighborhood,
  deleteNeighborhood,
  fetchNeighborhoodDetailsTransformed,
  getArchivedNeighborhoods,
  getNeighborhoods,
  transformNeighborhoodToCommunityGroup,
} from "./api/communityGroupApi";
import { createColumns, type CommunityGroup } from "./components/Column";
import CommunityGroupAlerts, {
  type CommunityGroupAlertsHandle,
} from "./components/CommunityGroupAlerts";
import { CommunityGroupApprovalSheet } from "./components/CommunityGroupApprovalSheet";
import { CommunityGroupInfoSheet } from "./components/CommunityGroupInfoSheet";
import { CommunityGroupDrawer } from "./components/CreateCommunityGroupSheet";
import { DataTable } from "./components/DataTable";
import {
  predefinedAwaitingGroupDetails,
  predefinedAwaitingGroups,
} from "./data/predefinedCommunityGroups";
import type { CommunityGroupDetails } from "./types";

const makeArchivedColumns = (
  onMoreInfo: (g: CommunityGroup) => void,
  onRestore?: (g: CommunityGroup) => void,
  onDeletePermanent?: (g: CommunityGroup) => void,
) => [
  ...createColumns({ onMoreInfo }).slice(0, -1),
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }: { row: { original: CommunityGroup } }) => (
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
  },
];

export function CommunityGroups() {
  const alertsRef = useRef<CommunityGroupAlertsHandle>(null);
  const [activeTab, setActiveTab] = useState<
    "active" | "archived" | "awaiting"
  >("active");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [terminalAssignmentOpen, setTerminalAssignmentOpen] = useState(false);
  const [selectedInfoData, setSelectedInfoData] = useState<
    CommunityGroupDetails | undefined
  >(undefined);
  const [selectedApprovalData, setSelectedApprovalData] = useState<
    CommunityGroupDetails | undefined
  >(undefined);
  const [pendingApprovalData, setPendingApprovalData] = useState<
    CommunityGroupDetails | undefined
  >(undefined);
  const [selectedTerminal, setSelectedTerminal] = useState<string>("");
  const [activeGroups, setActiveGroups] = useState<CommunityGroup[]>([]);
  const [archivedGroups, setArchivedGroups] = useState<CommunityGroup[]>([]);
  const [awaitingGroups, setAwaitingGroups] = useState<CommunityGroup[]>(
    predefinedAwaitingGroups,
  );
  const [infoById, setInfoById] = useState<
    Record<string, CommunityGroupDetails>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [awaitingInfoById, setAwaitingInfoById] = useState<
    Record<string, CommunityGroupDetails>
  >(predefinedAwaitingGroupDetails);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingGroup, setEditingGroup] = useState<CommunityGroup | null>(null);
  const [editData, setEditData] = useState<CommunityGroupDetails | undefined>(
    undefined,
  );

  // Available terminals for assignment
  const availableTerminals = [
    { id: "RSQW-001", name: "Terminal 001 - Barangay Hall" },
    { id: "RSQW-002", name: "Terminal 002 - Community Center" },
    { id: "RSQW-003", name: "Terminal 003 - School Building" },
    { id: "RSQW-004", name: "Terminal 004 - Health Center" },
    { id: "RSQW-005", name: "Terminal 005 - Church" },
  ];

  const handleMoreInfo = useCallback(
    (group: CommunityGroup) => {
      if (activeTab === "awaiting") {
        // For awaiting approval, show the approval sheet
        const detailed = awaitingInfoById[group.id];
        if (detailed) {
          setSelectedApprovalData(detailed);
          setApprovalOpen(true);
        }
        return;
      }

      // For active/archived, fetch full neighborhood + focal person details from backend
      (async () => {
        try {
          setLoading(true);
          setError(null);
          const details = await fetchNeighborhoodDetailsTransformed(group.id);
          setInfoById((prev) => ({ ...prev, [group.id]: details }));
          setSelectedInfoData(details);
          setInfoOpen(true);
        } catch (err) {
          console.error("Failed to load neighborhood details:", err);
          setError("Failed to load neighborhood details");
        } finally {
          setLoading(false);
        }
      })();
       
    },
    [infoById, awaitingInfoById, activeTab],
  );

  const handleArchive = useCallback(async (group: CommunityGroup) => {
    try {
      await archiveNeighborhood(group.id);
      // Refetch lists to sync frontend with backend
      const [activeData, archivedData] = await Promise.all([
        getNeighborhoods(),
        getArchivedNeighborhoods(),
      ]);
      setActiveGroups(
        activeData.map((neighborhood) =>
          transformNeighborhoodToCommunityGroup(neighborhood, false),
        ),
      );
      setArchivedGroups(
        archivedData.map((neighborhood) =>
          transformNeighborhoodToCommunityGroup(neighborhood, true),
        ),
      );

      // Show success alert
      alertsRef.current?.showArchiveSuccess(
        group.name || group.focalPerson || "Neighborhood Group",
      );
    } catch {
      alertsRef.current?.showError(
        "Failed to archive neighborhood. Please try again.",
      );
    }
  }, []);

  const handleRestore = useCallback((group: CommunityGroup) => {
    setArchivedGroups((prev) => prev.filter((g) => g.id !== group.id));
    setActiveGroups((prev) => [group, ...prev]);
  }, []);

  const handleDeletePermanent = useCallback((group: CommunityGroup) => {
    // Show confirmation dialog before deleting
    alertsRef.current?.showDeleteConfirmation(
      group.id,
      group.name || group.focalPerson || "Neighborhood Group",
      async () => {
        try {
          await deleteNeighborhood(group.id);
          // Refetch archived list to sync frontend with backend
          const archivedData = await getArchivedNeighborhoods();
          setArchivedGroups(
            archivedData.map((neighborhood) =>
              transformNeighborhoodToCommunityGroup(neighborhood, true),
            ),
          );
          setInfoById((prev) => {
            const newState = { ...prev };
            delete newState[group.id];
            return newState;
          });

          // Show success alert
          alertsRef.current?.showDeleteSuccess(
            group.name || group.focalPerson || "Neighborhood Group",
          );
        } catch {
          alertsRef.current?.showError(
            "Failed to delete neighborhood. Please try again.",
          );
        }
      },
    );
  }, []);

  const handleApprove = useCallback((communityData: CommunityGroupDetails) => {
    // Store the pending approval data and open terminal assignment dialog
    setPendingApprovalData(communityData);
    setSelectedTerminal("");
    setApprovalOpen(false); // Close the approval sheet
    setTerminalAssignmentOpen(true); // Open terminal assignment dialog
  }, []);

  const handleTerminalAssignment = useCallback(
    (terminalId: string) => {
      if (!pendingApprovalData) return;

      // Move from awaiting to active groups with assigned terminal
      const awaitingGroup = awaitingGroups.find(
        (g) => g.id === pendingApprovalData.communityId,
      );
      if (awaitingGroup) {
        // Generate new RSQW ID for approved group
        const newId = `RSQW-${String(Date.now()).slice(-3)}`;
        const approvedGroup: CommunityGroup = {
          ...awaitingGroup,
          id: newId,
          status: "OFFLINE",
        };

        // Add to active groups
        setActiveGroups((prev) => [approvedGroup, ...prev]);

        // Add detailed info with new ID and assigned terminal
        const updatedDetails = {
          ...pendingApprovalData,
          communityId: newId,
          terminalId: terminalId,
        };
        setInfoById((prev) => ({ ...prev, [newId]: updatedDetails }));

        // Remove from awaiting
        setAwaitingGroups((prev) =>
          prev.filter((g) => g.id !== awaitingGroup.id),
        );
        setAwaitingInfoById((prev) => {
          const newState = { ...prev };
          delete newState[awaitingGroup.id];
          return newState;
        });

        // Switch to active tab to show the newly approved group
        setActiveTab("active");
      }

      // Clean up and close dialog
      setPendingApprovalData(undefined);
      setSelectedTerminal("");
      setTerminalAssignmentOpen(false);
    },
    [pendingApprovalData, awaitingGroups],
  );

  const handleDiscard = useCallback(
    (communityData: CommunityGroupDetails) => {
      // Remove from awaiting groups
      const awaitingGroup = awaitingGroups.find(
        (g) => g.id === communityData.communityId,
      );
      if (awaitingGroup) {
        setAwaitingGroups((prev) =>
          prev.filter((g) => g.id !== awaitingGroup.id),
        );
        setAwaitingInfoById((prev) => {
          const newState = { ...prev };
          delete newState[awaitingGroup.id];
          return newState;
        });
      }
    },
    [awaitingGroups],
  );

  const handleEdit = useCallback(async (group: CommunityGroup) => {
    setEditingGroup(group);

    try {
      setLoading(true);
      // Fetch the detailed neighborhood data from backend
      const detailed = await fetchNeighborhoodDetailsTransformed(group.id);
      setEditData(detailed);
      setDrawerOpen(true);
    } catch (err) {
      console.error("Failed to load neighborhood details for editing:", err);
      alertsRef.current?.showError(
        "Failed to load neighborhood details for editing",
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
  const awaitingColumns = useMemo(
    () => createColumns({ onMoreInfo: handleMoreInfo }),
    [handleMoreInfo],
  );

  // Filter function for search
  const filterGroups = (groups: CommunityGroup[]) => {
    if (!searchQuery.trim()) return groups;

    return groups.filter(
      (group) =>
        group.focalPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.contactNumber.includes(searchQuery) ||
        group.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.id.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const filteredActiveGroups = filterGroups(activeGroups);
  const filteredArchivedGroups = filterGroups(archivedGroups);
  const filteredAwaitingGroups = filterGroups(awaitingGroups);

  const tableData =
    activeTab === "active"
      ? filteredActiveGroups
      : activeTab === "archived"
        ? filteredArchivedGroups
        : filteredAwaitingGroups;
  const tableColumns =
    activeTab === "active"
      ? activeColumns
      : activeTab === "archived"
        ? archivedColumns
        : awaitingColumns;

  // Fetch neighborhoods data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch active and archived neighborhoods in parallel
        const [activeData, archivedData] = await Promise.all([
          getNeighborhoods(),
          getArchivedNeighborhoods(),
        ]);

        // Transform backend data to frontend format
        const transformedActive = activeData.map((neighborhood) =>
          transformNeighborhoodToCommunityGroup(neighborhood, false),
        );
        const transformedArchived = archivedData.map((neighborhood) =>
          transformNeighborhoodToCommunityGroup(neighborhood, true),
        );

        setActiveGroups(transformedActive);
        setArchivedGroups(transformedArchived);
      } catch (err) {
        console.error("Failed to fetch neighborhoods:", err);
        setError("Failed to load neighborhoods");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-[#171717] text-white p-4 sm:p-6 flex flex-col h-[calc(100vh-73px)]">
      <div className="w-full max-w-9xl mx-auto flex-1 flex flex-col min-h-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <h1 className="text-2xl font-semibold text-white">
              Neighborhood Groups
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
                  {activeGroups.length}
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
                  {archivedGroups.length}
                </span>
              </button>
              {/*
              <button
                onClick={() => setActiveTab("awaiting")}
                className={`px-4 py-2 rounded-[5px] text-sm font-medium transition-colors ${
                  activeTab === "awaiting"
                    ? "bg-[#404040] text-white"
                    : "bg-transparent text-[#a1a1a1] hover:text-white"
                }`}
              >
                Awaiting Approval
                <span className="ml-2 px-2 py-0.5 bg-[#707070] rounded text-xs">{awaitingGroups.length}</span>
              </button>
              */}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                searchVisible ? "w-64 opacity-100" : "w-0 opacity-0"
              }`}
            >
              <Input
                type="text"
                placeholder="Search neighborhood groups..."
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
              <svg
                className="h-5 w-5"
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
              onClick={() => {
                setEditingGroup(null);
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
              Add New Neighborhood Group
            </Button>
            <CommunityGroupDrawer
              open={drawerOpen}
              onOpenChange={(open) => {
                setDrawerOpen(open);
                if (!open) {
                  // Clear edit state when closing
                  setEditingGroup(null);
                  setEditData(undefined);
                }
              }}
              editData={editData}
              isEditing={!!editingGroup}
              onSave={async (_infoData, saveInfo) => {
                try {
                  // Refresh the data from backend after create or update
                  const [activeData, archivedData] = await Promise.all([
                    getNeighborhoods(),
                    getArchivedNeighborhoods(),
                  ]);

                  const transformedActive = activeData.map((neighborhood) =>
                    transformNeighborhoodToCommunityGroup(neighborhood, false),
                  );
                  const transformedArchived = archivedData.map((neighborhood) =>
                    transformNeighborhoodToCommunityGroup(neighborhood, true),
                  );

                  setActiveGroups(transformedActive);
                  setArchivedGroups(transformedArchived);

                  // Clear edit state
                  setEditingGroup(null);
                  setEditData(undefined);

                  // Show the newly created/updated item in active tab
                  setActiveTab("active");

                  // Show appropriate success alert
                  if (saveInfo?.groupName) {
                    if (editingGroup) {
                      alertsRef.current?.showUpdateSuccess(saveInfo.groupName);
                    } else {
                      alertsRef.current?.showCreateSuccess(saveInfo.groupName);
                    }
                  }
                } catch (err) {
                  console.error("Failed to refresh data:", err);
                  alertsRef.current?.showError("Failed to refresh data");
                }
              }}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-gray-400">Loading neighborhoods...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-400 mb-2">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <DataTable
              columns={tableColumns}
              data={tableData}
              onRowClick={(row) => handleMoreInfo(row as CommunityGroup)}
            />
          )}
        </div>
      </div>

      {/* Info Sheet */}
      <CommunityGroupInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        communityData={selectedInfoData}
      />

      {/* Approval Sheet */}
      <CommunityGroupApprovalSheet
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        communityData={selectedApprovalData}
        onApprove={handleApprove}
        onDiscard={handleDiscard}
      />

      {/* Terminal Assignment Dialog */}
      <Dialog
        open={terminalAssignmentOpen}
        onOpenChange={setTerminalAssignmentOpen}
      >
        <DialogContent className="sm:max-w-[425px] bg-[#171717] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Assign Terminal</DialogTitle>
            <DialogDescription className="text-[#a1a1a1]">
              Please select a terminal to assign to this community group.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="terminal" className="text-right text-white">
                Terminal
              </label>
              <div className="col-span-3">
                <Select
                  value={selectedTerminal}
                  onValueChange={setSelectedTerminal}
                >
                  <SelectTrigger className="bg-[#262626] border-[#404040] text-white">
                    <SelectValue placeholder="Select a terminal" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-[#404040]">
                    {availableTerminals.map((terminal) => (
                      <SelectItem
                        key={terminal.id}
                        value={terminal.id}
                        className="text-white hover:bg-[#404040] focus:bg-[#404040]"
                      >
                        {terminal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTerminalAssignmentOpen(false);
                setPendingApprovalData(undefined);
                setSelectedTerminal("");
              }}
              className="bg-transparent border-[#404040] text-white hover:bg-[#262626]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (selectedTerminal) {
                  handleTerminalAssignment(selectedTerminal);
                }
              }}
              disabled={!selectedTerminal}
              className="bg-[#4285f4] hover:bg-[#3367d6] text-white disabled:opacity-50"
            >
              Assign Terminal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alerts */}
      <CommunityGroupAlerts ref={alertsRef} />
    </div>
  );
}
