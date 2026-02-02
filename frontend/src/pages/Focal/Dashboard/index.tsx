import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import AboutCommunity from "./components/AboutCommunity";
import AccountSettingsModal from "./components/AccountSettingsModal";
import ActivityLogModal from "./components/ActivityLogModal";
import EditAboutCommunity from "./components/EditAboutCommunity";
import { HazardLegend } from './components/HazardLegend';
import Header from "./components/Header";
import HistoryCommunity from "./components/HistoryCommunity";
import MapControls from './components/MapControls';
import SignalPopover from './components/SignalPopover';
import SignalStatusLegend from './components/SignalStatusLegend';
import { CommunityDataProvider } from "./context/CommunityDataContext";
import useSignals from './hooks/useSignals';
import type { DashboardSignals, Signal } from './types/signals';
import { changeToDrawPolygon, createDraw, ensureSquareGreenImage, makeUpdateCanSave } from './utils/drawMapBoundary';
import { cinematicMapEntrance, flyToSignal } from './utils/flyingEffects';
import { addCustomLayers, makeTooltip } from './utils/mapHelpers';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog-focal';
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "mapbox-gl/dist/mapbox-gl.css";
import DashboardAlerts from './components/DashboardAlerts';
import { ChatbotDrawer } from './components/ChatbotDrawer';
// lucide icons removed (unused in this file)


mapboxgl.accessToken = "pk.eyJ1Ijoicm9kZWxsbCIsImEiOiJjbWU0OXNvb2gwYnM0MnpvbXNueXo2dzhxIn0.Ep43_IxVhaPhEqWBaAuuyA";

export default function Dashboard() {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    // signal & UI state provided by the useSignals hook (centralized)
    const signals = useSignals();
    const { otherSignals, ownCommunitySignal: OwnCommunitySignal, editBoundaryOpen, setEditBoundaryOpen, popover, setPopover, infoBubble, setInfoBubble, infoBubbleVisible, setInfoBubbleVisible, setSavedGeoJson, canSave, setCanSave, getDistressCoord } = signals as unknown as DashboardSignals;
    const distressCoord: [number, number] = getDistressCoord();


    // // Poll sensor-data endpoint every 3 seconds and update signal color
    // useEffect(() => {
    //     let interval: NodeJS.Timeout;
    //     let lastStatus: boolean | null = null;
    //     let pulseTimeout: number | null = null;
    //     interval = setInterval(async () => {
    //         try {
    //             const res = await apiFetch<{ status: boolean }>("/sensor-data/latest");
    //             if (typeof res.status === "boolean" && OwnCommunitySignal) {
    //                 // Only update if changed
    //                 if (lastStatus !== res.status) {
    //                     // Animate pulse on color change
    //                     if (mapRef.current && mapLoaded) {
    //                         // Remove previous pulse if any
    //                         if (mapRef.current.getLayer('signal-pulse')) mapRef.current.removeLayer('signal-pulse');
    //                         if (mapRef.current.getSource('signal-pulse')) mapRef.current.removeSource('signal-pulse');
    //                         // Add a pulsing circle overlay
    //                         const color = res.status ? '#ef4444' : '#22c55e';
    //                         mapRef.current.addSource('signal-pulse', {
    //                             type: 'geojson',
    //                             data: {
    //                                 type: 'FeatureCollection',
    //                                 features: [
    //                                     {
    //                                         type: 'Feature',
    //                                         geometry: { type: 'Point', coordinates: OwnCommunitySignal.coordinates },
    //                                         properties: {}
    //                                     }
    //                                 ]
    //                             }
    //                         });
    //                         mapRef.current.addLayer({
    //                             id: 'signal-pulse',
    //                             type: 'circle',
    //                             source: 'signal-pulse',
    //                             paint: {
    //                                 'circle-color': color,
    //                                 'circle-radius': [
    //                                     'interpolate',
    //                                     ['linear'],
    //                                     ['get', 'pulse'],
    //                                     0, 12,
    //                                     1, 28
    //                                 ],
    //                                 'circle-opacity': [
    //                                     'interpolate',
    //                                     ['linear'],
    //                                     ['get', 'pulse'],
    //                                     0, 0.5,
    //                                     1, 0
    //                                 ]
    //                             },
    //                             filter: ['==', '$type', 'Point']
    //                         });
    //                         // Animate the pulse
    //                         let start: number | null = null;
    //                         function animatePulse(ts: number) {
    //                             if (!start) start = ts;
    //                             const elapsed = (ts - start) % 1000;
    //                             const t = elapsed / 1000;
    //                             const source = mapRef.current?.getSource('signal-pulse') as any;
    //                             if (source) {
    //                                 source.setData({
    //                                     type: 'FeatureCollection',
    //                                     features: [
    //                                         {
    //                                             type: 'Feature',
    //                                             geometry: { type: 'Point', coordinates: OwnCommunitySignal.coordinates },
    //                                             properties: { pulse: t }
    //                                         }
    //                                     ]
    //                                 });
    //                             }
    //                             pulseTimeout = window.requestAnimationFrame(animatePulse);
    //                         }
    //                         pulseTimeout = window.requestAnimationFrame(animatePulse);
    //                         // Remove pulse after 1.2s
    //                         setTimeout(() => {
    //                             if (mapRef.current?.getLayer('signal-pulse')) mapRef.current.removeLayer('signal-pulse');
    //                             if (mapRef.current?.getSource('signal-pulse')) mapRef.current.removeSource('signal-pulse');
    //                         }, 1200);
    //                     }
    //                     lastStatus = res.status;
    //                     // Mutate the status property to trigger color change
    //                     OwnCommunitySignal.properties.status = res.status ? 'CRITICAL' : 'ONLINE';
    //                     // Force re-render of map layers
    //                     if (mapRef.current && mapLoaded) {
    //                         addCustomLayers(mapRef.current, otherSignals, { ...OwnCommunitySignal });
    //                     }
    //                 }
    //             }
    //         } catch (e) { /* ignore */ }
    //     }, 3000);
    //     return () => {
    //         clearInterval(interval);
    //         if (pulseTimeout) window.cancelAnimationFrame(pulseTimeout);
    //     };
    // }, [OwnCommunitySignal, mapLoaded, otherSignals]);

    // Dashboard alerts are now handled by DashboardAlerts component
    const alertsRef = useRef<{
        showSaved?: (msg: string) => void;
        showValidAlert?: (msg: string) => void;
        hideValidAlert?: () => void;
        hideEditAlert?: () => void;
        hideSavedAlert?: () => void;
    } | null>(null);
    const [savedTrigger, setSavedTrigger] = useState<number | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);
    const [savedShowViewLogs, setSavedShowViewLogs] = useState<boolean>(true);

    // Listen for dashboard-wide events (e.g., refresh from modal) to show bottom-left saved alert
    useEffect(() => {
        const handler = (ev: Event) => {
            try {
                const ce = ev as CustomEvent;
                const msg = (ce.detail && ce.detail.message) ? String(ce.detail.message) : 'Refreshed successfully!';
                const showViewLogs = (ce.detail && typeof ce.detail.showViewLogs !== 'undefined') ? Boolean(ce.detail.showViewLogs) : true;
                setSavedMessage(msg);
                setSavedShowViewLogs(showViewLogs);
                setSavedTrigger(prev => (prev == null ? 1 : prev + 1));
            } catch { /* ignore */ }
        };
        window.addEventListener('dashboard:show-saved', handler as EventListener);
        return () => window.removeEventListener('dashboard:show-saved', handler as EventListener);
    }, []);

    // keep a ref to the latest popover so map event handlers inside the load callback
    // (which are attached once) can see the current value and update its screen coords
    const popoverRef = useRef<typeof popover>(popover);
    useEffect(() => { popoverRef.current = popover; }, [popover]);

    useEffect(() => {
        if (!mapContainer.current) return;
        const map = new mapboxgl.Map({
            container: mapContainer.current as HTMLElement,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [121.04040046802031, 14.7721611560019],
            zoom: 12,
            pitch: 75,
            bearing: 0,
            antialias: true,
        });
        mapRef.current = map;

        map.on("load", () => {
            try {
                // configure canvas for touch interactions
                const canvas = map.getCanvas() as HTMLCanvasElement | null;
                if (canvas) {
                    canvas.style.touchAction = 'auto';
                }
            } catch { /* Ignore cleanup errors */ }

            addCustomLayers(map, otherSignals, OwnCommunitySignal);
            // Add flood polygons using Mapbox vector tileset
            try {
                const sourceId = "floods-metro-manila";
                const polygonLayerId = "flood-polygons-metro-manila";

                // Add vector tile source from Mapbox
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, {
                        type: "vector",
                        url: "mapbox://rodelll.3lm08j9b"
                    });
                }

                // Add polygon fill layer
                if (!map.getLayer(polygonLayerId)) {
                    map.addLayer({
                        id: polygonLayerId,
                        type: "fill",
                        source: sourceId,
                        "source-layer": "MetroManila_Flood", // Use the tileset's source layer name
                        paint: {
                            "fill-color": [
                                "match",
                                ["get", "Var"],
                                1, "#ffff00",   // Low hazard → Yellow
                                2, "#ff9900",   // Medium hazard → Orange
                                3, "#ff0000",   // High hazard → Red
                                "#000000"       // fallback → Black
                            ],
                            "fill-opacity": 0.5
                        }
                    }, "waterway-label"); // 👈 ensures labels stay above
                }

            } catch (e) {
                console.warn("[Dashboard] could not add flood polygons sources/layers", e);
            }

            // Move signal dot layers above draw layers
            const drawLayerIds = [
                'gl-draw-polygon-fill',
                'gl-draw-polygon-stroke',
                'gl-draw-line',
                'gl-draw-points',
                'gl-draw-polygon-midpoint'
            ];
            const signalLayers = ['distress-core', 'offline-core'];
            signalLayers.forEach(layerId => {
                if (map.getLayer(layerId)) {
                    // Find the top-most draw layer
                    let beforeLayer = null;
                    for (let i = drawLayerIds.length - 1; i >= 0; i--) {
                        if (map.getLayer(drawLayerIds[i])) {
                            beforeLayer = drawLayerIds[i];
                        }
                    }
                    // Move the signal layer above the top-most draw layer
                    if (beforeLayer && map.getLayer(layerId)) {
                        map.moveLayer(layerId, beforeLayer);
                    }
                }
            });

            // Click interactions: open popover anchored to clicked signal (distress + offline)
            const distressLayers = ["distress-core", "distress-core-stroke", "distress-ring-1", "distress-ring-2", "distress-ring-3"];
            const offlineLayers = ["offline-core", "offline-core-stroke", "offline-ring-1", "offline-ring-2", "offline-ring-3"];

            const bindLayerClicks = (layerIds: string[]) => {
                layerIds.forEach((layerId) => {
                    map.on('click', layerId, (e: mapboxgl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
                        const f = e.features?.[0];
                        const geom = f?.geometry as GeoJSON.Point | undefined;
                        const coord = (geom?.coordinates as [number, number]) || [e.lngLat.lng, e.lngLat.lat];
                        // Remove previous radius overlay
                        if (map.getLayer('signal-radius')) map.removeLayer('signal-radius');
                        if (map.getSource('signal-radius')) map.removeSource('signal-radius');

                        // Show radius overlay for clicked signal
                        const deviceId = f?.properties?.deviceId;
                        const radius = 70; // Always use hardcoded value
                        let color = '#22c55e'; // default green for own community

                        // Determine color based on signal status
                        const status = f?.properties?.status;
                        if (status === 'offline') {
                            color = '#6b7280'; // gray for offline signals
                        } else if (deviceId) {
                            if (deviceId === OwnCommunitySignal.properties.deviceId) {
                                color = '#22c55e'; // green for own community
                            } else {
                                const found = otherSignals.find(s => s.properties.deviceId === deviceId);
                                if (found && found.properties.status === 'offline') {
                                    color = '#6b7280'; // gray for other offline signals
                                }
                            }
                        }
                        // Animated pulsing wave effect
                        const extendedMap = map as mapboxgl.Map & {
                            createGeoJSONCircle?: (center: [number, number], radius: number, points?: number) => GeoJSON.Feature;
                            _pulseFrame?: number;
                        };
                        if (typeof extendedMap.createGeoJSONCircle === 'function') {
                            // Remove any previous animation frame
                            if (extendedMap._pulseFrame) {
                                cancelAnimationFrame(extendedMap._pulseFrame);
                                extendedMap._pulseFrame = undefined;
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
                                maxRadius: radius, // expand outward
                                duration: 2000, // ms for one pulse
                                color,
                                opacity: 0.18
                            };
                            // Add source and layer for the pulse
                            if (map.getLayer('signal-radius')) map.removeLayer('signal-radius');
                            if (map.getSource('signal-radius')) map.removeSource('signal-radius');
                            map.addSource('signal-radius', {
                                type: 'geojson',
                                data: extendedMap.createGeoJSONCircle(coord, pulseConfig.minRadius)
                            });
                            map.addLayer({
                                id: 'signal-radius',
                                type: 'fill',
                                source: 'signal-radius',
                                paint: {
                                    'fill-color': pulseConfig.color,
                                    'fill-opacity': pulseConfig.opacity
                                }
                            });
                            // Animation loop (play ONCE, then show static circle)
                            function animatePulse(startTime: number) {
                                const now = performance.now();
                                const elapsed = now - startTime;
                                const t = Math.min(elapsed / pulseConfig.duration, 1);
                                // Ease out for radius only; keep opacity constant
                                const eased = t < 0.7 ? t / 0.7 : 1;
                                const currentRadius = pulseConfig.minRadius + (pulseConfig.maxRadius - pulseConfig.minRadius) * eased;
                                const currentOpacity = pulseConfig.opacity;
                                // Update source data and layer opacity
                                const source = map.getSource('signal-radius') as mapboxgl.GeoJSONSource;
                                if (source && extendedMap.createGeoJSONCircle) {
                                    source.setData(extendedMap.createGeoJSONCircle(coord, currentRadius));
                                }
                                map.setPaintProperty('signal-radius', 'fill-opacity', currentOpacity);
                                if (t < 1) {
                                    extendedMap._pulseFrame = requestAnimationFrame(() => animatePulse(startTime));
                                } else {
                                    // Animation done: show static circle at max radius, full opacity
                                    if (source && extendedMap.createGeoJSONCircle) {
                                        source.setData(extendedMap.createGeoJSONCircle(coord, pulseConfig.maxRadius));
                                    }
                                    map.setPaintProperty('signal-radius', 'fill-opacity', pulseConfig.opacity);
                                    extendedMap._pulseFrame = undefined;
                                }
                            }
                            extendedMap._pulseFrame = requestAnimationFrame(() => animatePulse(performance.now()));
                        }

                        try {
                            // Center the map on the clicked signal's coordinates using utility
                            flyToSignal(map, coord);
                            // Show popover immediately at current projected position
                            const pt = map.project(coord);
                            const rect = mapContainer.current?.getBoundingClientRect();
                            const absX = (rect?.left ?? 0) + pt.x;
                            const absY = (rect?.top ?? 0) + pt.y;
                            const props = f?.properties || {};
                            setPopover({
                                lng: coord[0],
                                lat: coord[1],
                                screen: { x: absX, y: absY },
                                status: props.status || undefined,
                                title: props.name || (props.status === 'offline' ? 'Offline Signal' : 'Community'),
                                address: props.address || undefined,
                                date: props.date || undefined,
                                deviceId: props.deviceId || undefined,
                                focalPerson: props.focalPerson || undefined,
                                altFocalPerson: props.altFocalPerson || undefined
                            });
                        } catch {
                            // fallback: if anything goes wrong, keep previous behavior
                            flyToSignal(map, coord);
                            const pt = map.project(coord);
                            const rect2 = mapContainer.current?.getBoundingClientRect();
                            const absX2 = (rect2?.left ?? 0) + pt.x;
                            const absY2 = (rect2?.top ?? 0) + pt.y;
                            const props = f?.properties || {};
                            setPopover({
                                lng: coord[0],
                                lat: coord[1],
                                screen: { x: absX2, y: absY2 },
                                status: props.status || undefined,
                                title: props.name || (props.status === 'offline' ? 'Offline Signal' : 'Community'),
                                address: props.address || undefined,
                                date: props.date || undefined,
                            });
                        }
                    });
                    map.on('mouseenter', layerId, () => (map.getCanvas().style.cursor = 'pointer'));
                    map.on('mouseleave', layerId, () => (map.getCanvas().style.cursor = ''));
                });
            };

            // When any signal is clicked, hide the info bubble forever
            const hideInfoBubbleOnClick = () => setInfoBubbleVisible(false);
            distressLayers.concat(offlineLayers).forEach(layerId => {
                map.on('click', layerId, hideInfoBubbleOnClick);
            });
            bindLayerClicks(distressLayers);
            bindLayerClicks(offlineLayers);

            // Keep popover anchored while moving
            map.on('move', () => {
                const current = popoverRef.current;
                if (!current) return;
                try {
                    const pt = map.project([current.lng, current.lat]);
                    const rect = mapContainer.current?.getBoundingClientRect();
                    const absX = (rect?.left ?? 0) + pt.x;
                    const absY = (rect?.top ?? 0) + pt.y;
                    setPopover({ ...current, screen: { x: absX, y: absY } });
                } catch {
                    // ignore
                }
            });

            // Keep info bubble anchored to own community signal while moving
            map.on('move', () => {
                if (!OwnCommunitySignal) return;
                const coords = OwnCommunitySignal.coordinates;
                if (!Array.isArray(coords) || (coords[0] === 0 && coords[1] === 0)) return;
                try {
                    const pt = map.project([coords[0], coords[1]]);
                    setInfoBubble({ x: pt.x, y: pt.y });
                } catch { /* ignore projection errors */ }
            });

            // Map loaded state
            setMapLoaded(true);
        });

        return () => {
            mapRef.current = null;
            map.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Flyover animation: only trigger when map is loaded and distressCoord is valid (not [0,0])
    useEffect(() => {
        if (!mapRef.current || !mapLoaded) return;
        // Only fly if distressCoord is not [0,0]
        if (Array.isArray(distressCoord) && (distressCoord[0] !== 0 || distressCoord[1] !== 0)) {
            cinematicMapEntrance(mapRef.current, distressCoord);
        }
    }, [mapLoaded, distressCoord]);

    // Ensure signal layers update when signals change and map is loaded
    useEffect(() => {
        if (!mapRef.current || !mapLoaded) return;
        addCustomLayers(mapRef.current, otherSignals, OwnCommunitySignal);
    }, [otherSignals, OwnCommunitySignal, mapLoaded]);

    // Set info bubble position when map loads and own community signal is available
    // Also update position when map moves or zooms
    useEffect(() => {
        if (!mapRef.current || !mapLoaded || !OwnCommunitySignal) return;
        const coords = OwnCommunitySignal.coordinates;
        // Only set if coordinates are valid (not [0, 0])
        if (!Array.isArray(coords) || (coords[0] === 0 && coords[1] === 0)) return;

        const map = mapRef.current;
        const rect = mapContainer.current?.getBoundingClientRect();
        if (!rect) return;

        const updateInfoBubblePosition = () => {
            try {
                const pt = map.project([coords[0], coords[1]]);
                const x = pt.x;
                const y = pt.y;
                setInfoBubble({ x, y });
            } catch (e) {
                console.warn('[Dashboard] could not calculate info bubble position', e);
            }
        };

        // Initial position
        updateInfoBubblePosition();

        // Update position on map move, zoom, or pitch/bearing changes
        map.on('move', updateInfoBubblePosition);
        map.on('zoom', updateInfoBubblePosition);
        map.on('pitch', updateInfoBubblePosition);
        map.on('rotate', updateInfoBubblePosition);

        return () => {
            map.off('move', updateInfoBubblePosition);
            map.off('zoom', updateInfoBubblePosition);
            map.off('pitch', updateInfoBubblePosition);
            map.off('rotate', updateInfoBubblePosition);
        };
    }, [mapLoaded, OwnCommunitySignal, setInfoBubble]);

    // makeTooltip moved to utils/mapHelpers and imported above

    // canSave and savedGeoJson are provided by useSignals() hook
    const drawRef = useRef<MapboxDraw | null>(null);
    // removed isEditingBoundary (unused)

    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        // Always remove signal boundary layers/source when entering edit mode
        if (editBoundaryOpen) {
            if (map.getLayer('signal-boundary')) map.removeLayer('signal-boundary');
            if (map.getLayer('signal-boundary-line')) map.removeLayer('signal-boundary-line');
            if (map.getSource('signal-boundary')) map.removeSource('signal-boundary');
        }

        if (!editBoundaryOpen) {
            if (drawRef.current) {
                try {
                    map.removeControl(drawRef.current as MapboxDraw);
                } catch (e) {
                    console.error("Error removing MapboxDraw control:", e);
                }
                drawRef.current = null;
            }
            return;
        }

        // Reset canSave when entering edit mode so subsequent draw completion toggles canSave -> true
        setCanSave(false);

        // create draw instance and add helper image
        drawRef.current = createDraw();
        ensureSquareGreenImage(map);

        map.addControl(drawRef.current as MapboxDraw);

        // immediately switch into draw polygon mode
        setTimeout(() => {
            changeToDrawPolygon(drawRef.current);
        }, 0);

        const updateCanSave = makeUpdateCanSave(drawRef, setCanSave);

        map.on("draw.create", updateCanSave);
        map.on("draw.update", updateCanSave);
        map.on("draw.delete", updateCanSave);

        return () => {
            map.off("draw.create", updateCanSave);
            map.off("draw.update", updateCanSave);
            map.off("draw.delete", updateCanSave);
            if (drawRef.current) {
                try {
                    map.removeControl(drawRef.current as MapboxDraw);
                } catch (e) {
                    console.error("Error removing MapboxDraw control:", e);
                }
                drawRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editBoundaryOpen]);


    const handleSave = () => {
        // ask DashboardAlerts to hide the valid alert (centralized)
        alertsRef.current?.hideValidAlert?.();
        const draw = drawRef.current as MapboxDraw;
        if (!draw) return;
        const data = draw.getAll();
        if (!data || data.features.length === 0) {
            alert("Please draw a closed boundary (polygon) before saving.");
            return;
        }

        const polygons = data.features.filter(
            (f: GeoJSON.Feature) => f.geometry && f.geometry.type === "Polygon"
        );
        if (polygons.length === 0) {
            alert("Please draw a closed polygon as your boundary.");
            return;
        }

        // Get the coordinates of the first polygon safely
        let newBoundary: [number, number][] | undefined = undefined;
        if (polygons[0] && polygons[0].geometry && polygons[0].geometry.type === "Polygon" && Array.isArray(polygons[0].geometry.coordinates)) {
            // Filter to ensure each coordinate is a [number, number] pair
            newBoundary = (polygons[0].geometry.coordinates[0] as [number, number][])
                .filter((pt: [number, number]) => Array.isArray(pt) && pt.length === 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number')
                .map((pt: [number, number]) => [pt[0], pt[1]] as [number, number]);
        }
        // Update the boundary for the currently edited signal
        // We'll assume the last clicked signal is stored in popover
        // boundary editing is deprecated; no longer update boundary property

        const featureCollection: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: polygons as GeoJSON.Feature[],
        };

        setSavedGeoJson(featureCollection);
        // Programmatically show the saved boundary and popover for the signal we edited
        try {
            const map = mapRef.current;
            if (map && newBoundary) {
                // remove any previous temporary boundary overlay
                if (map.getLayer('signal-boundary')) map.removeLayer('signal-boundary');
                if (map.getLayer('signal-boundary-line')) map.removeLayer('signal-boundary-line');
                if (map.getSource('signal-boundary')) map.removeSource('signal-boundary');

                // determine the actual signal point coordinate (use the edited signal's point)
                let signalCoord: [number, number] | null = null;
                const targetDeviceId = popover?.deviceId ?? OwnCommunitySignal.properties.deviceId;
                let sourceSignalFeature: Signal | null = null;
                if (targetDeviceId === OwnCommunitySignal.properties.deviceId) {
                    sourceSignalFeature = OwnCommunitySignal;
                    if (OwnCommunitySignal?.coordinates) {
                        signalCoord = OwnCommunitySignal.coordinates as [number, number];
                    }
                } else {
                    const found = otherSignals.find((s: Signal) => s.properties?.deviceId === targetDeviceId);
                    if (found) {
                        sourceSignalFeature = found;
                        if (found.coordinates) signalCoord = found.coordinates as [number, number];
                    }
                }

                // Add boundary source + layers (same style as click handler)
                map.addSource('signal-boundary', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Polygon',
                            coordinates: [newBoundary]
                        }
                    }
                });
                map.addLayer({
                    id: 'signal-boundary',
                    type: 'fill',
                    source: 'signal-boundary',
                    paint: {
                        'fill-color': '#2CBE00',
                        'fill-opacity': 0.1
                    }
                });
                map.addLayer({
                    id: 'signal-boundary-line',
                    type: 'line',
                    source: 'signal-boundary',
                    paint: {
                        'line-color': '#2CBE00',
                        'line-width': 3,
                        'line-dasharray': [2, 4]
                    }
                });

                // Use the signal point for flyTo/popover. If not available, fall back to polygon centroid
                let coord: [number, number];
                if (signalCoord) {
                    coord = signalCoord;
                } else {
                    // centroid fallback
                    const pts = Array.isArray(newBoundary) ? newBoundary : [];
                    let cx = 0, cy = 0;
                    if (pts.length > 0) {
                        for (const p of pts) {
                            cx += p[0];
                            cy += p[1];
                        }
                        cx = cx / pts.length;
                        cy = cy / pts.length;
                    }
                    coord = [cx, cy];
                }

                try { flyToSignal(map, coord); } catch { /* Ignore flyTo errors */ }

                const rect = mapContainer.current?.getBoundingClientRect();
                const pt = map.project(coord);
                const absX = (rect?.left ?? 0) + pt.x;
                const absY = (rect?.top ?? 0) + pt.y;

                // Build popover props using the actual signal feature when possible
                const deviceId = targetDeviceId;
                const propsFromSignal = (sourceSignalFeature?.properties || {}) as Signal['properties'];
                setPopover({
                    lng: coord[0],
                    lat: coord[1],
                    screen: { x: absX, y: absY },
                    status: propsFromSignal.status || popover?.status || 'online',
                    title: propsFromSignal.name || popover?.title || (propsFromSignal.status === 'offline' ? 'Offline Signal' : 'Community'),
                    address: propsFromSignal.address || popover?.address,
                    date: propsFromSignal.date || popover?.date,
                    deviceId,
                    focalPerson: propsFromSignal.focalPerson || popover?.focalPerson,
                    altFocalPerson: propsFromSignal.altFocalPerson || popover?.altFocalPerson
                });
            }
        } catch (e) {
            console.warn('[Dashboard] could not programmatically show saved boundary popover', e);
        }
        // notify DashboardAlerts that a save happened
        setSavedMessage('Your New Community Boundary is now set!');
        setSavedTrigger(prev => (prev == null ? 1 : prev + 1));
        // after saving, clear canSave so future edits re-trigger the valid alert
        setCanSave(false);
        setEditBoundaryOpen(false);
        alertsRef.current?.hideEditAlert?.();
        alertsRef.current?.hideSavedAlert?.();
    };

    const handleDeleteBoundary = () => {
        const draw = drawRef.current;
        if (!draw) return;
        draw.deleteAll();
        setSavedGeoJson(null);
        setCanSave(false);
        // Reset draw mode so user can draw again
        try {
            draw.changeMode('draw_polygon');
        } catch { /* Ignore canvas focus errors */ }
    };

    // handleEditCommunityMarkers removed (replaced by direct UI flow that sets editBoundaryOpen)

    const handleExitEdit = () => {
        setEditBoundaryOpen(false);
        // hide any transient valid alert via the alerts component
        alertsRef.current?.hideValidAlert?.();
        alertsRef.current?.hideEditAlert?.();
        alertsRef.current?.hideSavedAlert?.();
    };

    // About modal state (opened when user clicks "About Your Community" tab)
    const [aboutOpen, setAboutOpen] = useState(false);
    const [aboutCenter, setAboutCenter] = useState<{ x: number; y: number } | null>(null);
    const [editAboutOpen, setEditAboutOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [activityLogOpen, setActivityLogOpen] = useState(false);
    const [activityLogCenter, setActivityLogCenter] = useState<{ x: number; y: number } | null>(null);
    const [historyCenter, setHistoryCenter] = useState<{ x: number; y: number } | null>(null);
    const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
    const [accountSettingsCenter, setAccountSettingsCenter] = useState<{ x: number; y: number } | null>(null);
    const accountSettingsIsDirtyRef = useRef<() => boolean>(() => false);
    const [confirmAccountOpen, setConfirmAccountOpen] = useState(false);
    const pendingAccountContinueRef = useRef<(() => void) | null>(null);
    const editAboutRef = useRef<{ openDiscardConfirm: (onContinue?: () => void) => void } | null>(null);
    const activityLogRef = useRef<{ refresh: () => void } | null>(null);
    const [activeTab, setActiveTab] = useState('community');
    // Store a pending modal open action if confirmation is needed
    const pendingModalContinueRef = useRef<(() => void) | null>(null);

    const handleModalSwitchWithDirtyCheck = useCallback((openModalFn: () => void) => {
        if (accountSettingsOpen && (accountSettingsIsDirtyRef.current?.() ?? false)) {
            // If AccountSettingsModal is open and dirty, show confirmation and store the action
            pendingModalContinueRef.current = () => {
                setAccountSettingsOpen(false);
                openModalFn();
            };
            setConfirmAccountOpen(true);
        } else {
            openModalFn();
        }
    }, [accountSettingsOpen]);

    const openAbout = () => handleModalSwitchWithDirtyCheck(() => {
        setActivityLogOpen(false);
        try {
            const rect = mapContainer.current?.getBoundingClientRect();
            if (rect) {
                const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                setAboutCenter(center);
            } else {
                setAboutCenter(null);
            }
        } catch {
            setAboutCenter(null);
        }
        setAboutOpen(true);
        setActiveTab('about');
    });
    const openHistory = useCallback(() => handleModalSwitchWithDirtyCheck(() => {
        setActivityLogOpen(false);
        try {
            const rect = mapContainer.current?.getBoundingClientRect();
            if (rect) setHistoryCenter({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            else setHistoryCenter(null);
        } catch {
            setHistoryCenter(null);
        }
        setAboutOpen(false);
        setHistoryOpen(true);
        setActiveTab('history');
    }), [handleModalSwitchWithDirtyCheck]);
    const closeAbout = () => { setAboutOpen(false); setActiveTab('community'); };
    const handleTabChange = (value: string) => {
        setActiveTab(value);
        if (value === 'community') closeAbout();
    };

    // ensure when history tab is chosen we open the modal (tab component uses onTabChange)
    useEffect(() => {
        if (activeTab === 'history') openHistory();
    }, [activeTab, openHistory]);

    // close history modal when About or Community tab becomes active
    useEffect(() => {
        if (activeTab === 'community' || activeTab === 'about') {
            setHistoryOpen(false);
        }
    }, [activeTab]);

    // When About's Edit button is clicked we close About and open the edit modal
    // Wait for About's exit animation to finish before opening EditAbout so the fade-out is visible
    const ANIM_MS = 220;
    const handleOpenEditAbout = () => {
        setAboutOpen(false);
        // open edit modal after about's exit animation completes
        setTimeout(() => setEditAboutOpen(true), ANIM_MS + 15);
    };

    const handleCloseEditAbout = () => {
        setEditAboutOpen(false);
        // reopen about modal to show updated info (optional)
        setAboutOpen(true);
    };

    const [chatbotOpen, setChatbotOpen] = useState(false);

    return (
        <div style={{ minHeight: "100vh", width: "100%", position: "relative", background: "#222", overflow: "hidden" }}>
            {/* Debug Panel: Shows signal data used in the map */}
            {/* <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 9999, background: '#18181b', color: '#fff', padding: 16, borderRadius: 8, maxWidth: 420, fontSize: 13, boxShadow: '0 2px 16px rgba(0,0,0,0.18)', opacity: 0.95 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>Debug: Map Signal Data</div>
                <div style={{ maxHeight: 220, overflow: 'auto', fontFamily: 'monospace', fontSize: 12, background: '#23232a', padding: 8, borderRadius: 6 }}>
                    <div><b>Own Community Signal:</b></div>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: 8 }}>{JSON.stringify(OwnCommunitySignal, null, 2)}</pre>
                    <div><b>Other Signals:</b></div>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(otherSignals, null, 2)}</pre>
                </div>
            </div> */}
            <Header
                editBoundaryOpen={editBoundaryOpen}
                editAboutOpen={editAboutOpen}
                canSave={canSave}
                onSave={handleSave}
                onExit={handleExitEdit}
                onAboutClick={openAbout}
                onAccountSettingsClick={() => {
                    // If EditCommunity modal is open, trigger its discard confirmation
                    if (editAboutOpen) {
                        editAboutRef.current?.openDiscardConfirm?.(() => {
                            setEditAboutOpen(false);
                            // After closing edit modal, open Account Settings
                            try {
                                const rect = mapContainer.current?.getBoundingClientRect();
                                if (rect) setAccountSettingsCenter({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                                else setAccountSettingsCenter(null);
                            } catch { setAccountSettingsCenter(null); }
                            setAccountSettingsOpen(true);
                        });
                        return;
                    }
                    // Close any other modal from header tab before opening AccountSettingsModal
                    setAboutOpen(false);
                    setHistoryOpen(false);
                    setActivityLogOpen(false);
                    try {
                        const rect = mapContainer.current?.getBoundingClientRect();
                        if (rect) setAccountSettingsCenter({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                        else setAccountSettingsCenter(null);
                    } catch { setAccountSettingsCenter(null); }
                    setAccountSettingsOpen(true);
                }}
                accountSettingsOpen={accountSettingsOpen}
                onRequestCloseAccountSettings={(continueNavigation) => {
                    try {
                        const isDirty = accountSettingsIsDirtyRef.current?.() ?? false;
                        if (!isDirty) {
                            // not dirty: close modal and continue immediately
                            setAccountSettingsOpen(false);
                            continueNavigation();
                            return;
                        }
                        // store the continuation and open the shared AlertDialog
                        pendingAccountContinueRef.current = continueNavigation;
                        setConfirmAccountOpen(true);
                    } catch {
                        // safe fallback: just close and continue
                        setAccountSettingsOpen(false);
                        continueNavigation();
                    }
                }}
                onRequestDiscard={() => editAboutRef.current?.openDiscardConfirm?.(() => {
                    // continue action: close edit modal and switch to community tab
                    setEditAboutOpen(false);
                    setActiveTab('community');
                })}
                onTabChange={handleTabChange}
                activeTab={activeTab}
                onActivityLogClick={() => {
                    // If EditCommunity modal is open, trigger its discard confirmation
                    if (editAboutOpen) {
                        editAboutRef.current?.openDiscardConfirm?.(() => {
                            setEditAboutOpen(false);
                            // After closing edit modal, open Activity Log
                            setAboutOpen(false);
                            setHistoryOpen(false);
                            setAccountSettingsOpen(false);
                            try {
                                const rect = mapContainer.current?.getBoundingClientRect();
                                if (rect) setActivityLogCenter({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                                else setActivityLogCenter(null);
                            } catch { setActivityLogCenter(null); }
                            setActivityLogOpen(true);
                        });
                        return;
                    }
                    // Otherwise use the normal dirty check for Account Settings modal
                    handleModalSwitchWithDirtyCheck(() => {
                        setAboutOpen(false);
                        setHistoryOpen(false);
                        setAccountSettingsOpen(false);
                        try {
                            const rect = mapContainer.current?.getBoundingClientRect();
                            if (rect) setActivityLogCenter({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                            else setActivityLogCenter(null);
                        } catch { setActivityLogCenter(null); }
                        setActivityLogOpen(true);
                    });
                }}
            />

            <div ref={mapContainer} style={{ position: "absolute", top: 80, left: 0, right: 0, bottom: 0, zIndex: 1 }} />

            <SignalPopover
                popover={popover}
                setPopover={setPopover}
                infoBubble={infoBubble}
                infoBubbleVisible={infoBubbleVisible}
                onClose={() => {
                    // remove any temporary signal radius overlay when popover closes
                    const map = mapRef.current;
                    if (!map) return;
                    try {
                        if (map.getLayer('signal-radius')) map.removeLayer('signal-radius');
                        if (map.getSource('signal-radius')) map.removeSource('signal-radius');
                    } catch { /* ignore */ }
                }}
            />

            <MapControls mapRef={mapRef} mapLoaded={mapLoaded} makeTooltip={makeTooltip} addCustomLayers={(m) => addCustomLayers(m, otherSignals, OwnCommunitySignal)} editBoundaryOpen={editBoundaryOpen} handleDeleteBoundary={handleDeleteBoundary} onChatbotToggle={() => setChatbotOpen(!chatbotOpen)} />

            <HazardLegend />

            <SignalStatusLegend />

            <CommunityDataProvider>
                <AboutCommunity open={aboutOpen} onClose={closeAbout} onEdit={handleOpenEditAbout} center={aboutCenter} />
                <EditAboutCommunity ref={editAboutRef} open={editAboutOpen} onClose={handleCloseEditAbout} onSave={(updatedData: unknown) => {
                    // Update popover instantly with the new data (if popover is open and showing own community)
                    const data = updatedData as { altFirstName?: string; altLastName?: string };
                    if (popover && popover.deviceId === OwnCommunitySignal.properties.deviceId) {
                        const altName = [data.altFirstName, data.altLastName].filter(Boolean).join(' ');
                        setPopover({
                            ...popover,
                            altFocalPerson: altName || popover.altFocalPerson,
                        });
                    }
                    // Refresh activity logs to show the changes immediately
                    if (activityLogRef.current) {
                        activityLogRef.current.refresh();
                    }
                    // Show saved alert
                    setSavedMessage('Community Information Updated Successfully!');
                    setSavedShowViewLogs(true);
                    setSavedTrigger(prev => (prev == null ? 1 : prev + 1));
                }} center={aboutCenter} />
            </CommunityDataProvider>

            <HistoryCommunity open={historyOpen} onClose={() => { setHistoryOpen(false); setActiveTab('community'); }} center={historyCenter} />

            <AccountSettingsModal open={accountSettingsOpen} onClose={() => setAccountSettingsOpen(false)} center={accountSettingsCenter} onSaved={() => {
                // Refresh activity logs when changes are made
                if (activityLogRef.current) {
                    activityLogRef.current.refresh();
                }
            }} onSaveProfile={(data) => {
                // Update popover instantly with the new focal person name (if popover is open and showing own community)
                if (popover && popover.deviceId === OwnCommunitySignal.properties.deviceId) {
                    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
                    setPopover({
                        ...popover,
                        focalPerson: fullName || popover.focalPerson,
                    });
                }
                // Refresh activity logs to show profile changes
                if (activityLogRef.current) {
                    activityLogRef.current.refresh();
                }
            }} isDirtyRef={accountSettingsIsDirtyRef} />

            <ActivityLogModal ref={activityLogRef} open={activityLogOpen} onClose={() => { setActivityLogOpen(false); setActiveTab('community'); }} center={activityLogCenter} />

            {/* Alert dialog for confirming leaving Change Password with unsaved changes */}
            <AlertDialog open={confirmAccountOpen} onOpenChange={setConfirmAccountOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                        <AlertDialogDescription>You have unsaved changes in your account settings. Are you sure you want to discard them?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setConfirmAccountOpen(false);
                            pendingModalContinueRef.current = null;
                        }} className="px-4 py-2 mt-3 bg-[#1b1b1b] text-white border border-[#3E3E3E] cursor-pointer transition duration-175 hover:bg-[#222222]" style={{ borderRadius: 8, fontSize: 15 }}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setConfirmAccountOpen(false);
                            try {
                                if (pendingModalContinueRef.current) {
                                    pendingModalContinueRef.current();
                                    pendingModalContinueRef.current = null;
                                } else if (pendingAccountContinueRef.current) {
                                    setAccountSettingsOpen(false);
                                    try { pendingAccountContinueRef.current(); } catch { /* Ignore callback errors */ }
                                    pendingAccountContinueRef.current = null;
                                } else {
                                    setAccountSettingsOpen(false);
                                }
                            } catch {
                                setAccountSettingsOpen(false);
                            }
                        }} className="px-4 py-2 mt-3 bg-white text-black hover:bg-[#e2e2e2] rounded cursor-pointer transition duration-175" style={{ borderRadius: 8, fontSize: 15 }}>
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            {/* Transient bottom-centered alert that slides up when editing community markers */}
            {/* centralized dashboard alerts (edit/valid/saved) */}
            <DashboardAlerts ref={alertsRef} editBoundaryOpen={editBoundaryOpen} canSave={canSave} savedTrigger={savedTrigger} savedMessage={savedMessage} onViewLogs={() => console.log('View Logs clicked')} showViewLogs={savedShowViewLogs} />

            {/* Chatbot Drawer - Right Side */}
            <ChatbotDrawer isOpen={chatbotOpen} onClose={() => setChatbotOpen(false)} />

        </div>
    );
}
