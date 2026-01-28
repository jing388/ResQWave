import type React from "react";

export type MapControlsProps = {
  mapRef: React.RefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  makeTooltip: (text: string) => React.ReactNode;
  addCustomLayers: (map: mapboxgl.Map) => void;
  addBoundaryAndFloodLayers?: (map: mapboxgl.Map, heatmapVisibility?: boolean) => void;
  heatmapVisible?: boolean;
  setHeatmapVisible?: (visible: boolean) => void;
  onToggleLiveReport?: () => void;
  isLiveReportOpen?: boolean;
};
