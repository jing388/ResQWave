import { useLiveReport } from "@/components/Official/LiveReportContext";
import { useRescueForm } from "@/components/Official/RescueFormContext";
import { TestWebSocketButton } from "@/components/TestWebSocketButton";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { CommunityGroupInfoSheet } from "../CommunityGroups/components/CommunityGroupInfoSheet";

import DistressSignalAlert, {
  type DistressSignalAlertHandle,
} from "./components/DistressSignalAlert";
import { HazardLegend } from "./components/HazardLegend";
import LiveReportSidebar from "./components/LiveReportSidebar";
import MapControls from "./components/MapControls";
import RescueFormAlerts, {
  type RescueFormAlertsHandle,
} from "./components/RescueFormAlerts";
import RescueFormPreview from "./components/RescueFormPreview";
import SignalPopover from "./components/SignalPopover";
import SignalStatusLegend from "./components/SignalStatusLegend";
import {
  RescueWaitlistProvider,
  useRescueWaitlist,
  type WaitlistedRescueForm,
} from "./contexts/RescueWaitlistContext";
import useSignals from "./hooks/useSignals";
import { useWaitlistWebSocket } from "./hooks/useWaitlistWebSocket";
import type { Signal, VisualizationSignals } from "./types/signals";
import { cinematicMapEntrance, flyToSignal } from "./utils/flyingEffects";
import {
  addCustomLayers,
  createGeoJSONCircle,
  getPinColor,
  makeTooltip,
  stopPinPulse,
} from "./utils/mapHelpers";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function VisualizationContent() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { isLiveReportOpen, setIsLiveReportOpen } = useLiveReport();
  const { isRescueFormOpen, isRescuePreviewOpen } = useRescueForm();
  const { selectedWaitlistForm, setSelectedWaitlistForm, removeFromWaitlist } =
    useRescueWaitlist();
  const [showWaitlistPreview, setShowWaitlistPreview] = useState(false);

  // Rescue Form Alerts ref
  const rescueFormAlertsRef = useRef<RescueFormAlertsHandle>(null);

  // Distress Signal Alert ref
  const distressSignalAlertRef = useRef<DistressSignalAlertHandle>(null);

  // Rescue Form Alert Handlers
  const handleShowWaitlistAlert = (focalPerson: string) => {
    rescueFormAlertsRef.current?.showWaitlistSuccess(focalPerson);
  };

  const handleShowDispatchAlert = (focalPerson: string) => {
    rescueFormAlertsRef.current?.showDispatchSuccess(focalPerson);
  };

  const handleShowErrorAlert = (message: string) => {
    rescueFormAlertsRef.current?.showError(message);
  };

  const handleShowDispatchConfirmation = (
    formData: unknown,
    onConfirm: () => void,
  ) => {
    rescueFormAlertsRef.current?.showDispatchConfirmation(formData, () => {
      // Remove the signal circle when dispatch is confirmed
      const map = mapRef.current;
      if (map) {
        removeSignalCircle(map);
      }
      // Execute the original callback
      onConfirm();
    });
  };

  // Keep a ref to the latest sidebar state so map event handlers can see the current value
  const sidebarOpenRef = useRef<boolean>(isLiveReportOpen);
  useEffect(() => {
    sidebarOpenRef.current = isLiveReportOpen;
  }, [isLiveReportOpen]);

  // Community info sheet state
  const [infoSheetOpen] = useState(false);
  // Removed unused setSelectedCommunityData and selectedCommunityData

  // Signal & UI state from centralized hook
  const signals = useSignals();
  const {
    otherSignals,
    ownCommunitySignal: OwnCommunitySignal,
    popover,
    setPopover,
    infoBubble,
    setInfoBubble,
    infoBubbleVisible,
    setInfoBubbleVisible,
    getDistressCoord,
    removeSignal, // Function to remove dispatched alerts from map
  } = signals as unknown as VisualizationSignals & {
    removeSignal: (alertId: string) => void;
  };

  // Set up waitlist WebSocket for real-time removal
  useWaitlistWebSocket();

  // Track previous distress signals to detect new ones
  const previousDistressSignalsRef = useRef<Set<string>>(new Set());

  // Detect new distress signals and show alert
  useEffect(() => {
    const currentDistressSignals = new Set<string>();
    const newDistressSignals: Signal[] = [];

    // Check all signals for critical and user-initiated types
    [
      ...otherSignals,
      ...(OwnCommunitySignal ? [OwnCommunitySignal] : []),
    ].forEach((signal) => {
      if (
        signal.properties.alertType === "CRITICAL" ||
        signal.properties.alertType === "USER-INITIATED"
      ) {
        const signalId =
          signal.properties.alertId || signal.properties.deviceId || "";
        currentDistressSignals.add(signalId);

        // If this is a new distress signal (not in previous set)
        if (!previousDistressSignalsRef.current.has(signalId) && signalId) {
          newDistressSignals.push(signal);
        }
      }
    });

    // Show alert for new distress signals
    if (newDistressSignals.length > 0) {
      // Show alert for the first new signal (you could modify to show multiple)
      const signal = newDistressSignals[0];
      distressSignalAlertRef.current?.showDistressAlert({
        focalPerson: signal.properties.focalPerson,
        alertType: signal.properties.alertType,
        deviceId: signal.properties.deviceId,
      });
    }

    // Update previous signals set
    previousDistressSignalsRef.current = currentDistressSignals;
  }, [otherSignals, OwnCommunitySignal]);

  const distressCoord: [number, number] = getDistressCoord();
  const popoverRef = useRef<typeof popover>(popover);

  useEffect(() => {
    popoverRef.current = popover;
  }, [popover]);

  // Handle map resize when sidebar opens/closes
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      // Delay the resize to allow for transition
      setTimeout(() => {
        map.resize();
      }, 300);
    }
  }, [isLiveReportOpen, isRescueFormOpen, isRescuePreviewOpen]);

  /**
   * Displays a colored circle with pulsing animation around a signal on the map
   */
  const displayBeatingCircle = (signal: Signal) => {
    const map = mapRef.current;
    if (!map) return;

    const coord = signal.coordinates;
    const alertType =
      signal.properties.alertType || signal.properties.status || "offline";
    const color = getPinColor(alertType);

    // Remove previous circle if exists
    if (map.getLayer("signal-radius")) map.removeLayer("signal-radius");
    if (map.getSource("signal-radius")) map.removeSource("signal-radius");

    // Define extended map type for pulse animation
    type ExtendedMap = mapboxgl.Map & { _pulseFrame?: number };
    const extMap = map as ExtendedMap;

    // Always create circles using the imported function
    {
      // Remove any previous animation frame
      if (extMap._pulseFrame) {
        cancelAnimationFrame(extMap._pulseFrame);
        extMap._pulseFrame = undefined;
      }

      // Animation config
      interface PulseConfig {
        minRadius: number;
        maxRadius: number;
        duration: number;
        color: string;
        opacity: number;
      }
      const pulseConfig: PulseConfig = {
        minRadius: 0, // start at the signal point
        maxRadius: 50, // expand outward (50m radius)
        duration: 2000, // ms for one pulse
        color,
        opacity: 0.3,
      };

      // Add source and layer for the pulse
      map.addSource("signal-radius", {
        type: "geojson",
        data: createGeoJSONCircle(coord, pulseConfig.minRadius),
      });

      map.addLayer({
        id: "signal-radius",
        type: "fill",
        source: "signal-radius",
        paint: {
          "fill-color": pulseConfig.color,
          "fill-opacity": pulseConfig.opacity,
        },
      });

      // Animation loop (play ONCE, then show static circle)
      function animatePulse(startTime: number) {
        if (!map) return;
        const now = performance.now();
        const elapsed = now - startTime;
        const t = Math.min(elapsed / pulseConfig.duration, 1);
        // Ease out for radius
        const easeOut = 1 - Math.pow(1 - t, 3);
        const currentRadius =
          pulseConfig.minRadius +
          (pulseConfig.maxRadius - pulseConfig.minRadius) * easeOut;
        const source = map.getSource("signal-radius") as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData(createGeoJSONCircle(coord, currentRadius));
        }
        if (t < 1) {
          extMap._pulseFrame = requestAnimationFrame(() =>
            animatePulse(startTime),
          );
        } else {
          // Animation done: show static circle at max radius
          if (source) {
            source.setData(createGeoJSONCircle(coord, pulseConfig.maxRadius));
          }
          map.setPaintProperty(
            "signal-radius",
            "fill-opacity",
            pulseConfig.opacity,
          );
          extMap._pulseFrame = undefined;
        }
      }
      extMap._pulseFrame = requestAnimationFrame(() =>
        animatePulse(performance.now()),
      );
    }
  };

  /**
   * Removes the signal circle from the map
   */
  const removeSignalCircle = (map: mapboxgl.Map) => {
    try {
      if (map.getLayer("signal-radius")) map.removeLayer("signal-radius");
      if (map.getSource("signal-radius")) map.removeSource("signal-radius");
    } catch {
      // Ignore errors
    }
  };

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

  /**
   * Setup info bubble positioning
   */
  const setupInfoBubble = (map: mapboxgl.Map) => {
    try {
      const pt = map.project(distressCoord);
      setInfoBubble({ x: pt.x, y: pt.y });
    } catch {
      // Ignore errors
    }

    map.on("move", () => {
      try {
        const pt = map.project(distressCoord);
        setInfoBubble({ x: pt.x, y: pt.y });
      } catch {
        // Ignore errors
      }
    });
  };

  /**
   * Find community details for a signal
   */
  const findCommunityDetails = (deviceId: string) => {
    if (
      OwnCommunitySignal &&
      deviceId === OwnCommunitySignal.properties.deviceId
    ) {
      return OwnCommunitySignal.communityDetails;
    }
    const found = otherSignals.find((s) => s.properties.deviceId === deviceId);
    return found?.communityDetails;
  };

  /**
   * Handle signal pin click
   */
  const handleSignalClick = (
    map: mapboxgl.Map,
    e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] },
  ) => {
    const f = e.features?.[0];
    const geom = f?.geometry as GeoJSON.Point | undefined;
    const coord = (geom?.coordinates as [number, number]) || [
      e.lngLat.lng,
      e.lngLat.lat,
    ];
    const deviceId = f?.properties?.deviceId;

    // Find and display circle around clicked signal
    const signalData =
      deviceId === OwnCommunitySignal?.properties.deviceId
        ? OwnCommunitySignal
        : otherSignals.find((s) => s.properties.deviceId === deviceId);

    if (signalData) {
      displayBeatingCircle(signalData);
    } else {
      // If not found in signals, create a signal object from the feature
      const createdSignal: Signal = {
        coordinates: coord,
        properties: {
          status: "OFFLINE",
          deviceId: f?.properties?.deviceId || "",
          focalPerson: f?.properties?.focalPerson || "",
          ...(f?.properties || {}),
        },
        boundary: [],
      };
      displayBeatingCircle(createdSignal);
    }

    flyToSignal(map, coord);

    const pt = map.project(coord);
    const rect = mapContainer.current?.getBoundingClientRect();
    const absX = (rect?.left ?? 0) + pt.x;
    const absY = (rect?.top ?? 0) + pt.y;
    const props = f?.properties || {};

    setPopover({
      lng: coord[0],
      lat: coord[1],
      screen: { x: absX, y: absY },
      alertId: props.alertId || undefined,
      status: props.status || undefined,
      title:
        props.name ||
        (props.status === "offline" ? "Offline Signal" : "Community"),
      address: props.address || undefined,
      date: props.date || undefined,
      deviceId: props.deviceId || undefined,
      focalPerson: props.focalPerson || undefined,
      altFocalPerson: props.altFocalPerson || undefined,
      alertType: props.alertType || undefined,
      contactNumber: props.contactNumber || undefined,
      timeSent: props.timeSent || undefined,
      communityDetails: findCommunityDetails(deviceId),
    });
  };

  /**
   * Setup all map interactions (clicks, hovers, popover updates)
   */
  const setupMapInteractions = (map: mapboxgl.Map) => {
    const signalLayers = ["signal-pins", "signal-pins-pulse"];

    // Signal pin interactions
    signalLayers.forEach((layerId) => {
      map.on("click", layerId, (e) => handleSignalClick(map, e));
      map.on("click", layerId, () => setInfoBubbleVisible(false));
      map.on(
        "mouseenter",
        layerId,
        () => (map.getCanvas().style.cursor = "pointer"),
      );
      map.on("mouseleave", layerId, () => (map.getCanvas().style.cursor = ""));
    });

    // Click on empty map area
    map.on("click", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: signalLayers,
      });
      if (features.length === 0 && sidebarOpenRef.current) {
        removeSignalCircle(map);
        setIsLiveReportOpen(false);
      }
    });

    // Keep popover anchored during map movement
    map.on("move", () => {
      const current = popoverRef.current;
      if (!current) return;

      try {
        const pt = map.project([current.lng, current.lat]);
        const rect = mapContainer.current?.getBoundingClientRect();
        const absX = (rect?.left ?? 0) + pt.x;
        const absY = (rect?.top ?? 0) + pt.y;
        setPopover({ ...current, screen: { x: absX, y: absY } });
      } catch {
        // Ignore errors
      }
    });
  };

  // Clean up: close sidebar when component unmounts
  useEffect(() => {
    return () => {
      setIsLiveReportOpen(false);
    };
  }, [setIsLiveReportOpen]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current as HTMLElement,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [121.04040046802031, 14.7721611560019],
      zoom: 12,
      pitch: 75,
      bearing: 0,
      antialias: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      initializeMapCanvas(map);

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
            "source-layer": "175_boundary-cz8oek", // Using correct tileset name
            paint: {
              "fill-color": "#0019bd", // Light blue color
              "fill-opacity": 0.05, // More transparent
            },
          });
        }

        // Add stroke layer for 175 Caloocan boundary
        if (!map.getLayer(caloocan175StrokeLayerId)) {
          map.addLayer({
            id: caloocan175StrokeLayerId,
            type: "line",
            source: caloocan175SourceId,
            "source-layer": "175_boundary-cz8oek", // Using correct tileset name
            paint: {
              "line-color": "#0019bd", // Light blue stroke
              "line-width": 3,
              "line-opacity": 0.4, // More transparent
            },
          });
        }
      } catch (e) {
        console.warn("[Visualization] could not add 175 Caloocan boundary", e);
      }

      // Add flood polygons using Mapbox vector tileset (top layer - on top of Caloocan)
      try {
        const sourceId = "floods-metro-manila";
        const polygonLayerId = "flood-polygons-metro-manila";

        // Add vector tile source from Mapbox
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: "vector",
            url: "mapbox://rodelll.3lm08j9b",
          });
        }

        // Add polygon fill layer
        if (!map.getLayer(polygonLayerId)) {
          map.addLayer(
            {
              id: polygonLayerId,
              type: "fill",
              source: sourceId,
              "source-layer": "MetroManila_Flood", // Use the tileset's source layer name
              paint: {
                "fill-color": [
                  "match",
                  ["get", "Var"],
                  1,
                  "#ffff00", // Low hazard → Yellow
                  2,
                  "#ff9900", // Medium hazard → Orange
                  3,
                  "#ff0000", // High hazard → Red
                  "#000000", // fallback → Black
                ],
                "fill-opacity": 0.5,
              },
            },
            "waterway-label",
          );
        }
      } catch (e) {
        console.warn("[Visualization] could not add flood polygons", e);
      }

      // Add signal pins as the topmost layer
      addCustomLayers(map, otherSignals, OwnCommunitySignal);

      setupInfoBubble(map);
      setupMapInteractions(map);

      setTimeout(() => {
        cinematicMapEntrance(map, distressCoord);
      }, 600);

      setMapLoaded(true);
    });

    return () => {
      // Stop pulse animation before removing map
      stopPinPulse();
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map layers when signals change
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded() && otherSignals.length > 0) {
      addCustomLayers(map, otherSignals, OwnCommunitySignal);
    }
  }, [otherSignals, OwnCommunitySignal]);

  /**
   * Handler for closing popover
   */
  const handleClosePopover = () => {
    const map = mapRef.current;
    if (map) {
      removeSignalCircle(map);
    }
    setPopover(null);
  };

  return (
    <div
      style={{
        height: "calc(100vh - 70px)",
        minHeight: "610px",
        maxHeight: "93vh",
        width: "100%",
        position: "relative",
        background: "#222",
        overflow: "hidden",
      }}
    >
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

      <SignalPopover
        popover={popover}
        setPopover={setPopover}
        infoBubble={infoBubble}
        infoBubbleVisible={infoBubbleVisible}
        onRemoveSignal={removeSignal}
        onClose={handleClosePopover}
        onShowWaitlistAlert={handleShowWaitlistAlert}
        onShowDispatchAlert={handleShowDispatchAlert}
        onShowErrorAlert={handleShowErrorAlert}
        onShowDispatchConfirmation={handleShowDispatchConfirmation}
      />

      <MapControls
        mapRef={mapRef}
        mapLoaded={mapLoaded}
        makeTooltip={makeTooltip}
        addCustomLayers={(m) =>
          addCustomLayers(m, otherSignals, OwnCommunitySignal)
        }
        onToggleLiveReport={() => setIsLiveReportOpen(!isLiveReportOpen)}
        isLiveReportOpen={isLiveReportOpen}
      />

      {/* Test WebSocket Button - Remove after testing */}
      <div style={{ position: "absolute", top: 20, right: 280, zIndex: 50 }}>
        <TestWebSocketButton />
      </div>

      {/* Live Report Sidebar */}
      <LiveReportSidebar
        isOpen={isLiveReportOpen}
        onClose={() => setIsLiveReportOpen(false)}
        signals={
          OwnCommunitySignal
            ? [...otherSignals, OwnCommunitySignal]
            : otherSignals
        }
        onCardClick={(signal) => {
          const map = mapRef.current;
          if (!map) return;

          const coord = signal.coordinates;

          // Display beating circle around the selected signal
          displayBeatingCircle(signal);

          // Fly to the signal location
          flyToSignal(map, coord);

          // Wait a moment for the map to finish flying, then show popover
          setTimeout(() => {
            // Calculate screen position for popover
            const pt = map.project(coord);
            const rect = mapContainer.current?.getBoundingClientRect();
            const absX = (rect?.left ?? 0) + pt.x;
            const absY = (rect?.top ?? 0) + pt.y;

            // Open the popover with signal information
            setPopover({
              lng: coord[0],
              lat: coord[1],
              screen: { x: absX, y: absY },
              alertId: signal.properties.alertId || undefined,
              status: signal.properties.status || undefined,
              title: signal.properties.name || "Unknown Location",
              address: signal.properties.address || undefined,
              date: signal.properties.date || undefined,
              deviceId: signal.properties.deviceId || undefined,
              focalPerson: signal.properties.focalPerson || undefined,
              altFocalPerson: signal.properties.altFocalPerson || undefined,
              alertType: signal.properties.alertType || undefined,
              communityDetails: signal.communityDetails,
            });
          }, 500); // Small delay to let the map finish flying
        }}
        onWaitlistCardClick={(form: WaitlistedRescueForm) => {
          setSelectedWaitlistForm(form);
          setShowWaitlistPreview(true);
        }}
      />

      {/* Community Group Info Sheet */}
      <CommunityGroupInfoSheet
        open={infoSheetOpen}
        onOpenChange={() => {}}
        communityData={undefined}
      />

      {/* Waitlisted Rescue Form Preview */}
      {selectedWaitlistForm && (
        <RescueFormPreview
          isOpen={showWaitlistPreview}
          onClose={() => {
            setShowWaitlistPreview(false);
            setSelectedWaitlistForm(null);
          }}
          onBack={() => {
            setShowWaitlistPreview(false);
          }}
          formData={selectedWaitlistForm}
          onWaitlist={(formData) => {
            // Show waitlist success alert
            handleShowWaitlistAlert(formData.focalPerson || "Unknown");
          }}
          onDispatch={(formData) => {
            // Show dispatch confirmation with the actual backend call as callback
            if (formData.dispatchCallback) {
              handleShowDispatchConfirmation(formData, async () => {
                try {
                  // Execute the backend dispatch call
                  await formData.dispatchCallback!();

                  // Show dispatch success alert
                  handleShowDispatchAlert(formData.focalPerson || "Unknown");

                  // Close the preview
                  setShowWaitlistPreview(false);
                  setSelectedWaitlistForm(null);
                } catch (error) {
                  console.error(
                    "[Visualization] Error dispatching rescue form:",
                    error,
                  );
                  handleShowErrorAlert(
                    "Failed to dispatch rescue form. Please try again.",
                  );
                }
              });
            } else {
              // Fallback for old behavior (should not happen now)
              handleShowDispatchConfirmation(formData, () => {
                // Remove the signal from the map if alertId exists
                if (formData.alertId && removeSignal) {
                  console.log(
                    "[Visualization] Removing signal from map:",
                    formData.alertId,
                  );
                  removeSignal(formData.alertId);
                }

                // Remove from waitlist if it was a waitlisted form
                if (formData.id) {
                  console.log(
                    "[Visualization] Removing form from waitlist:",
                    formData.id,
                  );
                  removeFromWaitlist(formData.id);
                }

                // Show dispatch success alert
                handleShowDispatchAlert(formData.focalPerson || "Unknown");

                // Close the preview
                setShowWaitlistPreview(false);
                setSelectedWaitlistForm(null);
              });
            }
          }}
        />
      )}

      {/* Rescue Form Alerts */}
      <RescueFormAlerts ref={rescueFormAlertsRef} />

      {/* Distress Signal Alert */}
      <DistressSignalAlert
        ref={distressSignalAlertRef}
        onGoToLiveReport={() => setIsLiveReportOpen(true)}
      />

      {/* Hazard Legend */}
      <HazardLegend />

      {/* Signal Status Legend */}
      <SignalStatusLegend />
    </div>
  );
}

export function Visualization() {
  return (
    <RescueWaitlistProvider>
      <VisualizationContent />
    </RescueWaitlistProvider>
  );
}
