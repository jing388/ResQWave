import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover-focal";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip-white";
import { Layers, Minus, Plus } from "lucide-react";
import { useState } from "react";

interface MapControlsProps {
  mapRef: React.RefObject<mapboxgl.Map | null>;
  addCustomLayers: (map: mapboxgl.Map) => void;
}

export default function MapControls({
  mapRef,
  addCustomLayers,
}: MapControlsProps) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<"default" | "satellite">(
    "default",
  );

  return (
    <>
      {/* Map Controls - Bottom Right */}
      <div
        style={{
          position: "absolute",
          right: 21,
          bottom: 21,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          gap: 11,
        }}
      >
        {/* Layers popover */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Popover onOpenChange={(open) => setLayersOpen(open)}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 7,
                      background: layersOpen ? "#111827" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: layersOpen
                        ? "0 6px 16px rgba(0,0,0,0.35)"
                        : "0 4px 12px rgba(2,6,23,0.21)",
                      transition: "background 0.18s, box-shadow 0.18s",
                    }}
                    onMouseEnter={(e) => {
                      if (!layersOpen)
                        e.currentTarget.style.background = "#EEEEEE";
                    }}
                    onMouseLeave={(e) => {
                      if (!layersOpen)
                        e.currentTarget.style.background = "#fff";
                    }}
                  >
                    <button
                      aria-label="Layers"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: layersOpen ? "#fff" : "#000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Layers size={21} />
                    </button>
                  </div>
                </PopoverTrigger>
              </TooltipTrigger>
              {!layersOpen && (
                <TooltipContent side="left" sideOffset={8}>
                  Layers
                </TooltipContent>
              )}
            </Tooltip>
            <PopoverContent
              side="left"
              align="center"
              zIndex={30}
              style={{
                minWidth: 220,
                padding: 10,
                background: "transparent",
                boxShadow: "none",
                border: "none",
                transform: "translateX(8px)",
              }}
            >
              {/* Segmented control */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  padding: 6,
                  borderRadius: 12,
                  boxShadow: "0 8px 20px rgba(2,6,23,0.12)",
                }}
              >
                <button
                  onClick={() => {
                    setSelectedLayer("default");
                    const m = mapRef.current;
                    if (!m) return;
                    m.setStyle("mapbox://styles/mapbox/streets-v12");

                    // Use both styledata event and timeout as fallback
                    const handleStyleData = () => {
                      addCustomLayers(m);
                      m.off("styledata", handleStyleData);
                    };
                    m.on("styledata", handleStyleData);

                    // Fallback timeout in case styledata doesn't fire
                    setTimeout(() => {
                      if (m.isStyleLoaded()) {
                        addCustomLayers(m);
                      }
                    }, 1000);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background:
                      selectedLayer === "default" ? "#111827" : "transparent",
                    color: selectedLayer === "default" ? "#fff" : "#9ca3af",
                    border: "none",
                    fontWeight: 500,
                    cursor: "pointer",
                    boxShadow:
                      selectedLayer === "default"
                        ? "0 6px 12px rgba(0,0,0,0.25)"
                        : "none",
                  }}
                >
                  Default
                </button>
                <button
                  onClick={() => {
                    setSelectedLayer("satellite");
                    const m = mapRef.current;
                    if (!m) return;
                    m.setStyle("mapbox://styles/mapbox/satellite-streets-v12");

                    // Use both styledata event and timeout as fallback
                    const handleStyleData = () => {
                      addCustomLayers(m);
                      m.off("styledata", handleStyleData);
                    };
                    m.on("styledata", handleStyleData);

                    // Fallback timeout in case styledata doesn't fire
                    setTimeout(() => {
                      if (m.isStyleLoaded()) {
                        addCustomLayers(m);
                      }
                    }, 1000);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background:
                      selectedLayer === "satellite" ? "#111827" : "transparent",
                    color: selectedLayer === "satellite" ? "#fff" : "#9ca3af",
                    border: "none",
                    fontWeight: 500,
                    cursor: "pointer",
                    boxShadow:
                      selectedLayer === "satellite"
                        ? "0 6px 12px rgba(0,0,0,0.25)"
                        : "none",
                  }}
                >
                  Satellite
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Zoom controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                style={{
                  width: 50,
                  borderTopLeftRadius: 7,
                  borderTopRightRadius: 7,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: "0 4px 12px rgba(2,6,23,0.21)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <button
                  aria-label="Zoom in"
                  onClick={() => {
                    const m = mapRef.current;
                    if (m) m.zoomIn();
                  }}
                  style={{
                    width: "100%",
                    height: 50,
                    border: "none",
                    background: "transparent",
                    color: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: "1px solid rgba(0,0,0,0.12)",
                    transition: "background 0.18s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#EEEEEE")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Plus size={21} />
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              Zoom in
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                style={{
                  width: 50,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomLeftRadius: 7,
                  borderBottomRightRadius: 7,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: "0 6px 16px rgba(2,6,23,0.21)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <button
                  aria-label="Zoom out"
                  onClick={() => {
                    const m = mapRef.current;
                    if (m) m.zoomOut();
                  }}
                  style={{
                    width: "100%",
                    height: 50,
                    border: "none",
                    background: "transparent",
                    color: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.18s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#EEEEEE")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Minus size={21} />
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              Zoom out
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );
}
