import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export function Header({
  isVisualizationOpen,
}: {
  isVisualizationOpen: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const activeTab = searchParams.get("tab") || "overview";

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

  return (
    <header
      className={`h-auto min-h-18 bg-[#171717] border-b border-[#2a2a2a] flex flex-wrap md:flex-nowrap items-center justify-between px-4 md:px-6 py-2 md:py-0 relative z-50`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-6 w-full md:w-auto">
        <h1 className="text-white font-semibold text-base md:text-lg tracking-wide">
          BARANGAY 175
        </h1>
        {isVisualizationOpen && (
          <>
            {location.pathname.startsWith("/dashboard") ? (
              <div className="flex items-center gap-0 bg-[#222222] rounded-[5px] p-1">
                <button
                  onClick={() => navigate("/dashboard?tab=overview")}
                  className={`px-6 py-2 text-sm md:text-base font-medium transition-colors rounded-[5px] ${activeTab === "overview"
                      ? "text-white bg-[#414141]"
                      : "text-white/60 bg-transparent hover:text-white"
                    }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => navigate("/dashboard?tab=map-view")}
                  className={`px-6 py-2 text-sm md:text-base font-medium transition-colors rounded-[5px] ${activeTab === "map-view"
                      ? "text-white bg-[#414141]"
                      : "text-white/60 bg-transparent hover:text-white"
                    }`}
                >
                  Map View
                </button>
              </div>
            ) : (
              <span className="text-white/80 text-sm md:text-base font-medium bg-[#2a2a2a] px-4 py-2 rounded-[5px]">
                Visualization Map
              </span>
            )}
          </>
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
