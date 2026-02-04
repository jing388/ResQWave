import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, Filter, Calendar } from "lucide-react";

export interface FilterState {
  alertType: string;
  occurredDateRange: string;
  occurredStartDate: string;
  occurredEndDate: string;
  accomplishedDateRange: string;
  accomplishedStartDate: string;
  accomplishedEndDate: string;
  dispatcher: string;
  barangay: string;
}

interface ReportFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  dispatchers: string[];
  barangays: string[];
  isFiltered: boolean;
  onClearFilters: () => void;
}

export function ReportFilters({
  filters,
  onFiltersChange,
  dispatchers,
  barangays,
  isFiltered,
  onClearFilters,
}: ReportFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-[#262626] border-[#404040] text-white hover:bg-[#333333] hover:text-white h-[38px]"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 bg-[#2a2a2a] border-[#404040] p-4"
          align="end"
        >
          <div className="flex flex-col gap-4">
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
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-[#404040]">
                  <SelectItem
                    value="all"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    All Types
                  </SelectItem>
                  <SelectItem
                    value="Critical"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    Critical
                  </SelectItem>
                  <SelectItem
                    value="User-Initiated"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    User-Initiated
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Time Occurred Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">
                Date Time Occurred
              </label>
              <Select
                value={filters.occurredDateRange}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    occurredDateRange: value,
                    occurredStartDate:
                      value !== "custom" ? "" : filters.occurredStartDate,
                    occurredEndDate:
                      value !== "custom" ? "" : filters.occurredEndDate,
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

            {/* Custom Date Range Inputs for Date Time Occurred */}
            {filters.occurredDateRange === "custom" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#a1a1a1]">Start Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.occurredStartDate}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          occurredStartDate: e.target.value,
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
                      value={filters.occurredEndDate}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          occurredEndDate: e.target.value,
                        })
                      }
                      className="w-full bg-[#262626] border-[#404040] text-white scheme-dark pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a1a1a1] pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            {/* Accomplished On Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">Accomplished On</label>
              <Select
                value={filters.accomplishedDateRange}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    accomplishedDateRange: value,
                    accomplishedStartDate:
                      value !== "custom" ? "" : filters.accomplishedStartDate,
                    accomplishedEndDate:
                      value !== "custom" ? "" : filters.accomplishedEndDate,
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

            {/* Custom Date Range Inputs for Accomplished On */}
            {filters.accomplishedDateRange === "custom" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#a1a1a1]">Start Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.accomplishedStartDate}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          accomplishedStartDate: e.target.value,
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
                      value={filters.accomplishedEndDate}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          accomplishedEndDate: e.target.value,
                        })
                      }
                      className="w-full bg-[#262626] border-[#404040] text-white scheme-dark pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a1a1a1] pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">Dispatcher</label>
              <Select
                value={filters.dispatcher}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, dispatcher: value })
                }
              >
                <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                  <SelectValue placeholder="All Dispatchers" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-[#404040] max-h-60">
                  <SelectItem
                    value="all"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    All Dispatchers
                  </SelectItem>
                  {dispatchers.map((dispatcher) => (
                    <SelectItem
                      key={dispatcher}
                      value={dispatcher}
                      className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                    >
                      {dispatcher}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">Terminal</label>
              <Select
                value={filters.barangay}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, barangay: value })
                }
              >
                <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                  <SelectValue placeholder="All Terminals" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-[#404040] max-h-60">
                  <SelectItem
                    value="all"
                    className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                  >
                    All Terminals
                  </SelectItem>
                  {barangays.map((barangay) => (
                    <SelectItem
                      key={barangay}
                      value={barangay}
                      className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                    >
                      {barangay}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
