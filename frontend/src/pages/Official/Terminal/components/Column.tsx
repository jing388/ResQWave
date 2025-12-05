/* eslint-disable react-refresh/only-export-components */
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Edit } from "lucide-react";
import type { Terminal, TerminalColumnsOptions } from "../types";

export const createColumns = (
  opts: TerminalColumnsOptions,
): ColumnDef<Terminal>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="text-[#a1a1a1]">{row.getValue("id")}</div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-black hover:text-gray-700 hover:bg-transparent focus:bg-transparent active:bg-transparent"
        >
          Name
          <svg
            className="ml-2 h-3 w-3"
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
      );
    },
    cell: ({ row }) => (
      <div className="text-white font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusColor =
        status === "Online" ? "text-green-400" : "text-red-400";
      return <div className={`${statusColor} font-medium`}>{status}</div>;
    },
  },
  {
    accessorKey: "availability",
    header: "Availability",
    cell: ({ row }) => {
      const availability = row.getValue("availability") as string;
      const availabilityColor =
        availability === "Available" ? "text-blue-400" : "text-yellow-400";
      return (
        <div className={`${availabilityColor} font-medium`}>{availability}</div>
      );
    },
  },
  {
    accessorKey: "dateCreated",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-black hover:text-gray-700 hover:bg-transparent focus:bg-transparent active:bg-transparent"
        >
          Created At
          <svg
            className="ml-2 h-3 w-3"
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
      );
    },
    cell: ({ row }) => (
      <div className="text-[#a1a1a1]">{row.getValue("dateCreated")}</div>
    ),
    sortingFn: (rowA, rowB, columnId) => {
      // Parse the formatted date strings back to Date objects for comparison
      try {
        const dateA = new Date(rowA.getValue(columnId));
        const dateB = new Date(rowB.getValue(columnId));

        // Handle invalid dates
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;

        // Sort by date ascending (oldest to newest)
        return dateA.getTime() - dateB.getTime();
      } catch (error) {
        console.error("Error sorting dates:", error);
        // Fallback to string comparison
        const a = String(rowA.getValue(columnId));
        const b = String(rowB.getValue(columnId));
        return a.localeCompare(b);
      }
    },
    sortDescFirst: false,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      return (
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
            className="bg-[#171717] border border-[#2a2a2a] text-white hover:text-white w-50 h-26 p-3 rounded-[5px] shadow-lg flex flex-col space-y-1"
          >
            {opts.onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  opts.onEdit!(row.original);
                }}
                className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
              >
                <Edit className="mr-2 h-4 w-4 text-white" />
                <span className="text-sm">Edit</span>
              </DropdownMenuItem>
            )}
            {opts.onArchive && (
              <>
                <DropdownMenuSeparator className="bg-[#404040]" />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    opts.onArchive!(row.original);
                  }}
                  className="hover:bg-[#404040] focus:bg-[#FF00001A] text-[#FF0000] rounded-[5px] cursor-pointer hover:text-[#FF0000] focus:text-[#FF0000] text-sm"
                >
                  <Archive className="mr-2 h-4 w-4 text-[#FF0000]" />
                  <span>Archive</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export { type Terminal };
