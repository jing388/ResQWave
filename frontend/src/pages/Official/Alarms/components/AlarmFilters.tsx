import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Filter, X } from "lucide-react";

export interface FilterState {
  status: string;
  severity: string;
  alertType: string;
  dateRange: string;
  customStartDate: string;
  customEndDate: string;
}

interface AlarmFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  isFiltered: boolean;
}

export function AlarmFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  isFiltered,
}: AlarmFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Filter Button with Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-[#262626] border-[#404040] text-white hover:bg-[#333333] hover:text-white h-[38px]"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] bg-[#2a2a2a] border-[#404040] text-white"
          align="end"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#404040]">
              <h3 className="font-semibold text-sm">Filters</h3>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, status: value })
                }
              >
                <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-[#404040]">
                  <SelectItem
                    value="all"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    All
                  </SelectItem>
                  <SelectItem
                    value="Active"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Active
                  </SelectItem>
                  <SelectItem
                    value="Resolved"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Resolved
                  </SelectItem>
                  <SelectItem
                    value="Pending"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Pending
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">Severity</label>
              <Select
                value={filters.severity}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, severity: value })
                }
              >
                <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-[#404040]">
                  <SelectItem
                    value="all"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    All
                  </SelectItem>
                  <SelectItem
                    value="Critical"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Critical
                  </SelectItem>
                  <SelectItem
                    value="High"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    High
                  </SelectItem>
                  <SelectItem
                    value="Medium"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Medium
                  </SelectItem>
                  <SelectItem
                    value="Low"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Low
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alert Type Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">Alert Type</label>
              <Select
                value={filters.alertType}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, alertType: value })
                }
              >
                <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-[#404040]">
                  <SelectItem
                    value="all"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    All
                  </SelectItem>
                  <SelectItem
                    value="Emergency"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Emergency
                  </SelectItem>
                  <SelectItem
                    value="Warning"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Warning
                  </SelectItem>
                  <SelectItem
                    value="Info"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Info
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">Date Range</label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    dateRange: value,
                    customStartDate:
                      value !== "custom" ? "" : filters.customStartDate,
                    customEndDate:
                      value !== "custom" ? "" : filters.customEndDate,
                  })
                }
              >
                <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-[#404040]">
                  <SelectItem
                    value="all"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    All Time
                  </SelectItem>
                  <SelectItem
                    value="today"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Today
                  </SelectItem>
                  <SelectItem
                    value="last7days"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Last 7 Days
                  </SelectItem>
                  <SelectItem
                    value="last30days"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Last 30 Days
                  </SelectItem>
                  <SelectItem
                    value="last3months"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Last 3 Months
                  </SelectItem>
                  <SelectItem
                    value="custom"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Custom Range
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range Inputs */}
            {filters.dateRange === "custom" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#a1a1a1]">Start Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.customStartDate}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          customStartDate: e.target.value,
                        })
                      }
                      className="w-full bg-[#262626] border-[#404040] text-white scheme-dark pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a1a1a1] pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#a1a1a1]">End Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.customEndDate}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          customEndDate: e.target.value,
                        })
                      }
                      className="w-full bg-[#262626] border-[#404040] text-white scheme-dark pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a1a1a1] pointer-events-none" />
                  </div>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters Button */}
      {isFiltered && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="bg-[#262626] border-[#404040] text-white hover:bg-[#333333] hover:text-white h-[38px]"
        >
          <X className="h-4 w-4 mr-1" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
