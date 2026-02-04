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
  terminalStatus: string;
  dateRange: string;
  customStartDate: string;
  customEndDate: string;
}

interface NeighborhoodFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isFiltered: boolean;
  onClearFilters: () => void;
}

export function NeighborhoodFilters({
  filters,
  onFiltersChange,
  isFiltered,
  onClearFilters,
}: NeighborhoodFiltersProps) {
  return (
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
        align="end"
        className="w-80 bg-[#2a2a2a] border-[#404040] p-4"
      >
        <div className="flex flex-col gap-4">
          {/* Terminal Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#a1a1a1]">Terminal Status</label>
            <Select
              value={filters.terminalStatus}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, terminalStatus: value })
              }
            >
              <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-[#404040]">
                <SelectItem
                  value="all"
                  className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                >
                  All Statuses
                </SelectItem>
                <SelectItem
                  value="ONLINE"
                  className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                >
                  Online
                </SelectItem>
                <SelectItem
                  value="OFFLINE"
                  className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                >
                  Offline
                </SelectItem>
                <SelectItem
                  value="N/A"
                  className="text-white hover:bg-[#404040] hover:text-white focus:bg-[#404040] focus:text-white"
                >
                  N/A
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#a1a1a1]">Registered Date</label>
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
                    className="w-full bg-[#262626] border-[#404040] text-white scheme-dark [&::-webkit-calendar-picker-indicator]:opacity-0"
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
                    className="w-full bg-[#262626] border-[#404040] text-white scheme-dark [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a1a1a1] pointer-events-none" />
                </div>
              </div>
            </>
          )}

          {/* Clear All Filters Button */}
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="w-full bg-transparent border-[#404040] text-white hover:bg-[#333333] mt-2"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
