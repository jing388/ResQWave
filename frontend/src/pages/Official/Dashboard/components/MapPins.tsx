import { useEffect, useRef } from "react";
import type { MapPinData } from "../api/adminDashboardApi";

interface MapPinsProps {
  map: mapboxgl.Map | null;
  pins: MapPinData[];
  mapContainer: React.RefObject<HTMLDivElement | null>;
  onPinClick: (popoverData: {
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
  }) => void;
}

/**
 * Helper to parse coordinates from address JSON
 */
function parseCoordinates(address: string | Record<string, unknown>): [number, number] | null {
  try {
    let addressObj: Record<string, unknown> | string = address;

    // If address is a string, try to parse it
    if (typeof addressObj === "string") {
      try {
        addressObj = JSON.parse(addressObj);
      } catch {
        return null; // Invalid JSON
      }
    }

    // Type guard: ensure addressObj is now an object
    if (typeof addressObj !== "object" || addressObj === null) {
      return null;
    }

    // Format 1: Direct lat/lng or latitude/longitude properties
    if ("lng" in addressObj && "lat" in addressObj) {
      return [addressObj.lng as number, addressObj.lat as number];
    }
    if ("longitude" in addressObj && "latitude" in addressObj) {
      return [addressObj.longitude as number, addressObj.latitude as number];
    }

    // Format 2: Coordinates as a STRING "lng, lat" (backend format)
    if ("coordinates" in addressObj && typeof addressObj.coordinates === "string") {
      const coords = addressObj.coordinates.split(",").map((s: string) => parseFloat(s.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        return [coords[0], coords[1]]; // [lng, lat]
      }
    }

    // Format 3: Nested coordinates object
    if ("coordinates" in addressObj && typeof addressObj.coordinates === "object" && addressObj.coordinates !== null) {
      const coords = addressObj.coordinates as Record<string, unknown>;
      if ("longitude" in coords && "latitude" in coords) {
        return [coords.longitude as number, coords.latitude as number];
      }
      if ("lng" in coords && "lat" in coords) {
        return [coords.lng as number, coords.lat as number];
      }
    }
  } catch {
    // Silent error handling
  }
  return null;
}

/**
 * Component to render pins on the Mapbox map
 * Uses GeoJSON layers like the Visualization page for better performance
 */
export function MapPins({ map, pins, mapContainer, onPinClick }: MapPinsProps) {
  const layersInitialized = useRef(false);
  const handlersAttached = useRef(false);

  // Function to update pin data
  const updatePinData = (mapInstance: mapboxgl.Map, pinsData: MapPinData[]) => {
    const source = mapInstance.getSource("admin-pins") as mapboxgl.GeoJSONSource;
    if (!source) return;

    // Parse pins to extract valid coordinates
    const validPins = pinsData
      .map((pin) => {
        const coordinates = parseCoordinates(pin.address);
        
        if (!coordinates) {
          return null;
        }

        // Determine alert type based on terminal status and recent alerts
        const hasRecentAlert = pin.latestAlertTime
          ? new Date().getTime() - new Date(pin.latestAlertTime).getTime() < 3600000 // 1 hour
          : false;

        let alertType = "OFFLINE";
        if (pin.terminalStatus === "Online") {
          if (hasRecentAlert) {
            alertType = "CRITICAL";
          } else if (pin.totalAlerts > 0) {
            alertType = "USER-INITIATED";
          } else {
            alertType = "ONLINE";
          }
        }

        return {
          ...pin,
          coordinates,
          alertType,
        };
      })
      .filter((pin): pin is NonNullable<typeof pin> => pin !== null);

    // Create GeoJSON features for all pins
    const features = validPins.map((pin) => ({
      type: "Feature" as const,
      properties: {
        terminalID: pin.terminalID,
        terminalName: pin.terminalName,
        terminalStatus: pin.terminalStatus,
        focalPerson: pin.focalPerson || "N/A",
        contactNumber: pin.contactNumber || "N/A",
        totalAlerts: pin.totalAlerts,
        latestAlertTime: pin.latestAlertTime || "",
        alertType: pin.alertType,
      },
      geometry: {
        type: "Point" as const,
        coordinates: pin.coordinates,
      },
    }));

    // Update the data source
    source.setData({
      type: "FeatureCollection",
      features,
    });
  };

  // Initialize layers only once
  useEffect(() => {
    if (!map || layersInitialized.current) return;

    const initializeLayers = () => {
      // Check if source already exists
      if (map.getSource("admin-pins")) {
        layersInitialized.current = true;
        // Update data immediately if we have pins
        if (pins.length > 0) {
          updatePinData(map, pins);
        }
        return;
      }

      // Add source with empty data
      map.addSource("admin-pins", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      // Add pulse layer for critical pins
      map.addLayer({
        id: "admin-pins-pulse",
        type: "circle",
        source: "admin-pins",
        filter: ["==", ["get", "alertType"], "CRITICAL"],
        paint: {
          "circle-color": "#ef4444",
          "circle-radius": 13,
          "circle-opacity": 0.4,
          "circle-stroke-width": 0,
        },
      });

      // Add main pin layer
      map.addLayer({
        id: "admin-pins-layer",
        type: "circle",
        source: "admin-pins",
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "alertType"], "CRITICAL"],
            "#ef4444",
            ["==", ["get", "alertType"], "USER-INITIATED"],
            "#eab308",
            ["==", ["get", "alertType"], "ONLINE"],
            "#22c55e",
            ["==", ["get", "alertType"], "OFFLINE"],
            "#6b7280",
            "#6b7280",
          ],
          "circle-radius": 12,
          "circle-opacity": 1,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });

      layersInitialized.current = true;
      
      // Update data immediately after creating layers if we have pins
      if (pins.length > 0) {
        updatePinData(map, pins);
      }
    };

    // Listen for style changes to re-initialize
    const handleStyleData = () => {
      // Reset initialization flag when style changes
      if (!map.getSource("admin-pins")) {
        layersInitialized.current = false;
        handlersAttached.current = false;
        // Delay to ensure boundaries are added first, then pins go on top
        setTimeout(() => {
          if (map && map.isStyleLoaded()) {
            initializeLayers();
          }
        }, 1200);
      }
    };

    // Wait for style to load
    if (map.isStyleLoaded()) {
      initializeLayers();
    } else {
      map.once("load", initializeLayers);
    }

    // Listen for style changes
    map.on("styledata", handleStyleData);

    // Cleanup only on unmount
    return () => {
      if (!map || typeof map.off !== 'function') return;
      
      try {
        map.off("styledata", handleStyleData);
        
        if (map.getLayer("admin-pins-layer")) {
          map.removeLayer("admin-pins-layer");
        }
        if (map.getLayer("admin-pins-pulse")) {
          map.removeLayer("admin-pins-pulse");
        }
        if (map.getSource("admin-pins")) {
          map.removeSource("admin-pins");
        }
        layersInitialized.current = false;
        handlersAttached.current = false;
      } catch {
        // Silent error handling
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Attach event handlers only once
  useEffect(() => {
    if (!map || !layersInitialized.current || handlersAttached.current) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["admin-pins-layer"],
      });

      if (features.length > 0) {
        const feature = features[0];
        const props = feature.properties;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

        const timeSent = props?.latestAlertTime 
          ? new Date(props.latestAlertTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
          : "N/A";

        const pt = map.project(coords);
        const rect = mapContainer.current?.getBoundingClientRect();
        const absX = (rect?.left ?? 0) + pt.x;
        const absY = (rect?.top ?? 0) + pt.y;

        onPinClick({
          lng: coords[0],
          lat: coords[1],
          screen: { x: absX, y: absY },
          terminalID: props?.terminalID || "N/A",
          terminalName: props?.terminalName || "N/A",
          terminalStatus: props?.terminalStatus || "N/A",
          timeSent,
          focalPerson: props?.focalPerson || "N/A",
          contactNumber: props?.contactNumber || "N/A",
          totalAlerts: props?.totalAlerts || 0,
        });
      }
    };

    const handleMouseEnter = () => {
      if (map && map.getCanvas) {
        map.getCanvas().style.cursor = "pointer";
      }
    };

    const handleMouseLeave = () => {
      if (map && map.getCanvas) {
        map.getCanvas().style.cursor = "";
      }
    };

    // Wait a bit to ensure layers are fully added
    const timer = setTimeout(() => {
      if (!map.getLayer("admin-pins-layer")) return;

      map.on("click", "admin-pins-layer", handleClick);
      map.on("mouseenter", "admin-pins-layer", handleMouseEnter);
      map.on("mouseleave", "admin-pins-layer", handleMouseLeave);
      
      handlersAttached.current = true;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (!map || typeof map.off !== 'function') return;
      
      try {
        map.off("click", "admin-pins-layer", handleClick);
        map.off("mouseenter", "admin-pins-layer", handleMouseEnter);
        map.off("mouseleave", "admin-pins-layer", handleMouseLeave);
        handlersAttached.current = false;
      } catch {
        // Silent error handling
      }
    };
  }, [map, mapContainer, onPinClick]);

  // Update pin data only when pins change
  useEffect(() => {
    if (!map || !layersInitialized.current) return;
    
    updatePinData(map, pins);
  }, [map, pins]);

  return null;
}
