import type { GeoJSONSource, Map } from "mapbox-gl";

const BLUE = "#3B82F6"; // tailwind blue-500

// Custom styles for Mapbox GL Draw used in boundary (line) phase
// - Dashed blue line
// - Square blue vertices (using symbol with square-11; falls back to circle if sprite missing)
export function getDrawStyles(): Record<string, unknown>[] {
  return [
    // Inactive line dashed blue
    {
      id: "gl-draw-line-inactive",
      type: "line",
      filter: [
        "all",
        ["==", "$type", "LineString"],
        ["!=", "meta", "midpoint"],
        ["!=", "active", "true"],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": BLUE,
        "line-width": 3,
        "line-dasharray": [2, 2],
      },
    },
    // Active line (during drawing)
    {
      id: "gl-draw-line-active",
      type: "line",
      filter: [
        "all",
        ["==", "$type", "LineString"],
        ["!=", "meta", "midpoint"],
        ["==", "active", "true"],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": BLUE,
        "line-width": 3,
        "line-dasharray": [2, 2],
      },
    },
    // Midpoints as small circles (editing handles)
    {
      id: "gl-draw-midpoints",
      type: "circle",
      filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
      paint: {
        "circle-radius": 4,
        "circle-color": BLUE,
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-width": 1.5,
      },
    },
  ];
}

// Ensure a blue square sprite exists for point rendering
export function ensureSquareBlueImage(map: Map) {
  try {
    if (
      "hasImage" in map &&
      typeof map.hasImage === "function" &&
      map.hasImage("square-blue")
    )
      return;
  } catch {
    // continue
  }
  const size = 20;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // Fill blue square
  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, size, size);
  // White stroke for contrast
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  try {
    if ("addImage" in map && typeof map.addImage === "function") {
      map.addImage("square-blue", imageData, { pixelRatio: 2 });
    }
  } catch {
    // ignore add failures
  }
}

// Add or update a translucent fill for the saved boundary (close the line to first point)
export function updateBoundaryFill(map: Map, coords: number[][] | null) {
  const sourceId = "cg-boundary-fill-src";
  const layerId = "cg-boundary-fill";

  // remove existing when clearing
  if (!coords || coords.length < 3) {
    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    } catch {
      /* Ignore layer removal errors */
    }
    try {
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch {
      /* Ignore source removal errors */
    }
    return;
  }

  const ring = [...coords];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);

  const geojson: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  };

  if (map.getSource(sourceId)) {
    const s = map.getSource(sourceId) as GeoJSONSource;
    s.setData(geojson);
  } else {
    map.addSource(sourceId, { type: "geojson", data: geojson });
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": BLUE,
        "fill-opacity": 0.3,
      },
    });
  }
}

// Add or update a persistent set of blue square vertices for the current boundary
export function updateBoundaryVertices(map: Map, coords: number[][] | null) {
  const sourceId = "cg-boundary-vertices-src";
  const layerId = "cg-boundary-vertices";

  // clear when no coordinates
  if (!coords || coords.length === 0) {
    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    } catch {
      /* Ignore layer removal errors */
    }
    try {
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch {
      /* Ignore source removal errors */
    }
    return;
  }

  // ensure the square icon exists; if sprite not ready yet, bail and retry on next call
  try {
    ensureSquareBlueImage(map);
  } catch {
    /* Ignore image load errors */
  }
  try {
    if (
      "hasImage" in map &&
      typeof map.hasImage === "function" &&
      !map.hasImage("square-blue")
    ) {
      return;
    }
  } catch {
    /* Ignore image check errors */
  }

  // Avoid duplicating the closing point if present
  const pts: GeoJSON.Feature<GeoJSON.Point>[] = [];
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    // skip the last if it equals the first
    if (
      i === n - 1 &&
      coords[0] &&
      coords[n - 1] &&
      coords[0][0] === coords[n - 1][0] &&
      coords[0][1] === coords[n - 1][1]
    )
      break;
    const [lng, lat] = coords[i];
    pts.push({
      type: "Feature",
      properties: { idx: i },
      geometry: { type: "Point", coordinates: [lng, lat] },
    });
  }

  const fc: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: "FeatureCollection",
    features: pts,
  };

  if (map.getSource(sourceId)) {
    const s = map.getSource(sourceId) as GeoJSONSource;
    s.setData(fc);
  } else {
    map.addSource(sourceId, { type: "geojson", data: fc });
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "symbol",
      source: sourceId,
      layout: {
        "icon-image": "square-blue",
        "icon-size": 1.2,
        "icon-allow-overlap": true,
        "icon-anchor": "center",
      },
    });
  }
}
