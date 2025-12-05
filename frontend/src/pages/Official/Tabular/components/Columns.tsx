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
import { Info, MoreHorizontal, Send, UserCheck } from "lucide-react";
import type { LiveReportAlert, LiveReportColumnsOptions } from "../types";

export const createColumns = (
  opts: LiveReportColumnsOptions,
): ColumnDef<LiveReportAlert>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="text-[#a1a1a1] font-medium">{row.getValue("id")}</div>
    ),
  },
  {
    accessorKey: "emergencyId",
    header: "Emergency ID",
    cell: ({ row }) => (
      <div className="text-[#a1a1a1] font-medium">
        {row.getValue("emergencyId")}
      </div>
    ),
  },
  {
    accessorKey: "communityGroup",
    header: "Community Group",
    cell: ({ row }) => (
      <div className="text-white font-medium">
        {row.getValue("communityGroup")}
      </div>
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
            alertType === "CRITICAL"
              ? "bg-red-500/20 text-red-500 border-red-500 hover:bg-red-500/30 h-7"
              : alertType === "USER-INITIATED"
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant="outline"
          className="bg-transparent text-white border-[#414141] h-7"
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "lastSignalTime",
    header: "Last Signal Time",
    cell: ({ row }) => (
      <div className="text-white">{row.getValue("lastSignalTime")}</div>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => (
      <div className="text-white max-w-[200px] truncate">
        {row.getValue("address")}
      </div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 text-[#a1a1a1] hover:text-white hover:bg-[#262626]"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
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
              opts.onMoreInfo(row.original);
            }}
            className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
          >
            <Info className="mr-2 h-4 w-4 text-white" />
            <span className="text-sm">More Info</span>
          </DropdownMenuItem>

          {opts.onAssign && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                opts.onAssign?.(row.original);
              }}
              className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
            >
              <UserCheck className="mr-2 h-4 w-4 text-white" />
              <span className="text-sm">Assign</span>
            </DropdownMenuItem>
          )}

          {opts.onDispatch && (
            <>
              <DropdownMenuSeparator className="bg-[#404040]" />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  opts.onDispatch?.(row.original);
                }}
                className="hover:bg-[#404040] focus:bg-[#404040] rounded-[5px] cursor-pointer hover:text-white focus:text-white"
              >
                <Send className="mr-2 h-4 w-4 text-white" />
                <span className="text-sm">Dispatch</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export type { LiveReportAlert } from "../types";
