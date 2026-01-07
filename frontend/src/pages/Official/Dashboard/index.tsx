import { useSearchParams } from "react-router-dom";
import { MapView } from "./components/MapView";
import { Overview } from "./components/Overview";

export function Dashboard() {
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as "overview" | "map-view") || "overview";

  return (
    <div className="w-full h-full flex flex-col bg-[#171717]">
      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === "overview" ? <Overview /> : <MapView />}
      </div>
    </div>
  );
}
