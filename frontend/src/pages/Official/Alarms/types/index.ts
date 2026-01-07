import type { ColumnDef } from "@tanstack/react-table";

export interface Alarm {
  id: string;
  terminalId: string;
  terminalName: string;
  alert: string;
  status: string;
  severity: string;
  createdAt: string;
  updatedAt: string;
  terminalAddress?: string;
}

export interface AlarmColumnsOptions {
  onMoreInfo: (alarm: Alarm) => void;
  onEdit?: (alarm: Alarm) => void;
  onArchive?: (alarm: Alarm) => void;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
}
