import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Info } from "lucide-react";
import type { Alarm, AlarmColumnsOptions } from "../types";

export const createColumns = (
  opts: AlarmColumnsOptions,
): ColumnDef<Alarm>[] => [
  {
    accessorKey: "terminalId",
    header: "Terminal ID",
    cell: ({ row }) => (
      <div className="text-[#a1a1a1]">{row.getValue("terminalId")}</div>
    ),
  },
  {
    accessorKey: "terminalName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-black hover:text-gray-700 hover:bg-transparent focus:bg-transparent active:bg-transparent"
        >
          Terminal Name
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
      <div className="text-white font-medium">
        {row.getValue("terminalName")}
      </div>
    ),
  },
  {
    accessorKey: "alert",
    header: "Alert",
    cell: ({ row }) => (
      <div className="text-[#a1a1a1]">{row.getValue("alert")}</div>
    ),
  },
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => {
      const severity = row.getValue("severity") as string;
      const isMajor = severity === "Major";
      
      return (
        <div
          className={`inline-flex items-center justify-center px-3 py-1 rounded-[5px] border text-xs font-medium uppercase ${
            isMajor
              ? "border-red-500 text-red-500 bg-red-500/10"
              : "border-yellow-500 text-yellow-500 bg-yellow-500/10"
          }`}
        >
          {severity}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
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
      <div className="text-[#a1a1a1]">{row.getValue("createdAt")}</div>
    ),
    sortingFn: (rowA, rowB, columnId) => {
      try {
        const dateA = new Date(rowA.getValue(columnId));
        const dateB = new Date(rowB.getValue(columnId));

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
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-black hover:text-gray-700 hover:bg-transparent focus:bg-transparent active:bg-transparent"
        >
          Updated At
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
      <div className="text-[#a1a1a1]">{row.getValue("updatedAt")}</div>
    ),
    sortingFn: (rowA, rowB, columnId) => {
      try {
        const dateA = new Date(rowA.getValue(columnId));
        const dateB = new Date(rowB.getValue(columnId));

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
              onClick={(e) => e.stopPropagation()}
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
            className="bg-[#171717] border border-[#2a2a2a] text-white hover:text-white w-50 p-3 rounded-[5px] shadow-lg flex flex-col space-y-1"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                opts.onMoreInfo(row.original);
              }}
              className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
            >
              <Info className="mr-2 h-4 w-4 text-white" />
              <span>View Details</span>
            </DropdownMenuItem>

            {opts.onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  opts.onEdit?.(row.original);
                }}
                className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
              >
                <Download className="mr-2 h-4 w-4 text-white" />
                <span>Locate Device</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export type { Alarm };

