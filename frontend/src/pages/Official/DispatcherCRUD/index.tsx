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
import { createColumns, type Dispatcher } from "./components/Column";
import { CreateDispatcherSheet } from "./components/CreateDispatcherSheet";
import { DataTable } from "./components/DataTable";
import DispatcherAlerts, {
  type DispatcherAlertsHandle,
} from "./components/DispatcherAlerts";
import { DispatcherInfoSheet } from "./components/DispatcherInfoSheet";
import { useDispatchers } from "./hooks/useDispatchers";
import type { DispatcherDetails, DispatcherFormData } from "./types";

// Create archived columns for the archived tab
const makeArchivedColumns = (
  onMoreInfo: (d: Dispatcher) => void,
  onRestore?: (d: Dispatcher) => void,
  onDeletePermanent?: (d: Dispatcher) => void,
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
        cell: ({ row }: { row: { original: Dispatcher } }) => (
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

export function Dispatchers() {
  // Alerts ref
  const alertsRef = useRef<DispatcherAlertsHandle>(null);

  // Use the custom hook for dispatcher data
  const {
    activeDispatchers,
    archivedDispatchers,
    infoById,
    loading,
    archiveDispatcherById,
    restoreDispatcherById,
    createNewDispatcher,
    updateDispatcherById,
    deleteDispatcherPermanentlyById,
    refreshData,
    fetchDispatcherDetails,
  } = useDispatchers();

  // Local UI state
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedInfoData, setSelectedInfoData] = useState<
    DispatcherDetails | undefined
  >(undefined);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDispatcher, setEditingDispatcher] = useState<Dispatcher | null>(
    null,
  );
  const [editData, setEditData] = useState<DispatcherDetails | undefined>(
    undefined,
  );
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const handleMoreInfo = useCallback(
    async (dispatcher: Dispatcher) => {
      // Always fetch fresh data from API to get the photo
      try {
        const fetchedDetails = await fetchDispatcherDetails(dispatcher.id);
        if (fetchedDetails) {
          setSelectedInfoData(fetchedDetails);
        } else {
          setSelectedInfoData({
            id: dispatcher.id,
            name: dispatcher.name,
            contactNumber: dispatcher.contactNumber,
            email: dispatcher.email,
            createdAt: dispatcher.createdAt,
          });
        }
      } catch (error) {
        console.error("Error fetching dispatcher details:", error);
        setSelectedInfoData({
          id: dispatcher.id,
          name: dispatcher.name,
          contactNumber: dispatcher.contactNumber,
          email: dispatcher.email,
          createdAt: dispatcher.createdAt,
        });
      }

      setInfoOpen(true);
    },
    [fetchDispatcherDetails],
  );

  const handleArchive = useCallback(
    async (dispatcher: Dispatcher) => {
      try {
        // Call the backend API to archive the dispatcher
        await archiveDispatcherById(dispatcher.id);

        // Switch to archive tab to show the archived dispatcher
        setActiveTab("archived");

        // Show success alert
        alertsRef.current?.showArchiveSuccess(dispatcher.name);
      } catch (error) {
        console.error("Failed to archive dispatcher:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to archive dispatcher";
        alertsRef.current?.showError(errorMessage);
      }
    },
    [archiveDispatcherById],
  );

  const handleRestore = useCallback(
    async (dispatcher: Dispatcher) => {
      try {
        // Call the backend API to restore the dispatcher
        await restoreDispatcherById(dispatcher.id);

        // Show success alert
        alertsRef.current?.showRestoreSuccess(dispatcher.name);

        // Switch to active tab to show the restored dispatcher
        setActiveTab("active");
      } catch (error) {
        console.error("Failed to restore dispatcher:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to restore dispatcher";
        alertsRef.current?.showError(errorMessage);
      }
    },
    [restoreDispatcherById],
  );

  const handleDeletePermanent = useCallback(
    (dispatcher: Dispatcher) => {
      // Show confirmation dialog using the alert component
      alertsRef.current?.showDeleteConfirmation(
        dispatcher.id,
        dispatcher.name,
        async () => {
          try {
            // Call the backend API to permanently delete the dispatcher
            await deleteDispatcherPermanentlyById(dispatcher.id);

            // Show success alert
            alertsRef.current?.showDeleteSuccess(dispatcher.name);
          } catch (error) {
            console.error("Failed to permanently delete dispatcher:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to permanently delete dispatcher";
            alertsRef.current?.showError(errorMessage);
          }
        },
      );
    },
    [deleteDispatcherPermanentlyById],
  );

  const handleEdit = useCallback(
    (dispatcher: Dispatcher) => {
      setEditingDispatcher(dispatcher);

      // Get the detailed info for this dispatcher, or create default data
      const detailed = infoById[dispatcher.id] || {
        id: dispatcher.id,
        name: dispatcher.name,
        contactNumber: dispatcher.contactNumber,
        email: dispatcher.email,
        createdAt: dispatcher.createdAt,
      };

      setEditData(detailed);
      setServerErrors({}); // Clear server errors when editing
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

  // Filter function for search
  const filterDispatchers = (dispatchers: Dispatcher[]) => {
    if (!searchQuery.trim()) return dispatchers;

    return dispatchers.filter(
      (dispatcher) =>
        dispatcher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispatcher.contactNumber.includes(searchQuery) ||
        dispatcher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispatcher.id.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const filteredActiveDispatchers = filterDispatchers(activeDispatchers);
  const filteredArchivedDispatchers = filterDispatchers(archivedDispatchers);

  const tableData =
    activeTab === "active"
      ? filteredActiveDispatchers
      : filteredArchivedDispatchers;
  const tableColumns = activeTab === "active" ? activeColumns : archivedColumns;

  const handleSaveDispatcher = useCallback(
    async (
      dispatcherData: DispatcherDetails,
      formData?: DispatcherFormData,
    ): Promise<boolean> => {
      setSaving(true);
      setServerErrors({}); // Clear previous server errors

      try {
        if (editingDispatcher) {
          // Update existing dispatcher
          if (!formData) {
            throw new Error("Form data is required for updating dispatcher");
          }

          // Prepare update data
          const updateData: {
            name?: string;
            email?: string;
            contactNumber?: string;
            password?: string;
          } = {
            name: formData.name,
            email: formData.email,
            contactNumber: formData.contactNumber,
          };

          // Only include password if provided (for editing, password is optional)
          if (formData.password && formData.password.trim()) {
            updateData.password = formData.password;
          }

          await updateDispatcherById(editingDispatcher.id, updateData);

          // Clear edit state
          setEditingDispatcher(null);
          setEditData(undefined);

          // Show success alert
          alertsRef.current?.showUpdateSuccess(dispatcherData.name);
          return true; // Success
        } else {
          // Create new dispatcher using raw form data
          if (!formData) {
            throw new Error(
              "Form data is required for creating a new dispatcher",
            );
          }

          const result = await createNewDispatcher({
            name: formData.name,
            email: formData.email,
            contactNumber: formData.contactNumber,
            password: formData.password, // Pass the password if provided
          });

          // Show success alert with or without temporary password
          alertsRef.current?.showCreateSuccess(
            formData.name,
            result.temporaryPassword,
          );
          return true; // Success
        }
      } catch (err) {
        console.error("Error saving dispatcher:", err);

        // Parse specific backend validation errors
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        const newServerErrors: Record<string, string> = {};

        // Map backend error messages to specific form fields
        if (
          errorMessage.includes("Email Already Used") ||
          errorMessage.includes("Email already in use")
        ) {
          newServerErrors.email = "This email address is already registered";
        } else if (
          errorMessage.includes("Contact Number already used") ||
          errorMessage.includes("Contact number already in use")
        ) {
          newServerErrors.contactNumber =
            "This contact number is already registered";
        } else {
          // For other errors (network, server errors, etc.), show via alerts
          alertsRef.current?.showError(errorMessage);
        }

        // Set field-specific errors to display under input fields
        if (Object.keys(newServerErrors).length > 0) {
          setServerErrors(newServerErrors);
          return false; // Keep form open to show field errors
        }

        return false; // Failure
      } finally {
        setSaving(false);
      }
    },
    [editingDispatcher, createNewDispatcher, updateDispatcherById],
  );

  // Function to clear specific server errors when user starts typing
  const handleClearServerError = useCallback((fieldName: string) => {
    setServerErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="bg-[#171717] text-white p-4 sm:p-6 flex flex-col h-[calc(100vh-73px)] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-lg">Loading dispatchers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#171717] text-white p-4 sm:p-6 flex flex-col h-[calc(100vh-73px)]">
      <div className="w-full max-w-9xl mx-auto flex-1 flex flex-col min-h-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <h1 className="text-2xl font-semibold text-white">Dispatchers</h1>
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
                  {activeDispatchers.length}
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
                  {archivedDispatchers.length}
                </span>
              </button>
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
                placeholder="Search dispatchers..."
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
              variant="ghost"
              size="icon"
              className="text-[#a1a1a1] hover:text-white hover:bg-[#262626]"
              onClick={refreshData}
              title="Refresh data"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8.002 8.002 0 0115.356 2M4.582 9H9M15 15v5h.582m0-5.582A8.001 8.001 0 0019.418 15M15 20.582V15a8.002 8.002 0 00-4.418-7.164"
                />
              </svg>
            </Button>
            <Button
              onClick={() => {
                setEditingDispatcher(null);
                setEditData(undefined);
                setServerErrors({}); // Clear server errors when creating new
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
              Create Dispatcher
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <DataTable
            columns={tableColumns}
            data={tableData}
            onRowClick={(row) => handleMoreInfo(row as Dispatcher)}
          />
        </div>
      </div>

      {/* Info Sheet */}
      <DispatcherInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        dispatcherData={selectedInfoData}
      />

      {/* Create Dispatcher Sheet */}
      <CreateDispatcherSheet
        open={drawerOpen}
        onOpenChange={(open: boolean) => {
          if (!saving) {
            // Prevent closing while saving
            setDrawerOpen(open);
            if (!open) {
              // Clear edit state and server errors when closing
              setEditingDispatcher(null);
              setEditData(undefined);
              setServerErrors({});
            }
          }
        }}
        editData={editData}
        isEditing={!!editingDispatcher}
        onSave={handleSaveDispatcher}
        saving={saving}
        serverErrors={serverErrors}
        onClearServerError={handleClearServerError}
      />

      {/* Dispatcher Alerts */}
      <DispatcherAlerts ref={alertsRef} />
    </div>
  );
}
