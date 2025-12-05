// Centralized types for Terminals feature

import type { ColumnDef } from "@tanstack/react-table";

// Table row model used by the listing table
export type Terminal = {
  id: string;
  name: string;
  status: "Online" | "Offline";
  availability: "Available" | "Occupied";
  dateCreated: string;
  dateUpdated: string;
};

export interface TerminalColumnsOptions {
  onMoreInfo: (terminal: Terminal) => void;
  onEdit?: (terminal: Terminal) => void;
  onArchive?: (terminal: Terminal) => void;
}

// Props for the generic data table component
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
}

// Detailed terminal information used by drawer/info sheet
export interface TerminalDetails {
  id: string;
  name: string;
  status: "Online" | "Offline";
  availability: "Available" | "Occupied";
  dateCreated: string;
  dateUpdated: string;
  archived?: boolean;
}

// Raw form data for API calls
export interface TerminalFormData {
  name: string;
  status: "Online" | "Offline";
  availability: "Available" | "Occupied";
}

export interface TerminalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (formData: TerminalFormData) => Promise<void>;
  editData?: TerminalDetails;
  loading?: boolean;
}
