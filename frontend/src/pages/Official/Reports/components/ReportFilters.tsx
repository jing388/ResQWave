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
import { useState } from "react";

export interface FilterState {
  alertType: string;
  dateRange: string;
  dispatcher: string;
  barangay: string;
  customStartDate?: Date;
  customEndDate?: Date;
}

interface ReportFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  dispatchers: string[];
  barangays: string[];
}

export function ReportFilters({
  filters,
  onFiltersChange,
  dispatchers,
  barangays,
}: ReportFiltersProps) {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string | Date | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = 
    filters.alertType !== "all" ||
    filters.dateRange !== "all" ||
    filters.dispatcher !== "all" ||
    filters.barangay !== "all";

  const clearAllFilters = () => {
    onFiltersChange({
      alertType: "all",
      dateRange: "all",
      dispatcher: "all",
      barangay: "all",
      customStartDate: undefined,
      customEndDate: undefined,
    });
  };

  return (
    <div className="flex items-center gap-4">
      {/* Filter Popover */}
      <Popover open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen}>
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
        <PopoverContent className="w-80 bg-[#2a2a2a] border-[#404040] p-4" align="end">
          <div className="flex flex-col gap-4">
            {/* Alert Type Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">Alert Type</label>
              <Select
                value={filters.alertType}
                onValueChange={(value) => updateFilter("alertType", value)}
              >
                <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                  <SelectValue />
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

            {/* Date Range Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">Date Range</label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => {
                  updateFilter("dateRange", value);
                  if (value !== "custom") {
                    updateFilter("customStartDate", undefined);
                    updateFilter("customEndDate", undefined);
                  }
                }}
              >
                <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                  <SelectValue />
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
                      value={filters.customStartDate ? filters.customStartDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined;
                        updateFilter("customStartDate", date);
                      }}
                      className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333] [color-scheme:dark] pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#a1a1a1]">End Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.customEndDate ? filters.customEndDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined;
                        updateFilter("customEndDate", date);
                      }}
                      min={filters.customStartDate ? filters.customStartDate.toISOString().split('T')[0] : undefined}
                      className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333] [color-scheme:dark] pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#a1a1a1]">Dispatcher</label>
              <Select
                value={filters.dispatcher}
                onValueChange={(value) => updateFilter("dispatcher", value)}
              >
                <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                  <SelectValue />
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
                onValueChange={(value) => updateFilter("barangay", value)}
              >
                <SelectTrigger className="w-full bg-[#262626] border-[#404040] text-white hover:bg-[#333333]">
                  <SelectValue />
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
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          className="bg-[#262626] border-[#404040] text-white hover:bg-[#333333] hover:text-white h-[38px]"
        >
          <X className="h-4 w-4 mr-1" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
