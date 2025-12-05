import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { fetchAlertTypeChartData, type AlertTypeChartData } from "../api/api";

const chartConfig = {
  userInitiated: {
    label: "User-Initiated",
    color: "#FFA500",
  },
  critical: {
    label: "Critical",
    color: "#DC2626",
  },
} satisfies ChartConfig;

interface AlertTypeChartProps {
  timeRange: string;
}

export function AlertTypeChart({ timeRange }: AlertTypeChartProps) {
  const [chartData, setChartData] = useState<AlertTypeChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chart data when component mounts or timeRange changes
  useEffect(() => {
    const loadChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAlertTypeChartData(timeRange);
        setChartData(data);
      } catch (err: unknown) {
        console.error("Error fetching chart data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load chart data",
        );
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [timeRange]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-400">Error: {error}</div>
          </div>
        )}

        {!loading && !error && chartData.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">
              No data available for this time range
            </div>
          </div>
        )}

        {!loading && !error && chartData.length > 0 && (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-full w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="fillUserInitiated"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-userInitiated)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-userInitiated)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-critical)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-critical)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="critical"
                type="natural"
                fill="url(#fillCritical)"
                stroke="var(--color-critical)"
                strokeWidth={2}
              />
              <Area
                dataKey="userInitiated"
                type="natural"
                fill="url(#fillUserInitiated)"
                stroke="var(--color-userInitiated)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
