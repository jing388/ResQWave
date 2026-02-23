import {
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { DataTableProps } from "../types";

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 8,
      },
    },
  });

  return (
    <div className="w-full">
      <div className="rounded-[5px] border border-[#2a2a2a] bg-[#171717] overflow-auto max-h-[calc(100vh-250px)]">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-[#2a2a2a] hover:bg-[#262626]"
              >
                {headerGroup.headers.map((header, index) => {
                  const isFirst = index === 0;
                  const isLast = index === headerGroup.headers.length - 1;

                  return (
                    <TableHead
                      key={header.id}
                      className={`text-black font-medium bg-white h-12 px-4 text-left align-middle sticky top-0 z-10 ${
                        isFirst ? "rounded-tl-[5px]" : ""
                      } ${isLast ? "rounded-tr-[5px]" : ""}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-[#2a2a2a] hover:bg-[#262626] cursor-pointer transition-colors"
                  onClick={() =>
                    onRowClick && onRowClick(row.original as TData)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
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
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-[#a1a1a1]">
          Showing {table.getFilteredRowModel().rows.length} community group(s).
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
    </div>
  );
}
