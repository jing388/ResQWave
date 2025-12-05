import type React from "react";
import type { Signal } from "../types/signals";

export function addCustomLayers(
  map: mapboxgl.Map,
  otherSignals: Signal[],
  OwnCommunitySignal: Signal,
) {
  // const getPinColor = (alertType: string) => {
  //     const colors: Record<string, string> = {
  //         'critical': '#ef4444',
  //         'user-initiated': '#eab308',
  //         'online': '#22c55e',
  //         'offline': '#6b7280'
  //     };
  //     return colors[alertType?.toLowerCase()] || '#6b7280';
  // };

  // Create unified signals source for pins
  const allSignals = [
    ...otherSignals.map((s) => ({
      ...s,
      properties: {
        ...s.properties,
        alertType: s.properties.alertType || s.properties.status || "offline",
      },
    })),
    ...(OwnCommunitySignal
      ? [
          {
            ...OwnCommunitySignal,
            properties: {
              ...OwnCommunitySignal.properties,
              alertType:
                OwnCommunitySignal.properties.alertType ||
                OwnCommunitySignal.properties.status ||
                "online",
            },
          },
        ]
      : []),
  ];

  // Create unified signals source for pins
  if (!map.getSource("all-signals")) {
    map.addSource("all-signals", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: allSignals.map((s) => ({
          type: "Feature",
          properties: s.properties,
          geometry: { type: "Point", coordinates: s.coordinates },
        })),
      },
    });
  } else {
    const s = map.getSource("all-signals") as mapboxgl.GeoJSONSource;
    s.setData({
      type: "FeatureCollection",
      features: allSignals.map((s2) => ({
        type: "Feature",
        properties: s2.properties,
        geometry: { type: "Point", coordinates: s2.coordinates },
      })),
    });
  }

  // Add pulse layer for critical and user-initiated pins (behind main pins)
  if (!map.getLayer("signal-pins-pulse")) {
    map.addLayer({
      id: "signal-pins-pulse",
      type: "circle",
      source: "all-signals",
      filter: [
        "any",
        ["==", ["get", "alertType"], "CRITICAL"],
        ["==", ["get", "alertType"], "USER-INITIATED"],
      ],
      paint: {
        "circle-color": [
          "case",
          ["==", ["get", "alertType"], "CRITICAL"],
          "#ef4444",
          ["==", ["get", "alertType"], "USER-INITIATED"],
          "#eab308",
          "#ef4444", // fallback
        ],
        "circle-radius": 13,
        "circle-opacity": 0.4,
        "circle-stroke-width": 0,
      },
    });

    // Start pulse animation only if not already running
    animatePinPulse(map);
  }

  // Add dynamic colored pins based on alert type
  if (!map.getLayer("signal-pins")) {
    map.addLayer({
      id: "signal-pins",
      type: "circle",
      source: "all-signals",
      paint: {
        "circle-color": [
          "case",
          ["==", ["get", "alertType"], "CRITICAL"],
          "#ef4444",
          ["==", ["get", "alertType"], "USER-INITIATED"],
          "#eab308",
          ["==", ["get", "alertType"], "DISPATCHED"],
          "#10b981",
          ["==", ["get", "alertType"], "ONLINE"],
          "#22c55e",
          ["==", ["get", "alertType"], "OFFLINE"],
          "#6b7280",
          "#6b7280", // default gray
        ],
        "circle-radius": 12,
        "circle-opacity": 1,
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 2,
      },
    });
  }

  // Remove old layers if they exist
  if (map.getLayer("offline-core")) map.removeLayer("offline-core");
  if (map.getLayer("distress-core")) map.removeLayer("distress-core");
  if (map.getSource("offline-signals")) map.removeSource("offline-signals");
  if (map.getSource("distress-signal")) map.removeSource("distress-signal");
}

// Helper to create a GeoJSON circle polygon from center and radius (meters)
export function createGeoJSONCircle(
  center: [number, number],
  radiusInMeters: number,
  points = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const earthRadius = 6378137;
  const lat = (center[1] * Math.PI) / 180;
  const lon = (center[0] * Math.PI) / 180;
  for (let i = 0; i < points; i++) {
    const angle = (((i * 360) / points) * Math.PI) / 180;
    const dx = (Math.cos(angle) * radiusInMeters) / earthRadius;
    const dy = (Math.sin(angle) * radiusInMeters) / earthRadius;
    const latOffset = lat + dy;
    const lonOffset = lon + dx / Math.cos(lat);
    coords.push([(lonOffset * 180) / Math.PI, (latOffset * 180) / Math.PI]);
  }
  coords.push(coords[0]);
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {},
  };
}

// Helper to get pin color based on alert type
export function getPinColor(alertType: string): string {
  const colors: Record<string, string> = {
    critical: "#ef4444", // Red for critical alerts
    "user-initiated": "#eab308", // Yellow for user-initiated alerts
    dispatched: "#10b981", // Green for dispatched/completed rescues
    online: "#22c55e", // Green for online terminals
    offline: "#6b7280", // Gray for offline terminals
  };
  return colors[alertType?.toLowerCase()] || "#6b7280";
}

// Animate pulse for critical and user-initiated pins
let pulseAnimationFrame: number | null = null;

export function animatePinPulse(map: mapboxgl.Map): void {
  // Stop any existing animation
  if (pulseAnimationFrame) {
    cancelAnimationFrame(pulseAnimationFrame);
    pulseAnimationFrame = null;
  }

  let pulseRadius = 13;
  let pulseOpacity = 0.4;
  let growing = true;

  function pulse() {
    if (!map.getLayer("signal-pins-pulse")) {
      pulseAnimationFrame = null;
      return;
    }

    // Update pulse animation
    if (growing) {
      pulseRadius += 0.5;
      pulseOpacity -= 0.002;
      if (pulseRadius >= 25) {
        growing = false;
      }
    } else {
      pulseRadius -= 0.5;
      pulseOpacity += 0.002;
      if (pulseRadius <= 10) {
        growing = true;
      }
    }

    // Ensure opacity stays within bounds
    pulseOpacity = Math.max(0.1, Math.min(0.5, pulseOpacity));

    try {
      map.setPaintProperty("signal-pins-pulse", "circle-radius", pulseRadius);
      map.setPaintProperty("signal-pins-pulse", "circle-opacity", pulseOpacity);
    } catch (_error) {
      // Layer might have been removed, stop animation
      console.error("Error updating pulse animation:", _error);
      pulseAnimationFrame = null;
      return;
    }

    pulseAnimationFrame = requestAnimationFrame(pulse);
  }

  pulse();
}

// Function to stop pulse animation
export function stopPinPulse(): void {
  if (pulseAnimationFrame) {
    cancelAnimationFrame(pulseAnimationFrame);
    pulseAnimationFrame = null;
  }
}

export const makeTooltip = (text: string): React.ReactElement => (
  <div style={{ position: "relative", left: "-7px" }}>
    <div
      style={{
        background: "rgba(0,0,0,0.60)",
        color: "#fff",
        padding: "8px 10px",
        borderRadius: 6,
        fontSize: 13,
        boxShadow: "0 8px 20px rgba(2,6,23,0.18)",
      }}
    >
      {text}
    </div>
    {/* subtle shadow triangle behind the arrow */}
    <div
      style={{
        position: "absolute",
        right: -9,
        top: "50%",
        transform: "translateY(-50%)",
        width: 0,
        height: 0,
        borderTop: "7px solid transparent",
        borderBottom: "7px solid transparent",
        borderLeft: "7px solid rgba(75,85,99,0.18)",
        filter: "blur(0.2px)",
      }}
    />
    {/* main arrow pointing to the control */}
    <div
      style={{
        position: "absolute",
        right: -6,
        top: "50%",
        transform: "translateY(-50%)",
        width: 0,
        height: 0,
        borderTop: "6px solid transparent",
        borderBottom: "6px solid transparent",
        borderLeft: "6px solid rgba(75,85,99,0.72)",
      }}
    />
  </div>
);
