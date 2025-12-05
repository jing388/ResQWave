// alert-dialog removed in favor of custom alerts
import { Button } from "@/components/ui/button";
import { CircleCheck, CircleX } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSquareBlueImage } from "../utils/BoundaryLine";
import { reverseGeocode } from "../utils/geocoding";
import { animatePinSaved } from "../utils/PinAnimation";
import SettingLocationAlerts, {
  type SettingLocationAlertsHandle,
} from "./SettingLocationAlerts";
import SettingLocationControls from "./SettingLocationControls";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

export default function SettingLocationPage() {
  const navigate = useNavigate();
  const [baseStyle] = useState<"streets-v12" | "satellite-streets-v12">(
    "streets-v12",
  );
  const [terminalSaved, setTerminalSaved] = useState(false);
  const alertsRef = useRef<SettingLocationAlertsHandle | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Selected point data
  const [selectedPoint, setSelectedPoint] = useState<{
    lng: number;
    lat: number;
    address: string;
  } | null>(null);

  const title = useMemo(() => {
    if (!terminalSaved) return "Setting the location .....";
    return "Confirm the pin address and coordinates?";
  }, [terminalSaved]);

  useEffect(() => {
    // guard against StrictMode double-mount
    if (mapRef.current) return;
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: `mapbox://styles/mapbox/${baseStyle}`,
      center: [121.049366, 14.762601],
      zoom: 13.5,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Resize guards
    map.on("load", () => {
      try {
        ensureSquareBlueImage(map);
      } catch {
        /* Ignore image errors */
      }
      try {
        map.resize();
      } catch {
        /* Ignore resize errors */
      }
      setTimeout(() => {
        try {
          map.resize();
        } catch {
          /* Ignore resize errors */
        }
      }, 100);
    });
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => {
        try {
          map.resize();
        } catch {
          /* Ignore resize errors */
        }
      });
      if (mapContainerRef.current) ro.observe(mapContainerRef.current);
    } catch {
      /* Ignore ResizeObserver errors */
    }

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentContainer = mapContainerRef.current;
      try {
        if (ro && currentContainer) ro.unobserve(currentContainer);
      } catch {
        /* Ignore cleanup errors */
      }
      try {
        map.remove();
      } catch {
        /* Ignore remove errors */
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When base style changes, update map style
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.setStyle(`mapbox://styles/mapbox/${baseStyle}`);
    } catch {
      /* Ignore style errors */
    }
    // After style change, the sprite resets. Re-add custom icon soon after style data is available.
    try {
      map.once("styledata", () => {
        try {
          ensureSquareBlueImage(map);
        } catch {
          /* Ignore image errors */
        }
      });
    } catch {
      /* Ignore styledata errors */
    }
  }, [baseStyle]);

  // Phase handling: only terminal phase (pin placement)
  useEffect(() => {
    if (!mapRef.current) return;
    const m = mapRef.current as mapboxgl.Map;

    // Clear existing listeners
    try {
      m.off("click", onMapClick);
    } catch {
      /* Ignore listener removal errors */
    }

    // Only terminal phase - pin placement
    m.on("click", onMapClick);
    // Use crosshair cursor for pin placement
    try {
      m.getCanvas().style.cursor = "crosshair";
    } catch {
      /* Ignore cursor style errors */
    }

    function onMapClick(e: mapboxgl.MapMouseEvent) {
      const { lng, lat } = e.lngLat;

      console.log(`📍 Map clicked at: [${lng.toFixed(6)}, ${lat.toFixed(6)}]`);

      // set marker
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new mapboxgl.Marker({ color: "#3b82f6" })
          .setLngLat([lng, lat])
          .addTo(m);
      }

      // reverse geocode for address
      reverseGeocode(lng, lat)
        .then((address) => {
          console.log(`✅ Address found: ${address}`);
          setSelectedPoint({ lng, lat, address });
          alertsRef.current?.showPinAlert(
            `${address}\n${lng.toFixed(6)}, ${lat.toFixed(6)}`,
          );
        })
        .catch((err) => {
          console.error("❌ Geocoding failed:", err);
          const fallback = `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
          setSelectedPoint({ lng, lat, address: fallback });
          alertsRef.current?.showPinAlert(`Coordinates: ${fallback}`);
        });
    }

    return () => {
      try {
        m.off("click", onMapClick);
      } catch {
        /* Ignore listener removal errors */
      }
      // Cleanup cursor override
      try {
        m.getCanvas().style.cursor = "";
      } catch {
        /* Ignore cursor reset errors */
      }
    };
  }, []);

  const handleExit = () => navigate(-1);

  const handleProceed = () => {
    if (!selectedPoint) return;
    // Hide the persistent pin alert and go directly to confirmation
    alertsRef.current?.hidePinAlert?.();

    // Save the location data and return to the form
    sessionStorage.setItem(
      "cg_pick_result",
      JSON.stringify({
        type: "point",
        data: selectedPoint,
      }),
    );
    try {
      sessionStorage.setItem("cg_reopen_sheet", "1");
    } catch {
      /* Ignore session storage errors */
    }

    // Return to the form
    setTimeout(() => navigate(-1), 200);
  };

  // Controls helpers
  const makeTooltip = (text: string) => <span>{text}</span>;
  const addCustomLayers = () => {
    // Re-add any custom layers after base style changes if needed
    if (mapRef.current) {
      try {
        ensureSquareBlueImage(mapRef.current);
      } catch {
        /* Ignore image load errors */
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#171717] text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-3 border-b border-[#2a2a2a] bg-[#171717] backdrop-blur-sm">
        <div className="font-semibold text-base">{title}</div>

        <div className="ml-auto flex gap-2">
          {!terminalSaved && (
            <>
              <Button
                onClick={() => {
                  if (selectedPoint) {
                    setTerminalSaved(true);
                    alertsRef.current?.showLocationSaved();
                    if (markerRef.current) {
                      animatePinSaved(markerRef.current);
                    }
                  }
                }}
                disabled={!selectedPoint}
                className="bg-[#4285f4] hover:bg-[#3367d6] text-white disabled:opacity-60"
              >
                <CircleCheck className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={handleExit}
                className="bg-transparent border-[#2a2a2a] text-white hover:bg-[#262626]"
              >
                <CircleX className="w-4 h-4" />
                Exit
              </Button>
            </>
          )}
          {terminalSaved && (
            <>
              <Button
                onClick={handleProceed}
                className="bg-[#4285f4] hover:bg-[#3367d6] text-white"
              >
                <CircleCheck className="w-4 h-4 mr-2" />
                Confirm
              </Button>
              <Button
                variant="outline"
                onClick={handleExit}
                className="bg-transparent border-[#2a2a2a] text-white hover:bg-[#262626]"
              >
                <CircleX className="w-4 h-4" />
                Exit
              </Button>
            </>
          )}
        </div>
      </div>

      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating map controls bottom-right */}
      <SettingLocationControls
        mapRef={mapRef}
        makeTooltip={makeTooltip}
        addCustomLayers={addCustomLayers}
        onUndo={() => {
          // Terminal phase undo: remove pin and selection
          try {
            markerRef.current?.remove();
          } catch {
            /* Ignore marker removal errors */
          }
          markerRef.current = null;
          setSelectedPoint(null);
          setTerminalSaved(false);
          alertsRef.current?.hideAll();
        }}
      />

      <SettingLocationAlerts ref={alertsRef} />
    </div>
  );
}
