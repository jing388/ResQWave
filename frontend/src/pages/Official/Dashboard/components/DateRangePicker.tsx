import { Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangePickerProps {
  onDateChange: (startDate: Date, endDate: Date) => void;
}

export function DateRangePicker({ onDateChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 29)),
    endDate: new Date(),
  });
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePresetRange = (start: Date, end: Date) => {
    setDateRange({ startDate: start, endDate: end });
    onDateChange(start, end);
    setShowCustomRange(false);
    setIsOpen(false);
  };

  const handleCustomRangeClick = () => {
    setShowCustomRange(true);
    setCustomStart(formatDateForInput(dateRange.startDate));
    setCustomEnd(formatDateForInput(dateRange.endDate));
  };

  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      
      if (start <= end) {
        setDateRange({ startDate: start, endDate: end });
        onDateChange(start, end);
        setShowCustomRange(false);
        setIsOpen(false);
      }
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustomRange(false);
  };

  const presetRanges = [
    {
      label: "Today",
      getRange: () => ({
        start: new Date(),
        end: new Date(),
      }),
    },
    {
      label: "Yesterday",
      getRange: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: yesterday };
      },
    },
    {
      label: "Last 7 Days",
      getRange: () => ({
        start: new Date(new Date().setDate(new Date().getDate() - 6)),
        end: new Date(),
      }),
    },
    {
      label: "Last 30 Days",
      getRange: () => ({
        start: new Date(new Date().setDate(new Date().getDate() - 29)),
        end: new Date(),
      }),
    },
    {
      label: "This Month",
      getRange: () => ({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      }),
    },
    {
      label: "Last Month",
      getRange: () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return {
          start: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          end: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
        };
      },
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded-[5px] transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span className="text-sm font-medium">
          {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-0.5 w-72 bg-[#2a2a2a] border border-[#404040] rounded-[5px] shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-white text-sm font-medium mb-3">Select Date Range</h3>
            
            {!showCustomRange ? (
              <div className="space-y-0">
                {presetRanges.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const range = preset.getRange();
                      handlePresetRange(range.start, range.end);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#333333] rounded transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={handleCustomRangeClick}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#333333] rounded transition-colors border-t border-[#404040] mt-2 pt-3"
                >
                  Custom Range
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-white text-xs mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 bg-[#333333] text-white text-sm rounded border border-[#404040] focus:outline-none focus:border-[#555555]"
                  />
                </div>
                <div>
                  <label className="text-white text-xs mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-[#333333] text-white text-sm rounded border border-[#404040] focus:outline-none focus:border-[#555555]"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCancelCustomRange}
                    className="flex-1 px-3 py-2 text-sm text-white bg-[#333333] hover:bg-[#404040] rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyCustomRange}
                    className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
