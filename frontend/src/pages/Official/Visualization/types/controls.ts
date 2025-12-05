import type React from "react";

export type MapControlsProps = {
  mapRef: React.RefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  makeTooltip: (text: string) => React.ReactNode;
  addCustomLayers: (map: mapboxgl.Map) => void;
  onToggleLiveReport?: () => void;
  isLiveReportOpen?: boolean;
};
