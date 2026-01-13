// Centralized types for Dispatchers feature

import type { ColumnDef } from "@tanstack/react-table";

// Table row model used by the listing table
export type Dispatcher = {
  id: string;
  name: string;
  contactNumber: string;
  email: string;
  createdAt: string;
};

export interface DispatcherColumnsOptions {
  onMoreInfo: (dispatcher: Dispatcher) => void;
  onEdit?: (dispatcher: Dispatcher) => void;
  onArchive?: (dispatcher: Dispatcher) => void;
}

// Props for the generic data table component
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
}

// Detailed dispatcher information used by drawer/info sheet
export interface DispatcherDetails {
  id: string;
  name: string;
  contactNumber: string;
  email: string;
  createdAt: string;
  createdBy?: string;
  photo?: string | null;
}

// Raw form data for API calls
export interface DispatcherFormData {
  name: string;
  email: string;
  contactNumber: string;
  photo?: File;
}

export interface DispatcherDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (
    dispatcherData: DispatcherDetails,
    formData?: DispatcherFormData,
  ) => void;
  editData?: DispatcherDetails; // Data to pre-fill when editing
  isEditing?: boolean; // Flag to indicate edit mode
  saving?: boolean; // Flag to indicate if save operation is in progress
}

export interface DispatcherInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispatcherData?: DispatcherDetails;
}
