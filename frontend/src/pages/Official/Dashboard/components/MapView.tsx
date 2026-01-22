import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import useSignals from "../../Visualization/hooks/useSignals";
import { cinematicMapEntrance } from "../../Visualization/utils/flyingEffects";
import { useMapPins } from "../hooks/useMapPins";
import { AdminPinPopover } from "./AdminPinPopover";
import MapControls from "./MapControls";
import { MapPins } from "./MapPins";
import { TerminalInsightsPanel } from "./TerminalInsightsPanel";
import { Gemini } from '@lobehub/icons';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export function MapView() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [, setMapLoaded] = useState(false);

  // Get signals from the centralized hook
  const signals = useSignals();
  const { otherSignals, ownCommunitySignal: OwnCommunitySignal } = signals;


  // Get map pins data (aggregated from backend)
  const { pins, loading: pinsLoading } = useMapPins();

  // Popover state (like Visualization)
  const [popover, setPopover] = useState<{
    lng: number;
    lat: number;
    screen: { x: number; y: number };
    terminalID: string;
    terminalName: string;
    terminalStatus: string;
    timeSent: string;
    focalPerson: string;
    contactNumber: string;
    totalAlerts: number;
  } | null>(null);

  // Terminal Insights Panel state
  const [insightsPanelOpen, setInsightsPanelOpen] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<{
    terminalID: string;
    terminalName: string;
  } | null>(null);

  // For AI floating button (Gemini)
  const handleAIFloatClick = () => {
    // Open insights panel with a generic "AI" terminal
    setSelectedTerminal({ terminalID: "ai-gemini", terminalName: "AI Gemini" });
    setInsightsPanelOpen(true);
  };

  // Ref to track popover for map move event
  const popoverRef = useRef(popover);
  useEffect(() => {
    popoverRef.current = popover;
  }, [popover]);

  /**
   * Helper function to re-render all layers (used when switching map styles)
   */
  const reRenderAllLayers = useCallback((map: mapboxgl.Map) => {
    // Re-add Caloocan boundary
    try {
      const caloocan175SourceId = "caloocan-175-boundary";
      const caloocan175LayerId = "caloocan-175-boundary-layer";
      const caloocan175StrokeLayerId = "caloocan-175-boundary-stroke";

      if (!map.getSource(caloocan175SourceId)) {
        map.addSource(caloocan175SourceId, {
          type: "vector",
          url: "mapbox://rodelll.aenwq122",
        });
      }

      if (!map.getLayer(caloocan175LayerId)) {
        map.addLayer({
          id: caloocan175LayerId,
          type: "fill",
          source: caloocan175SourceId,
          "source-layer": "175_boundary-cz8oek",
          paint: {
            "fill-color": "#0019bd",
            "fill-opacity": 0.05,
          },
        });
      }

      if (!map.getLayer(caloocan175StrokeLayerId)) {
        map.addLayer({
          id: caloocan175StrokeLayerId,
          type: "line",
          source: caloocan175SourceId,
          "source-layer": "175_boundary-cz8oek",
          paint: {
            "line-color": "#0019bd",
            "line-width": 3,
            "line-opacity": 0.4,
          },
        });
      }
    } catch (e) {
      console.warn("[MapView] could not re-add 175 Caloocan boundary", e);
    }

    // Re-add neighborhood boundaries
    const allSignals = [
      ...otherSignals,
      ...(OwnCommunitySignal ? [OwnCommunitySignal] : []),
    ];

    allSignals.forEach((signal, index) => {
      if (signal.boundary && signal.boundary.length > 0) {
        const boundarySourceId = `neighborhood-boundary-${signal.properties.deviceId || index}`;
        const boundaryLayerId = `neighborhood-boundary-layer-${signal.properties.deviceId || index}`;
        const boundaryStrokeLayerId = `neighborhood-boundary-stroke-${signal.properties.deviceId || index}`;

        try {
          if (!map.getSource(boundarySourceId)) {
            map.addSource(boundarySourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Polygon",
                  coordinates: [signal.boundary],
                },
              },
            });
          }

          if (!map.getLayer(boundaryLayerId)) {
            map.addLayer({
              id: boundaryLayerId,
              type: "fill",
              source: boundarySourceId,
              paint: {
                "fill-color": "#3b82f6",
                "fill-opacity": 0.1,
              },
            });
          }

          if (!map.getLayer(boundaryStrokeLayerId)) {
            map.addLayer({
              id: boundaryStrokeLayerId,
              type: "line",
              source: boundarySourceId,
              paint: {
                "line-color": "#3b82f6",
                "line-width": 2,
                "line-opacity": 0.6,
              },
            });
          }
        } catch (e) {
          console.warn("[MapView] could not re-add neighborhood boundary", e);
        }
      }
    });
  }, [otherSignals, OwnCommunitySignal]);

  /**
   * Initialize map canvas for interactions
   */
  const initializeMapCanvas = (map: mapboxgl.Map) => {
    try {
      const canvas = map.getCanvas() as HTMLCanvasElement | null;
      if (canvas) {
        canvas.tabIndex = 0;
        canvas.style.touchAction = "auto";
      }
    } catch {
      // Ignore errors
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current as HTMLElement,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [121.03961980285305, 14.76278553581811],
      zoom: 10,
      pitch: 75,
      bearing: 0,
      antialias: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      initializeMapCanvas(map);

      // Keep popover anchored during map movement (like Visualization)
      map.on("move", () => {
        const p = popoverRef.current;
        if (!p) return;
        const coord: [number, number] = [p.lng, p.lat];
        const pt = map.project(coord);
        const rect = mapContainer.current?.getBoundingClientRect();
        const absX = (rect?.left ?? 0) + pt.x;
        const absY = (rect?.top ?? 0) + pt.y;
        setPopover({ ...p, screen: { x: absX, y: absY } });
      });

      // Add Caloocan boundary layer (bottom layer)
      try {
        const caloocan175SourceId = "caloocan-175-boundary";
        const caloocan175LayerId = "caloocan-175-boundary-layer";
        const caloocan175StrokeLayerId = "caloocan-175-boundary-stroke";

        // Add vector tile source for 175 Caloocan boundary
        if (!map.getSource(caloocan175SourceId)) {
          map.addSource(caloocan175SourceId, {
            type: "vector",
            url: "mapbox://rodelll.aenwq122",
          });
        }

        // Add fill layer for 175 Caloocan boundary
        if (!map.getLayer(caloocan175LayerId)) {
          map.addLayer({
            id: caloocan175LayerId,
            type: "fill",
            source: caloocan175SourceId,
            "source-layer": "175_boundary-cz8oek",
            paint: {
              "fill-color": "#0019bd",
              "fill-opacity": 0.05,
            },
          });
        }

        // Add stroke layer for 175 Caloocan boundary
        if (!map.getLayer(caloocan175StrokeLayerId)) {
          map.addLayer({
            id: caloocan175StrokeLayerId,
            type: "line",
            source: caloocan175SourceId,
            "source-layer": "175_boundary-cz8oek",
            paint: {
              "line-color": "#0019bd",
              "line-width": 3,
              "line-opacity": 0.4,
            },
          });
        }
      } catch (e) {
        console.warn("[MapView] could not add 175 Caloocan boundary", e);
      }

      setTimeout(() => {
        cinematicMapEntrance(map, [121.0397921660267, 14.762918874426148]);
      }, 400);

      setMapLoaded(true);
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };

  }, []);

  // Update map layers when signals change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const allSignals = [
      ...otherSignals,
      ...(OwnCommunitySignal ? [OwnCommunitySignal] : []),
    ];

    // Add/update neighborhood boundaries
    try {
      allSignals.forEach((signal, index) => {
        if (signal.boundary && signal.boundary.length > 0) {
          const boundarySourceId = `neighborhood-boundary-${signal.properties.deviceId || index}`;
          const boundaryLayerId = `neighborhood-boundary-layer-${signal.properties.deviceId || index}`;
          const boundaryStrokeLayerId = `neighborhood-boundary-stroke-${signal.properties.deviceId || index}`;

          // Add or update boundary source
          if (!map.getSource(boundarySourceId)) {
            map.addSource(boundarySourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Polygon",
                  coordinates: [signal.boundary],
                },
              },
            });

            // Add fill layer
            if (!map.getLayer(boundaryLayerId)) {
              map.addLayer({
                id: boundaryLayerId,
                type: "fill",
                source: boundarySourceId,
                paint: {
                  "fill-color": "#3b82f6",
                  "fill-opacity": 0.1,
                },
              });
            }

            // Add stroke layer
            if (!map.getLayer(boundaryStrokeLayerId)) {
              map.addLayer({
                id: boundaryStrokeLayerId,
                type: "line",
                source: boundarySourceId,
                paint: {
                  "line-color": "#3b82f6",
                  "line-width": 2,
                  "line-opacity": 0.6,
                },
              });
            }
          } else {
            // Update existing source
            const source = map.getSource(boundarySourceId) as mapboxgl.GeoJSONSource;
            source.setData({
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [signal.boundary],
              },
            });
          }
        }
      });
    } catch (e) {
      console.warn("[MapView] could not update neighborhood boundaries", e);
    }
  }, [otherSignals, OwnCommunitySignal]);

  return (
    <div className="w-full h-full bg-[#171717] relative overflow-hidden">
      {/* Map Container */}
      <div
        ref={mapContainer}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
        }}
      />

      {/* Admin Pin Popover (like SignalPopover in Visualization) */}
      <AdminPinPopover
        popover={popover}
        onClose={() => setPopover(null)}
        onMoreInfo={() => {
          console.log("[MapView] More Info clicked for:", popover?.terminalID);
          // TODO: Implement More Info functionality
        }}
        onOpenInsights={(terminalID: string, terminalName: string) => {
          setSelectedTerminal({ terminalID, terminalName });
          setInsightsPanelOpen(true);
        }}
      />


      {/* AI Floating Button - Bottom Left */}
      <div
        style={{
          position: "absolute",
          left: 21,
          bottom: 21,
          zIndex: 50,
        }}
      >
        <button
          aria-label="AI Decision Support"
          onClick={handleAIFloatClick}
          className="gemini-button"
          style={{
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            perspective: "1000px",
          }}
        >
            <div
            className="gemini-icon"
            style={{
              transformStyle: "preserve-3d",
              transition: "transform 0.6s ease-in-out",
              cursor: "pointer",
            }}
            >
            <Gemini.Color size={56} />
            </div>
        </button>
      </div>

      {/* 3D flip animation on hover */}
      <style>{`
        .gemini-button:hover .gemini-icon {
          animation: flip3d 1.2s ease-in-out;
        }
        
        @keyframes flip3d {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }
      `}</style>

      {/* Map Controls */}
      <MapControls
        mapRef={mapRef}
        addCustomLayers={reRenderAllLayers}
      />

      {/* Map Pins - rendered when data is loaded */}
      {!pinsLoading && (
        <MapPins
          map={mapRef.current}
          pins={pins}
          mapContainer={mapContainer}
          onPinClick={(popoverData) => {
            setPopover(popoverData);
          }}
        />
      )}

      {/* Terminal Insights Panel - slides up from bottom */}
      {selectedTerminal && (
        <TerminalInsightsPanel
          isOpen={insightsPanelOpen}
          onClose={() => setInsightsPanelOpen(false)}
          terminalID={selectedTerminal.terminalID}
          terminalName={selectedTerminal.terminalName}
        />
      )}
    </div>
  );
}
