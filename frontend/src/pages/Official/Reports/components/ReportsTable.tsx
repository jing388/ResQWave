import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type CellContext,
  type ColumnDef,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { fetchDetailedReportData } from "../api/api";
import { exportOfficialReportToPdf, type OfficialReportData } from "../utils/reportExportUtils";
import "./ReportsTable.css";
import { RescueCompletionForm } from "./RescueCompletionForm";

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
}

interface ReportsTableProps {
  type: "completed" | "pending";
  data: CompletedReport[] | PendingReport[];
  onReportCreated?: () => void; // Callback when a report is successfully created
}

type ReportData = CompletedReport | PendingReport;

export function ReportsTable({ type, data, onReportCreated }: ReportsTableProps) {
  const isCompleted = type === "completed";
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<ReportData | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


  const handleCreateReport = (reportData: ReportData) => {
    setSelectedReportData(reportData);
    setIsFormOpen(true);
  };

  const handleGenerateReport = async (reportData: ReportData) => {
    setIsGeneratingPdf(true);
    try {
      console.log('Generating PDF for report:', reportData);
      
      // Fetch detailed report data from backend
      const detailedData = await fetchDetailedReportData(reportData.emergencyId);
      console.log('Received detailed data:', detailedData);
      
      // Transform data for PDF export
      const exportData: OfficialReportData = {
        title: `Official Rescue Operation Report - ${detailedData.emergencyId}`,
        summary: 'This document serves as the official report of the rescue operation conducted for the affected community. It records the key information, emergency context, and actions taken to ensure accountability, transparency, and reference for future disaster response efforts.',
        
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

      console.log('Transformed export data:', exportData);

      // Generate and open PDF
      await exportOfficialReportToPdf(exportData);
      console.log('PDF report generated successfully');
      
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Error generating PDF report: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Define columns based on table type
  const columns: ColumnDef<ReportData>[] = [
    {
      accessorKey: "emergencyId",
      header: "Emergency ID",
      cell: ({ row }) => (
        <div className="font-medium text-foreground">{row.getValue("emergencyId")}</div>
      ),
    },
    {
      accessorKey: "communityName",
      header: "Terminal Name",
      cell: ({ row }) => (
        <div className="text-foreground">{row.getValue("communityName")}</div>
      ),
    },
    {
      accessorKey: "alertType",
      header: "Alert Type",
      cell: ({ row }) => {
        const alertType = row.getValue("alertType") as string
        return (
          <Badge
            variant="outline"
            className={
              alertType === "CRITICAL" || alertType === "Critical"
                ? "bg-red-500/20 text-red-500 border-red-500 hover:bg-red-500/30 h-7"
                : (alertType === "USER-INITIATED" || alertType === "User-Initiated" || alertType === "User")
                ? "bg-yellow-500/20 text-yellow-500 border-yellow-500 hover:bg-yellow-500/30 h-7"
                : "bg-transparent text-white border-[#414141] h-7"
            }
          >
            {alertType}
          </Badge>
        )
      },
    },
    {
      accessorKey: "dispatcher",
      header: "Dispatcher",
      cell: ({ row }) => (
        <div className="text-foreground">{row.getValue("dispatcher")}</div>
      ),
    },
    {
      accessorKey: "dateTimeOccurred",
      header: "Date & Time Occurred",
      cell: ({ row }) => (
        <div className="text-foreground">{row.getValue("dateTimeOccurred")}</div>
      ),
    },
    ...(isCompleted ? [{
      accessorKey: "accomplishedOn",
      header: "Accomplished on",
      cell: ({ row }: CellContext<ReportData, unknown>) => (
        <div className="text-foreground">{(row.original as CompletedReport).accomplishedOn}</div>
      ),
    }] : []),
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <div className="text-foreground max-w-[200px] truncate" title={row.getValue("address")}>
          {row.getValue("address")}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        isCompleted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start" side="left" sideOffset={2}
              className="bg-[#171717] border border-[#2a2a2a] text-white hover:text-white w-48 p-1 rounded-[5px] shadow-lg"
            >
              <DropdownMenuItem className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white">
                View details
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
                onClick={() => handleGenerateReport(row.original)}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? 'Generating...' : 'Generate report'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 rounded-[5px] text-white font-medium"
            onClick={() => handleCreateReport(row.original)}
          >
            Create Report
          </Button>
        )
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
    state: {},
    initialState: {
      pagination: {
        pageSize: isCompleted ? 5 : 6, // Reduce page size for completed to account for extra column
      },
    },
  });

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden min-h-0 ${isCompleted ? 'max-h-full overflow-hidden' : ''}`}>
      <div className="bg-[#191818] rounded-[5px] border border-[#262626] flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0">
          <div className="w-full overflow-x-hidden">
            <table className="w-full caption-bottom text-sm overflow-hidden table-fixed min-w-[1100px]">
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
                  <TableRow key={headerGroup.id} className="bg-white border-b border-[#404040] hover:bg-white">
                    {headerGroup.headers.map((header, index) => {
                      const isFirst = index === 0
                      const isLast = index === headerGroup.headers.length - 1

                      return (
                        <TableHead
                          key={header.id}
                          className={`text-black font-medium px-2 py-2 ${isFirst ? 'rounded-tl-[5px]' : ''
                            } ${isLast ? 'rounded-tr-[5px]' : ''
                            }`}
                        >
                          {header.isPlaceholder ? null : (
                            typeof header.column.columnDef.header === 'function'
                              ? header.column.columnDef.header(header.getContext())
                              : header.column.columnDef.header
                          )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
            </table>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 reports-table-scrollable">
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
                        {typeof cell.column.columnDef.cell === 'function'
                          ? cell.column.columnDef.cell(cell.getContext())
                          : cell.getValue()
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-[#a1a1a1]">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className={`flex-shrink-0 flex items-center justify-between space-x-2 py-2 px-1 ${isCompleted ? 'py-1' : 'py-2'}`}>
        <div className="text-sm text-[#a1a1a1]">
          Showing {table.getFilteredRowModel().rows.length} report(s).
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-[#a1a1a1]">Rows per page:</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px] bg-[#262626] border-[#404040] text-white">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top" className="bg-[#262626] border-[#404040] text-white">
                {isCompleted 
                  ? [5, 10, 15, 20].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))
                  : [6, 12, 18, 24].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              className="h-8 px-2 lg:px-3 bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Previous</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>

            {Array.from({ length: Math.min(3, table.getPageCount()) }, (_, i) => {
              const pageNumber = i + 1
              const isCurrentPage = table.getState().pagination.pageIndex + 1 === pageNumber
              return (
                <Button
                  key={pageNumber}
                  variant={isCurrentPage ? "default" : "outline"}
                  className={
                    isCurrentPage
                      ? "h-8 w-8 bg-[#4285f4] text-white hover:bg-[#3367d6]"
                      : "h-8 w-8 bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white"
                  }
                  onClick={() => table.setPageIndex(pageNumber - 1)}
                >
                  {pageNumber}
                </Button>
              )
            })}

            <Button
              variant="outline"
              className="h-8 px-2 lg:px-3 bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Next</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Rescue Completion Form */}
      <RescueCompletionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          // Refresh the reports data after successful completion
          console.log('RescueCompletionForm success - refreshing reports...');
          if (onReportCreated) {
            onReportCreated();
          }
        }}
        emergencyData={selectedReportData ? {
          emergencyId: selectedReportData.emergencyId,
          communityName: selectedReportData.communityName,
          alertType: selectedReportData.alertType,
          dispatcher: selectedReportData.dispatcher,
          dateTimeOccurred: selectedReportData.dateTimeOccurred,
          address: selectedReportData.address,
        } : undefined}
      />
    </div>
  );
}