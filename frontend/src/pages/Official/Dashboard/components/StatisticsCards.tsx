import { Card, CardContent } from "@/components/ui/card";
import { LifeBuoy, RadioReceiver, UserCog, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchAdminDashboardStats } from "../api/adminDashboard";

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactNode;
}

export function StatisticsCards() {
  const [stats, setStats] = useState<StatCard[]>([
    {
      title: "Terminals",
      value: 0,
      icon: <RadioReceiver className="w-10 h-10" />,
    },
    {
      title: "Dispatchers",
      value: 0,
      icon: <UserCog className="w-10 h-10" />,
    },
    {
      title: "Neighborhood Groups",
      value: 0,
      icon: <Users className="w-10 h-10" />,
    },
    {
      title: "Completed Operations",
      value: 0,
      icon: <LifeBuoy className="w-10 h-10" />,
    },
  ]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetchAdminDashboardStats();
        const data = response.payload;

        setStats([
          {
            title: "Terminals",
            value: data.activeTerminals,
            icon: <RadioReceiver className="w-10 h-10" />,
          },
          {
            title: "Dispatchers",
            value: data.activeDispatchers,
            icon: <UserCog className="w-10 h-10" />,
          },
          {
            title: "Neighborhood Groups",
            value: data.activeNeighborhoods,
            icon: <Users className="w-10 h-10" />,
          },
          {
            title: "Completed Operations",
            value: data.completedOperations,
            icon: <LifeBuoy className="w-10 h-10" />,
          },
        ]);
      } catch (error) {
        console.error("Error fetching admin dashboard stats:", error);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="bg-[#211f1f] border-[#404040] hover:border-[#505050] transition-colors py-4.5 rounded-[5px]"
        >
          <CardContent className="pw-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-white text-base font-normal">
                  {stat.title}
                </p>
                <h3 className="text-white text-4xl font-semibold">{stat.value}</h3>
              </div>
              <div className="text-white/40">
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
