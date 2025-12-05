// Types for Live Report feature

import type { ColumnDef } from "@tanstack/react-table";

export type AlertType = "CRITICAL" | "USER-INITIATED" | "ONLINE" | "OFFLINE";
export type AlertStatus = "WAITLISTED" | "UNASSIGNED" | "DISPATCHED";

export type LiveReportAlert = {
  id: string;
  emergencyId: string;
  communityGroup: string;
  alertType: AlertType;
  status: AlertStatus;
  lastSignalTime: string;
  address: string;
};

export interface LiveReportColumnsOptions {
  onMoreInfo: (alert: LiveReportAlert) => void;
  onDispatch?: (alert: LiveReportAlert) => void;
  onAssign?: (alert: LiveReportAlert) => void;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
}

export type TabType = "all" | "unassigned" | "waitlisted" | "dispatched";

export type AlertFilter = {
  tab: TabType;
  search: string;
  alertType: string;
};
