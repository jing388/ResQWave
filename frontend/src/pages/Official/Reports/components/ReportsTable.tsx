import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type CellContext,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Archive, ArchiveRestore, FileText, Info, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { fetchNeighborhoodDetailsTransformed } from "../../CommunityGroups/api/communityGroupApi";
import { CommunityGroupInfoSheet } from "../../CommunityGroups/components/CommunityGroupInfoSheet";
import type { CommunityGroupDetails } from "../../CommunityGroups/types";
import { fetchDetailedReportData, type DetailedReportData } from "../api/api";
import {
  exportOfficialReportToPdf,
  type OfficialReportData,
} from "../utils/reportExportUtils";
import { PostRescueFormInfoSheet } from "./PostRescueFormInfoSheet";
import "./ReportsTable.css";
import { RescueCompletionForm } from "./RescueCompletionForm";
import { RescueFormInfoSheet } from "./RescueFormInfoSheet";

interface CompletedReport {
  emergencyId: string;
  communityName: string;
  alertType: string;
  dispatcher: string;
  dateTimeOccurred: string;
  accomplishedOn: string;
  address: string;
}

interface PendingReport {
  emergencyId: string;
  communityName: string;
  alertType: string;
  dispatcher: string;
  dateTimeOccurred: string;
  address: string;
  terminalName?: string;
  coordinates?: string;
  neighborhoodId?: string;
  focalPersonName?: string;
}

interface ReportsTableProps {
  type: "completed" | "pending" | "archive";
  data: CompletedReport[] | PendingReport[];
  onReportCreated?: () => void; // Callback when a report is successfully created
  onArchive?: (reportId: string) => void; // Callback when a report is archived
  onRestore?: (reportId: string) => void; // Callback when a report is restored
  onDelete?: (reportId: string) => void; // Callback when a report is deleted
}

type ReportData = CompletedReport | PendingReport;

export function ReportsTable({
  type,
  data,
  onReportCreated,
  onArchive,
  onRestore,
  onDelete,
}: ReportsTableProps) {
  const { isAdmin } = useAuth();
  const isCompleted = type === "completed";
  const isArchive = type === "archive";
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReportData, setSelectedReportData] =
    useState<ReportData | null>(null);
  const [detailedReportData, setDetailedReportData] =
    useState<DetailedReportData | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Community info sheet state
  const [communityInfoOpen, setCommunityInfoOpen] = useState(false);
  const [communityData, setCommunityData] = useState<
    CommunityGroupDetails | undefined
  >(undefined);
  const [loadingCommunityData, setLoadingCommunityData] = useState(false);

  // Rescue form info sheet state
  const [rescueFormInfoOpen, setRescueFormInfoOpen] = useState(false);
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string | null>(null);

  // Post-rescue form info sheet state
  const [postRescueFormInfoOpen, setPostRescueFormInfoOpen] = useState(false);
  const [selectedPostRescueEmergencyId, setSelectedPostRescueEmergencyId] = useState<string | null>(null);

  const handleCreateReport = async (reportData: ReportData) => {
    setIsLoadingDetails(true);
    try {
      // Fetch detailed report data from backend
      const detailedData = await fetchDetailedReportData(
        reportData.emergencyId,
      );
      setDetailedReportData(detailedData);
      setSelectedReportData(reportData);
      setIsFormOpen(true);
    } catch (error) {
      console.error("Error fetching detailed report data:", error);
      // Fallback to basic data if detailed fetch fails
      setSelectedReportData(reportData);
      setDetailedReportData(null);
      setIsFormOpen(true);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleGenerateReport = async (reportData: ReportData) => {
    setIsGeneratingPdf(true);
    try {
      console.log("Generating PDF for report:", reportData);

      // Fetch detailed report data from backend
      const detailedData = await fetchDetailedReportData(
        reportData.emergencyId,
      );
      console.log("Received detailed data:", detailedData);

      // Transform data for PDF export
      const exportData: OfficialReportData = {
        title: `Official Rescue Operation Report - ${detailedData.emergencyId}`,
        summary:
          "This document serves as the official report of the rescue operation conducted for the affected community. It records the key information, emergency context, and actions taken to ensure accountability, transparency, and reference for future disaster response efforts.",

        // Community & Terminal Information
        neighborhoodId: detailedData.neighborhoodId,
        terminalName: detailedData.terminalName,
        focalPersonName: detailedData.focalPersonName,
        focalPersonAddress: detailedData.focalPersonAddress,
        focalPersonContactNumber: detailedData.focalPersonContactNumber,

        // Emergency Context
        emergencyId: detailedData.emergencyId,
        waterLevel: detailedData.waterLevel,
        urgencyOfEvacuation: detailedData.urgencyOfEvacuation,
        hazardPresent: detailedData.hazardPresent,
        accessibility: detailedData.accessibility,
        resourceNeeds: detailedData.resourceNeeds,
        otherInformation: detailedData.otherInformation,
        timeOfRescue: detailedData.timeOfRescue,
        alertType: detailedData.alertType,
        dateTimeOccurred: detailedData.dateTimeOccurred,

        // Dispatcher Information
        dispatcherName: detailedData.dispatcherName,

        // Rescue Completion Details
        rescueFormId: detailedData.rescueFormId,
        postRescueFormId: detailedData.postRescueFormId,
        noOfPersonnelDeployed: detailedData.noOfPersonnelDeployed,
        resourcesUsed: detailedData.resourcesUsed,
        actionTaken: detailedData.actionTaken,
        rescueCompletionTime: detailedData.rescueCompletionTime,
      };

      console.log("Transformed export data:", exportData);

      // Generate and open PDF
      await exportOfficialReportToPdf(exportData);
      console.log("PDF report generated successfully");
    } catch (error) {
      console.error("Error generating PDF report:", error);
      alert(
        "Error generating PDF report: " +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleViewRescueForm = (reportData: ReportData) => {
    setSelectedEmergencyId(reportData.emergencyId);
    setRescueFormInfoOpen(true);
  };

  const handleViewPostRescueForm = (reportData: ReportData) => {
    setSelectedPostRescueEmergencyId(reportData.emergencyId);
    setPostRescueFormInfoOpen(true);
  };

  const handleViewNeighborhoodInfo = async (reportData: ReportData) => {
    setLoadingCommunityData(true);
    try {
      // First, fetch detailed report data to get neighborhoodId
      const detailedData = await fetchDetailedReportData(
        reportData.emergencyId,
      );
      
      if (!detailedData?.neighborhoodId) {
        console.error("[ReportsTable] No neighborhood ID available for neighborhood info");
        alert("Unable to fetch neighborhood info: No neighborhood ID available");
        return;
      }

      // Use neighborhoodId to fetch neighborhood data
      const data = await fetchNeighborhoodDetailsTransformed(detailedData.neighborhoodId);
      
      if (data) {
        setCommunityData(data);
        setCommunityInfoOpen(true);
      } else {
        console.warn(
          "[ReportsTable] No community data found for neighborhood ID:",
          detailedData.neighborhoodId,
        );
        alert(`No neighborhood information found for ID: ${detailedData.neighborhoodId}`);
      }
    } catch (error) {
      console.error("[ReportsTable] Error fetching community data:", error);
      alert("Error fetching neighborhood information. Please try again.");
    } finally {
      setLoadingCommunityData(false);
    }
  };

  // Define columns based on table type
  const columns: ColumnDef<ReportData>[] = [
    {
      accessorKey: "emergencyId",
      header: "Emergency ID",
      cell: ({ row }) => (
        <div className="font-medium text-foreground truncate" title={row.getValue("emergencyId")}>
          {row.getValue("emergencyId")}
        </div>
      ),
    },
    {
      accessorKey: "communityName",
      header: "Terminal Name",
      cell: ({ row }) => (
        <div className="text-foreground truncate" title={row.getValue("communityName")}>{row.getValue("communityName")}</div>
      ),
    },
    {
      accessorKey: "alertType",
      header: "Alert Type",
      cell: ({ row }) => {
        const alertType = row.getValue("alertType") as string;
        return (
          <Badge
            variant="outline"
            className={
              alertType === "CRITICAL" || alertType === "Critical"
                ? "bg-red-500/20 text-red-500 border-red-500 hover:bg-red-500/30 h-7"
                : alertType === "USER-INITIATED" ||
                    alertType === "User-Initiated" ||
                    alertType === "User"
                  ? "bg-yellow-500/20 text-yellow-500 border-yellow-500 hover:bg-yellow-500/30 h-7"
                  : "bg-transparent text-white border-[#414141] h-7"
            }
          >
            {alertType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "dispatcher",
      header: "Dispatcher",
      cell: ({ row }) => (
        <div className="text-foreground truncate" title={row.getValue("dispatcher")}>{row.getValue("dispatcher")}</div>
      ),
    },
    {
      accessorKey: "dateTimeOccurred",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-black hover:text-white hover:bg-transparent focus:bg-transparent active:bg-transparent"
        >
          Date & Time Occurred
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-foreground truncate" title={row.getValue("dateTimeOccurred")}>
          {row.getValue("dateTimeOccurred")}
        </div>
      ),
      sortingFn: (rowA, rowB, columnId) => {
        try {
          // Parse format: "12/08/2025 | 02:30 PM"
          const valueA = String(rowA.getValue(columnId));
          const valueB = String(rowB.getValue(columnId));
          
          const dateA = new Date(valueA.replace(" | ", " "));
          const dateB = new Date(valueB.replace(" | ", " "));

          if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;

          return dateA.getTime() - dateB.getTime();
        } catch (error) {
          console.error("Error sorting dates:", error);
          const a = String(rowA.getValue(columnId));
          const b = String(rowB.getValue(columnId));
          return a.localeCompare(b);
        }
      },
      sortDescFirst: false,
    },
    ...(isCompleted
      ? [
          {
            accessorKey: "accomplishedOn",
            header: ({ column }: any) => (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="h-auto p-0 font-medium text-black hover:text-white hover:bg-transparent focus:bg-transparent active:bg-transparent"
              >
                Accomplished on
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </Button>
            ),
            cell: ({ row }: CellContext<ReportData, unknown>) => (
              <div className="text-foreground truncate" title={(row.original as CompletedReport).accomplishedOn}>
                {(row.original as CompletedReport).accomplishedOn}
              </div>
            ),
            sortingFn: (rowA, rowB, columnId) => {
              try {
                // Parse format: "12/08/2025 | 02:30 PM"
                const valueA = String(rowA.getValue(columnId));
                const valueB = String(rowB.getValue(columnId));
                
                const dateA = new Date(valueA.replace(" | ", " "));
                const dateB = new Date(valueB.replace(" | ", " "));

                if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
                if (isNaN(dateA.getTime())) return 1;
                if (isNaN(dateB.getTime())) return -1;

                return dateA.getTime() - dateB.getTime();
              } catch (error) {
                console.error("Error sorting dates:", error);
                const a = String(rowA.getValue(columnId));
                const b = String(rowB.getValue(columnId));
                return a.localeCompare(b);
              }
            },
            sortDescFirst: false,
          },
        ]
      : []),
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <div
          className="text-foreground truncate"
          title={row.getValue("address")}
        >
          {row.getValue("address")}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="left"
            sideOffset={2}
            className="bg-[#171717] border border-[#2a2a2a] text-white hover:text-white w-48 p-1 rounded-[5px] shadow-lg"
          >
            {isArchive ? (
              // Archive tab - Only available for admin
              <>
                <DropdownMenuItem 
                  className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    handleViewNeighborhoodInfo(row.original);
                  }}
                  disabled={loadingCommunityData}
                >
                  <Info className="mr-2 h-4 w-4 text-white" />
                  <span className="text-xs">{loadingCommunityData ? "Loading..." : "View Neighborhood Info"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                  onClick={() => handleViewRescueForm(row.original)}
                >
                  <Info className="mr-2 h-4 w-4 text-white" />
                  <span className="text-xs">View Rescue Form</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                  onClick={() => handleViewPostRescueForm(row.original)}
                >
                  <Info className="mr-2 h-4 w-4 text-white" />
                  <span className="text-xs">View Post-Rescue Form</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                  onClick={() => onRestore?.(row.original.emergencyId)}
                >
                  <ArchiveRestore className="mr-2 h-4 w-4 text-white" />
                  <span className="text-xs">Restore</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#404040]" />
                <DropdownMenuItem 
                  className="hover:bg-[#404040] focus:bg-[#FF00001A] text-[#FF0000] rounded-[5px] cursor-pointer hover:text-[#FF0000] focus:text-[#FF0000] text-xs"
                  onClick={() => onDelete?.(row.original.emergencyId)}
                >
                  <Trash2 className="mr-2 h-4 w-4 text-[#FF0000]" />
                  <span className="text-xs">Delete Permanently</span>
                </DropdownMenuItem>
              </>
            ) : isCompleted ? (
              // Completed tab - Different options for admin vs dispatcher
              <>
                {isAdmin() ? (
                  // Admin options for completed tab
                  <>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={() => handleGenerateReport(row.original)}
                      disabled={isGeneratingPdf}
                    >
                      <FileText className="mr-2 h-4 w-4 text-white" />
                      <span className="text-xs">{isGeneratingPdf ? "Generating..." : "Generate Report"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        handleViewNeighborhoodInfo(row.original);
                      }}
                      disabled={loadingCommunityData}
                    >
                      <Info className="mr-2 h-4 w-4 text-white" />
                      <span className="text-xs">{loadingCommunityData ? "Loading..." : "View Neighborhood Info"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={() => handleViewRescueForm(row.original)}
                    >
                      <Info className="mr-2 h-4 w-4 text-white" />
                      <span className="text-xs">View Rescue Form</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={() => handleViewPostRescueForm(row.original)}
                    >
                      <Info className="mr-2 h-4 w-4 text-white" />
                      <span className="text-xs">View Post-Rescue Form</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#404040]" />
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#FF00001A] text-[#FF0000] rounded-[5px] cursor-pointer hover:text-[#FF0000] focus:text-[#FF0000] text-xs"
                      onClick={() => onArchive?.(row.original.emergencyId)}
                    >
                      <Archive className="mr-2 h-4 w-4 text-[#FF0000]" />
                      <span>Archive</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  // Dispatcher options for completed tab
                  <>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        handleViewNeighborhoodInfo(row.original);
                      }}
                      disabled={loadingCommunityData}
                    >
                      <Info className="mr-2 h-4 w-4 text-white" />
                      <span className="text-xs">{loadingCommunityData ? "Loading..." : "View Neighborhood Info"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={() => handleViewRescueForm(row.original)}
                    >
                      <Info className="mr-2 h-4 w-4 text-white" />
                      <span className="text-xs">View Rescue Form</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={() => handleViewPostRescueForm(row.original)}
                    >
                      <Info className="mr-2 h-4 w-4 text-white" />
                      <span className="text-xs">View Post-Rescue Form</span>
                    </DropdownMenuItem>
                  </>
                )}
              </>
            ) : (
              // Pending tab - Different options for admin vs dispatcher  
              <>
                {isAdmin() ? (
                  // Admin options for pending tab
                  <>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={() => handleGenerateReport(row.original)}
                      disabled={isGeneratingPdf}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {isGeneratingPdf ? "Generating..." : "Generate Report"}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        handleViewNeighborhoodInfo(row.original);
                      }}
                      disabled={loadingCommunityData}
                    >
                      <Info className="h-4 w-4 mr-2" />
                      {loadingCommunityData ? "Loading..." : "View Neighborhood Info"}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={() => handleViewRescueForm(row.original)}
                    >
                      <Info className="h-4 w-4 mr-2" />
                      View Rescue Form
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={() => onArchive?.(row.original.emergencyId)}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </>
                ) : (
                  // Dispatcher options for pending tab
                  <>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={() => handleCreateReport(row.original)}
                      disabled={isLoadingDetails}
                    >
                      <Pencil className="mr-2 h-4 w-4 text-white" />
                      <span className="text-xs">Create Post Rescue Form</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        handleViewNeighborhoodInfo(row.original);
                      }}
                      disabled={loadingCommunityData}
                    >
                      <Info className="mr-2 h-4 w-4 text-white" />
                      <span className="text-xs">{loadingCommunityData ? "Loading..." : "View Neighborhood Info"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                      onClick={() => handleViewRescueForm(row.original)}
                    >
                      <Info className="mr-2 h-4 w-4 text-white" />
                      <span className="text-xs">View Rescue Form</span>
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  const table = useReactTable({
    data: data as ReportData[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 8,
      },
    },
  });

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className="bg-[#191818] rounded-[5px] border border-[#262626] flex flex-col h-full overflow-hidden">
        {/* Fixed Header */}
        <div className="shrink-0">
          <table className="w-full caption-bottom text-sm table-fixed min-w-[1100px]">
            <colgroup>
              <col className="col-emergency-id" />
              <col className="col-community-name" />
              <col className="col-alert-type" />
              <col className="col-dispatcher" />
              <col className="col-datetime" />
              {isCompleted && <col className="col-accomplished" />}
              <col className="col-address" />
              <col className="col-actions" />
            </colgroup>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-white border-b border-[#404040] hover:bg-white"
                >
                  {headerGroup.headers.map((header, index) => {
                    const isFirst = index === 0;
                    const isLast = index === headerGroup.headers.length - 1;

                    return (
                      <TableHead
                        key={header.id}
                        className={`text-black font-medium px-2 py-2 ${
                          isFirst ? "rounded-tl-[5px]" : ""
                        } ${isLast ? "rounded-tr-[5px]" : ""}`}
                      >
                        {header.isPlaceholder
                          ? null
                          : typeof header.column.columnDef.header ===
                              "function"
                            ? header.column.columnDef.header(
                                header.getContext(),
                              )
                            : header.column.columnDef.header}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
          </table>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 reports-table-scrollable">
          <table className="w-full caption-bottom text-sm table-fixed min-w-[1100px]">
            <colgroup>
              <col className="col-emergency-id" />
              <col className="col-community-name" />
              <col className="col-alert-type" />
              <col className="col-dispatcher" />
              <col className="col-datetime" />
              {isCompleted && <col className="col-accomplished" />}
              <col className="col-address" />
              <col className="col-actions" />
            </colgroup>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-[#262626] hover:bg-[#1f1f1f]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-3 py-2">
                        {typeof cell.column.columnDef.cell === "function"
                          ? cell.column.columnDef.cell(cell.getContext())
                          : cell.getValue()}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-[#a1a1a1]"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-[#a1a1a1]">
          Showing {table.getFilteredRowModel().rows.length} report(s).
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-[#a1a1a1]">Rows per page:</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px] bg-[#262626] border-[#404040] text-white">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent
                side="top"
                className="bg-[#262626] border-[#404040] text-white"
              >
                {[8, 16, 24, 32, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-1">
            {(() => {
              const totalPages = table.getPageCount();
              const currentPage = table.getState().pagination.pageIndex + 1;
              const pageButtons = [];

              if (totalPages <= 7) {
                // Show all pages if 7 or fewer
                for (let i = 1; i <= totalPages; i++) {
                  const isCurrentPage = currentPage === i;
                  pageButtons.push(
                    <Button
                      key={i}
                      variant={isCurrentPage ? "default" : "outline"}
                      className={
                        isCurrentPage
                          ? "h-8 w-8 bg-[#4285f4] text-white hover:bg-[#3367d6]"
                          : "h-8 w-8 bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white"
                      }
                      onClick={() => table.setPageIndex(i - 1)}
                    >
                      {i}
                    </Button>
                  );
                }
              } else {
                // Show smart pagination with ellipsis for more than 7 pages
                // Always show first page
                pageButtons.push(
                  <Button
                    key={1}
                    variant={currentPage === 1 ? "default" : "outline"}
                    className={
                      currentPage === 1
                        ? "h-8 w-8 bg-[#4285f4] text-white hover:bg-[#3367d6]"
                        : "h-8 w-8 bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white"
                    }
                    onClick={() => table.setPageIndex(0)}
                  >
                    1
                  </Button>
                );

                // Show ellipsis if current page is far from start
                if (currentPage > 3) {
                  pageButtons.push(
                    <span key="ellipsis-start" className="px-2 text-[#a1a1a1]">
                      ...
                    </span>
                  );
                }

                // Show pages around current page
                const startPage = Math.max(2, currentPage - 1);
                const endPage = Math.min(totalPages - 1, currentPage + 1);

                for (let i = startPage; i <= endPage; i++) {
                  const isCurrentPage = currentPage === i;
                  pageButtons.push(
                    <Button
                      key={i}
                      variant={isCurrentPage ? "default" : "outline"}
                      className={
                        isCurrentPage
                          ? "h-8 w-8 bg-[#4285f4] text-white hover:bg-[#3367d6]"
                          : "h-8 w-8 bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white"
                      }
                      onClick={() => table.setPageIndex(i - 1)}
                    >
                      {i}
                    </Button>
                  );
                }

                // Show ellipsis if current page is far from end
                if (currentPage < totalPages - 2) {
                  pageButtons.push(
                    <span key="ellipsis-end" className="px-2 text-[#a1a1a1]">
                      ...
                    </span>
                  );
                }

                // Always show last page
                pageButtons.push(
                  <Button
                    key={totalPages}
                    variant={currentPage === totalPages ? "default" : "outline"}
                    className={
                      currentPage === totalPages
                        ? "h-8 w-8 bg-[#4285f4] text-white hover:bg-[#3367d6]"
                        : "h-8 w-8 bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white"
                    }
                    onClick={() => table.setPageIndex(totalPages - 1)}
                  >
                    {totalPages}
                  </Button>
                );
              }

              return pageButtons;
            })()}
          </div>
          <Button
            variant="outline"
            className="h-8 px-2 lg:px-3 bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Next
            </span>
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Rescue Completion Form */}
      <RescueCompletionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          // Refresh the reports data after successful completion
          console.log("RescueCompletionForm success - refreshing reports...");
          if (onReportCreated) {
            onReportCreated();
          }
        }}
        emergencyData={
          selectedReportData
            ? {
                emergencyId: selectedReportData.emergencyId,
                communityName: selectedReportData.communityName,
                neighborhoodId: (selectedReportData as PendingReport).neighborhoodId || detailedReportData?.neighborhoodId,
                focalPersonName: (selectedReportData as PendingReport).focalPersonName || detailedReportData?.focalPersonName,
                alertType: selectedReportData.alertType,
                dispatcher: selectedReportData.dispatcher,
                dateTimeOccurred: selectedReportData.dateTimeOccurred,
                address: selectedReportData.address,
                terminalName: (selectedReportData as PendingReport).terminalName,
                coordinates: (selectedReportData as PendingReport).coordinates,
              }
            : undefined
        }
      />

      {/* Community Group Info Sheet */}
      <CommunityGroupInfoSheet
        open={communityInfoOpen}
        onOpenChange={setCommunityInfoOpen}
        communityData={communityData}
      />

      {/* Rescue Form Info Sheet */}
      <RescueFormInfoSheet
        open={rescueFormInfoOpen}
        onOpenChange={setRescueFormInfoOpen}
        emergencyId={selectedEmergencyId}
      />

      {/* Post-Rescue Form Info Sheet */}
      <PostRescueFormInfoSheet
        open={postRescueFormInfoOpen}
        onOpenChange={setPostRescueFormInfoOpen}
        emergencyId={selectedPostRescueEmergencyId}
      />
    </div>
  );
}
