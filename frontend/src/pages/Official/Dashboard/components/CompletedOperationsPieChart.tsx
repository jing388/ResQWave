import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { useSocket } from "@/contexts/SocketContext";
import { useEffect, useState } from "react";
import { Pie, PieChart } from "recharts";
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

interface PieChartData {
  name: string;
  value: number;
  fill: string;
  [key: string]: string | number;
}

interface CompletedOperationsPieChartProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export function CompletedOperationsPieChart({ dateRange }: CompletedOperationsPieChartProps) {
  const [chartData, setChartData] = useState<PieChartData[]>([
    { name: "userInitiated", value: 0, fill: "var(--color-userInitiated)" },
    { name: "critical", value: 0, fill: "var(--color-critical)" },
  ]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Calculate the difference in days
        const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Use daily granularity if range is 31 days or less, otherwise monthly
        const granularity = daysDiff <= 31 ? "daily" : "monthly";
        
        console.log('[PieChart] Fetching data:', {
          granularity,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        });
        
        const response = await fetchCompletedOperationsStats(
          granularity,
          dateRange.startDate,
          dateRange.endDate
        );
        
        console.log('[PieChart] Received data:', response);
        
        // Calculate totals from all time periods in response
        let totalUserInitiated = 0;
        let totalCritical = 0;
        
        Object.values(response.stats).forEach((values) => {
          totalUserInitiated += values.userInitiated;
          totalCritical += values.critical;
        });
        
        const data = [
          { name: "userInitiated", value: totalUserInitiated, fill: "var(--color-userInitiated)" },
          { name: "critical", value: totalCritical, fill: "var(--color-critical)" },
        ];
        
        setChartData(data);
      } catch (error) {
        console.error("Error fetching completed operations stats:", error);
      }
    };

    loadData();
  }, [dateRange, refreshTrigger]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePostRescueCreated = () => {
      console.log('[PieChart] Post-rescue form created, refreshing chart...');
      // Trigger a reload by incrementing the refresh trigger
      setRefreshTrigger(prev => prev + 1);
    };

    socket.on('postRescue:created', handlePostRescueCreated);

    return () => {
      socket.off('postRescue:created', handlePostRescueCreated);
    };
  }, [socket, isConnected]);

  return (
    <div className="h-full w-full flex items-center justify-center">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square w-full max-w-[400px]"
      >
        <PieChart width={400} height={400}>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie 
            data={chartData} 
            dataKey="value" 
            nameKey="name"
            label
            cx="50%"
            cy="50%"
            outerRadius={120}
            fill="#8884d8"
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}
