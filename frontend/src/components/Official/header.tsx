import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs-focal";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function Header({
  isVisualizationOpen,
}: {
  isVisualizationOpen: boolean;
}) {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const [activeTab, setActiveTab] = useState<"map" | "table">("map");
  const navigate = useNavigate();

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const dateString = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      setCurrentTime(timeString);
      setCurrentDate(dateString);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTabClick = (tab: "map" | "table") => {
    if (tab === "map") {
      setActiveTab("map");
      navigate("/visualization");
    } else {
      setActiveTab("table");
      navigate("/tabular");
    }
  };

  return (
    <header
      className={`h-auto min-h-18 bg-[#171717] border-b border-[#2a2a2a] flex flex-wrap md:flex-nowrap items-center justify-between px-4 md:px-6 py-2 md:py-0`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-6 w-full md:w-auto">
        <h1 className="text-white font-semibold text-base md:text-lg tracking-wide">
          BARANGAY 175
        </h1>
        {isVisualizationOpen && (
          <Tabs
            value={activeTab}
            defaultValue="map"
            onValueChange={(v) => handleTabClick(v as "map" | "table")}
          >
            <TabsList>
              <TabsTrigger
                value="map"
                style={{
                  color: "#fff",
                  fontSize: "1rem",
                  padding: "0.5rem 1.5rem",
                  borderRadius: 4,
                  transition: "background 0.2s",
                  cursor: "pointer",
                }}
                className="tab-trigger"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#333333")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                Map View
              </TabsTrigger>
              <TabsTrigger
                value="table"
                style={{
                  color: "#fff",
                  fontSize: "1rem",
                  padding: "0.5rem 1.5rem",
                  borderRadius: 4,
                  transition: "background 0.2s",
                  cursor: "pointer",
                }}
                className="tab-trigger"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#333333")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                Table View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-4 text-white/90 text-xs md:text-sm mt-2 md:mt-0 w-full md:w-auto justify-end">
        <span className="font-medium">{currentTime}</span>
        <div className="w-px h-6 bg-white/70"></div>
        <span className="text-white/70">{currentDate}</span>
      </div>
    </header>
  );
}
