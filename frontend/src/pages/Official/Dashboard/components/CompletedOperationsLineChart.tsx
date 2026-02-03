import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { useSocket } from "@/contexts/SocketContext";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { fetchCompletedOperationsStats } from "../api/adminDashboard";

const chartConfig = {
  userInitiated: {
    label: "User-initiated",
    color: "#FFA500",
  },
  critical: {
    label: "Critical",
    color: "#DC2626",
  },
} satisfies ChartConfig;

interface ChartData {
  date: string;
  userInitiated: number;
  critical: number;
}

interface CompletedOperationsLineChartProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export function CompletedOperationsLineChart({ dateRange }: CompletedOperationsLineChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Calculate the difference in days
        const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Use daily granularity if range is 31 days or less, otherwise monthly
        const granularity = daysDiff <= 31 ? "daily" : "monthly";
        
        console.log('[LineChart] Fetching data:', {
          granularity,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        });
        
        const response = await fetchCompletedOperationsStats(
          granularity,
          dateRange.startDate,
          dateRange.endDate
        );
        
        console.log('[LineChart] Received data:', response);
        
        // Helper function to parse date strings
        const parseChartDate = (dateStr: string) => {
          let parsed = new Date(dateStr);
          
          // If parsing fails (like "Jan 5-11"), extract the first date
          if (isNaN(parsed.getTime())) {
            const match = dateStr.match(/(\w+)\s+(\d+)/);
            if (match) {
              const monthName = match[1];
              const day = parseInt(match[2]);
              
              const startYear = dateRange.startDate.getFullYear();
              const endYear = dateRange.endDate.getFullYear();
              const startMonth = dateRange.startDate.getMonth();
              
              // Get month number
              const testDate = new Date(`${monthName} 1, 2000`);
              const monthNum = testDate.getMonth();
              
              // If spanning years, use month to determine year
              if (startYear !== endYear) {
                if (monthNum >= startMonth) {
                  parsed = new Date(`${monthName} ${day}, ${startYear}`);
                } else {
                  parsed = new Date(`${monthName} ${day}, ${endYear}`);
                }
              } else {
                parsed = new Date(`${monthName} ${day}, ${startYear}`);
              }
            }
          }
          
          return parsed.getTime();
        };
        
        // Map data with parsed timestamps and sort by timestamp
        const chartData = Object.entries(response.stats)
          .map(([date, values]) => ({
            date,
            userInitiated: values.userInitiated,
            critical: values.critical,
            timestamp: parseChartDate(date),
          }))
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(({ date, userInitiated, critical }) => ({
            date,
            userInitiated,
            critical,
          }));
        
        console.log('[LineChart] Sorted data:', chartData);
        setChartData(chartData);
      } catch (error) {
        console.error("Error fetching alert stats:", error);
      }
    };

    loadData();
  }, [dateRange, refreshTrigger]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePostRescueCreated = () => {
      console.log('[LineChart] Post-rescue form created, refreshing chart...');
      // Trigger a reload by incrementing the refresh trigger
      setRefreshTrigger(prev => prev + 1);
    };

    socket.on('postRescue:created', handlePostRescueCreated);

    return () => {
      socket.off('postRescue:created', handlePostRescueCreated);
    };
  }, [socket, isConnected]);

  return (
    <div className="h-full w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <LineChart data={chartData}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "#888" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "#888" }}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Line
            dataKey="userInitiated"
            type="monotone"
            stroke="var(--color-userInitiated)"
            strokeWidth={2}
            dot={{
              fill: "var(--color-userInitiated)",
              strokeWidth: 2,
              r: 4,
            }}
          />
          <Line
            dataKey="critical"
            type="monotone"
            stroke="var(--color-critical)"
            strokeWidth={2}
            dot={{
              fill: "var(--color-critical)",
              strokeWidth: 2,
              r: 4,
            }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
