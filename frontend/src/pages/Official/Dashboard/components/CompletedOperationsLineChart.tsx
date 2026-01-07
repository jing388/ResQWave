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
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Calculate the difference in days
        const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Use daily granularity if range is 31 days or less, otherwise monthly
        const granularity = daysDiff <= 31 ? "daily" : "monthly";
        
        const response = await fetchCompletedOperationsStats(
          granularity,
          dateRange.startDate,
          dateRange.endDate
        );
        
        // Filter data to only include dates within the selected range
        const filteredData = Object.entries(response.stats)
          .filter(([date]) => {
            const entryDate = new Date(date);
            const startOfDay = new Date(dateRange.startDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(dateRange.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            return entryDate >= startOfDay && entryDate <= endOfDay;
          })
          .map(([date, values]) => ({
            date,
            userInitiated: values.userInitiated,
            critical: values.critical,
          }));
        
        setChartData(filteredData);
      } catch (error) {
        console.error("Error fetching alert stats:", error);
      }
    };

    loadData();
  }, [dateRange]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePostRescueCreated = () => {
      console.log('[LineChart] Post-rescue form created, refreshing chart...');
      setChartData([]);
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
