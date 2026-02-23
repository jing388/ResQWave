import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Edit, Info } from "lucide-react";
import type { CommunityColumnsOptions, CommunityGroup } from "../types";

export const createColumns = (
  opts: CommunityColumnsOptions,
): ColumnDef<CommunityGroup>[] => [
  {
    accessorKey: "id",
    header: "Neighborhood ID",
    cell: ({ row }) => (
      <div className="text-white">{row.getValue("id")}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Terminal Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant={status === "ONLINE" ? "default" : "secondary"}
          className={
            status === "ONLINE"
              ? "bg-green-500/20 text-green-500 border-green-500 hover:bg-green-500/70 h-7"
              : "bg-[#171717] text-[#404040] border-[#404040] hover:bg-gray-500/70 h-7"
          }
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "focalPerson",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-black hover:text-gray-700 hover:bg-transparent focus:bg-transparent active:bg-transparent"
        >
          Focal Person
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
      <div className="text-white">{row.getValue("focalPerson")}</div>
    ),
  },
  {
    accessorKey: "contactNumber",
    header: "Contact Number",
    cell: ({ row }) => (
      <div className="text-[#a1a1a1]">{row.getValue("contactNumber")}</div>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => {
      const raw = row.getValue("address");
      let display = raw;
      if (typeof raw === "string" && raw.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && parsed.address) {
            display = parsed.address;
          }
        } catch {
          // fallback to raw
        }
      }
      return (
        <div className="text-[#a1a1a1] truncate max-w-[200px]">
          {String(display)}
        </div>
      );
    },
  },
  {
    accessorKey: "registeredAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-black hover:text-gray-700 hover:bg-transparent focus:bg-transparent active:bg-transparent"
        >
          Registered At
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
      <div className="text-[#a1a1a1]">{row.getValue("registeredAt")}</div>
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
              <span>More Info</span>
            </DropdownMenuItem>

            {/* Show Edit only if onEdit callback is provided (typically for archived groups) */}
            {opts.onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  opts.onEdit?.(row.original);
                }}
                className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
              >
                <Edit className="mr-2 h-4 w-4 text-white" />
                <span>Edit</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-[#404040]" />

            {/* Show Archive only if onArchive callback is provided (typically for active groups) */}
            {opts.onArchive && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  opts.onArchive?.(row.original);
                }}
                className="hover:bg-[#404040] focus:bg-[#FF00001A] text-[#FF0000] rounded-[5px] cursor-pointer hover:text-[#FF0000] focus:text-[#FF0000]"
              >
                <Archive className="mr-2 h-4 w-4 text-[#FF0000]" />
                <span>Archive</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// Re-export for backward compatibility if other modules imported the type from this file
export type { CommunityGroup } from "../types";
