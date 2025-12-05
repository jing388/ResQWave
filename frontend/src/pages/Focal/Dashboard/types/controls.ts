import type React from 'react';
import type * as mapboxgl from 'mapbox-gl';

export type MapControlsProps = {
    mapRef: React.RefObject<mapboxgl.Map | null>;
    mapLoaded: boolean;
    makeTooltip: (text: string) => React.ReactNode;
    addCustomLayers: (map: mapboxgl.Map) => void;
    editBoundaryOpen: boolean;
    handleDeleteBoundary: () => void;
    onChatbotToggle?: () => void;
};
