import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

mapboxgl.accessToken = "pk.eyJ1Ijoicm9kZWxsbCIsImEiOiJjbWU0OXNvb2gwYnM0MnpvbXNueXo2dzhxIn0.Ep43_IxVhaPhEqWBaAuuyA";

export function LandingHero({ showSearch, setShowSearch }: { showSearch: boolean, setShowSearch: (show: boolean) => void }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<{
    lng: number;
    lat: number;
    screen: { x: number; y: number };
  } | null>(null);
  const [mapFeatures, setMapFeatures] = useState<GeoJSON.Feature<GeoJSON.Point>[]>([]);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const featuresRef = useRef<GeoJSON.Feature<GeoJSON.Point>[]>(mapFeatures);

  // Fetch terminals data for map
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/terminals/map`);
        const data = await response.json();
        if (data.features && Array.isArray(data.features)) {
          setMapFeatures(data.features);
        }
      } catch (error) {
        console.error("Error fetching map data:", error);
        // Keep empty array as fallback
      }
    };

    fetchMapData();
  }, []);

  // Keep featuresRef in sync so the map init can read the latest snapshot
  useEffect(() => { featuresRef.current = mapFeatures; }, [mapFeatures]);

  // Initialize the map once (render base map even if features are empty). We'll
  // add an initially-empty 'signals' source and update it later when data arrives.
  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) return; // already initialized

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12', // mapbox://styles/mapbox/outdoors-v12
      center: [121.056764, 14.756603],
      zoom: 10,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });
    mapRef.current = map;

    // Enable perspective rotation with right-click + drag
    map.dragRotate.enable();
    // Enable two-finger touch rotate/pitch on touch devices
    if (map.touchZoomRotate && 'enableRotation' in map.touchZoomRotate && typeof map.touchZoomRotate.enableRotation === 'function') {
      map.touchZoomRotate.enableRotation();
    }

    // Prepare data and layers once the style is loaded
    map.on("load", () => {
      const cinematicEasing = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // Add flood heatmap layer using Mapbox tileset
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
          }, "waterway-label");
        }
      } catch (e) {
        console.warn("[LandingHero] could not add flood polygons", e);
      }

      // Use the latest snapshot of features (may be empty)
      const features = featuresRef.current;

      // Calculate center point from all terminal coordinates or fallback
      let centerPoint: [number, number] = [121.056764, 14.756603]; // Default fallback
      if (features.length > 0) {
        const avgLng = features.reduce((sum, f) => sum + f.geometry.coordinates[0], 0) / features.length;
        const avgLat = features.reduce((sum, f) => sum + f.geometry.coordinates[1], 0) / features.length;
        centerPoint = [avgLng, avgLat];
      }

      const runCinematic = () => {
        map.flyTo({
          center: centerPoint,
          zoom: 15,
          pitch: 55,
          bearing: -17.6,
          duration: 4500,
          curve: 1.8,
          speed: 0.8,
          easing: cinematicEasing,
          essential: true,
        });
      };
      // // 3D buildings only (no terrain/sky) for performance and clarity
      // const layers = map.getStyle().layers || [];
      // const labelLayerId = layers.find(
      //   (l: any) => l.type === 'symbol' && l.layout && l.layout['text-field']
      // )?.id;

      // if (!map.getLayer('3d-buildings')) {
      //   map.addLayer(
      //     {
      //       id: '3d-buildings',
      //       source: 'composite',
      //       'source-layer': 'building',
      //       type: 'fill-extrusion',
      //       minzoom: 15,
      //       paint: {
      //         'fill-extrusion-color': '#bfc6cf',
      //         'fill-extrusion-height': [
      //           'interpolate', ['linear'], ['zoom'],
      //           15, 0,
      //           15.05, ['case', ['has', 'height'], ['to-number', ['get', 'height']], 12]
      //         ],
      //         'fill-extrusion-base': [
      //           'interpolate', ['linear'], ['zoom'],
      //           15, 0,
      //           15.05, ['case', ['has', 'min_height'], ['to-number', ['get', 'min_height']], 0]
      //         ],
      //         'fill-extrusion-opacity': 0.6
      //       }
      //     } as any,
      //     labelLayerId
      //   );
      // }
      // Use consistent blue color for all signals (online/offline)
      const statusColor = "#6098F4";

      // Add signals source with current features (may be empty). We'll update
      // this source when `mapFeatures` changes.
      map.addSource("signals", {
        type: "geojson",
        data: { type: "FeatureCollection", features } as GeoJSON.FeatureCollection,
      });

      // Pulsing ring for distress (online only)
      map.addLayer({
        id: "signals-pulse",
        type: "circle",
        source: "signals",
        paint: {
          "circle-color": statusColor,
          "circle-radius": 22,
          "circle-opacity": 0,
          "circle-blur": 0.3,
        },
      });

      // Remove heavy 3D drop shadow to match flat app design

      // Concentric rings (outer to inner) using circle layers for stability
      const ringPaint = (opacity: number): mapboxgl.CirclePaint => ({
        "circle-color": statusColor,
        "circle-opacity": opacity,
      });

      map.addLayer({
        id: "signals-ring-3",
        type: "circle",
        source: "signals",
        paint: { ...ringPaint(0.12), "circle-radius": 34 },
      });
      map.addLayer({
        id: "signals-ring-2",
        type: "circle",
        source: "signals",
        paint: { ...ringPaint(0.18), "circle-radius": 24 },
      });
      map.addLayer({
        id: "signals-ring-1",
        type: "circle",
        source: "signals",
        paint: { ...ringPaint(0.26), "circle-radius": 16 },
      });

      // Clean white ring around core for definition
      map.addLayer({
        id: "signals-core-stroke",
        type: "circle",
        source: "signals",
        paint: {
          "circle-color": "#ffffff",
          "circle-radius": 12,
          "circle-opacity": 1,
        },
      });

      // Core dot (20px diameter -> radius 10)
      map.addLayer({
        id: "signals-core",
        type: "circle",
        source: "signals",
        paint: {
          "circle-color": statusColor,
          "circle-radius": 10,
          "circle-opacity": 1,
          "circle-blur": 0,
        },
      });

      // Fit bounds to include all points
      const bounds = new mapboxgl.LngLatBounds();
      features.forEach((f: GeoJSON.Feature<GeoJSON.Point>) => bounds.extend(f.geometry.coordinates as [number, number]));
      if (!bounds.isEmpty()) {
        // After cinematic finishes naturally, gently fit to all markers
        const onEnd = () => {
          map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1400, easing: cinematicEasing as (t: number) => number });
          map.off('moveend', onEnd);
        };
        map.on('moveend', onEnd);
      } else {
        // If no features, just run cinematic to default location
        runCinematic();
      }
      // Animate existing rings (no extra pulse layer)
      let raf = 0;
      const cycleMs = 2200;
      const start = performance.now();
      const tick = () => {
        const t = ((performance.now() - start) % cycleMs) / cycleMs; // 0..1
        const twoPi = Math.PI * 2;

        const r1 = 16 + 2 * Math.sin(twoPi * t);
        const r2 = 24 + 3.5 * Math.sin(twoPi * (t - 0.15));
        const r3 = 34 + 5 * Math.sin(twoPi * (t - 0.3));

        const o1 = 0.26 + 0.12 * Math.max(0, Math.sin(twoPi * t));
        const o2 = 0.18 + 0.10 * Math.max(0, Math.sin(twoPi * (t - 0.15)));
        const o3 = 0.12 + 0.08 * Math.max(0, Math.sin(twoPi * (t - 0.3)));

        map.setPaintProperty("signals-ring-1", "circle-radius", r1);
        map.setPaintProperty("signals-ring-2", "circle-radius", r2);
        map.setPaintProperty("signals-ring-3", "circle-radius", r3);

        map.setPaintProperty("signals-ring-1", "circle-opacity", o1);
        map.setPaintProperty("signals-ring-2", "circle-opacity", o2);
        map.setPaintProperty("signals-ring-3", "circle-opacity", o3);

        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      map.once('remove', () => cancelAnimationFrame(raf));

      // Kick off cinematic once everything is ready. Run it regardless of
      // whether there are features so the map animation starts the same way.
      runCinematic();

      // Click interactions to open popover
      const clickableLayers = ["signals-core", "signals-core-stroke", "signals-ring-1", "signals-ring-2", "signals-ring-3"];
      clickableLayers.forEach((layerId) => {
        map.on('click', layerId, (e: mapboxgl.MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f) return;
          const geom = f.geometry as GeoJSON.Point;
          const coord = (geom?.coordinates as [number, number]) || [e.lngLat.lng, e.lngLat.lat];
          // Center the map to the clicked signal with cinematic animation
          map.flyTo({
            center: coord,
            zoom: 17,
            pitch: 55,
            bearing: -17.6,
            duration: 1500,
            curve: 1.8,
            speed: 0.8,
            easing: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
            essential: true
          });
          const pt = map.project(coord);
          setPopover({ lng: coord[0], lat: coord[1], screen: { x: pt.x, y: pt.y } });
          // Fill content from feature properties if present
          try {
            const p = f.properties || {};
            const name = p.name || 'Community';
            const address = p.address || '—';
            const date = p.date || '—';
            const titleEl = document.querySelector('#rw-popover-title');
            const addrEl = document.querySelector('#rw-popover-address');
            const dateEl = document.querySelector('#rw-popover-date');
            if (titleEl) titleEl.textContent = String(name);
            if (addrEl) addrEl.textContent = String(address);
            if (dateEl) dateEl.textContent = String(date);
          } catch { /* Ignore animation errors */ }
        });
        map.on('mouseenter', layerId, () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', layerId, () => (map.getCanvas().style.cursor = ''));
      });

      // Keep popover anchored while moving
      map.on('move', () => {
        setPopover((curr) => {
          if (!curr) return curr;
          const pt = map.project([curr.lng, curr.lat]);
          return { ...curr, screen: { x: pt.x, y: pt.y } };
        });
      });
    });

    // Clean up on unmount
    return () => {
      try {
        map.remove();
      } catch { /* ignore */ }
      mapRef.current = null;
    };
  }, []);

  // When features change, update the 'signals' source data but do NOT re-run
  // the cinematic or recreate the map. This ensures the base map and cinematic
  // behavior are identical whether or not data existed at load time.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const src = map.getSource('signals') as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData({ type: 'FeatureCollection', features: mapFeatures } as GeoJSON.FeatureCollection);
      }
    } catch {
      // source might not be ready yet; ignore
    }
  }, [mapFeatures]);

  return (
    <main className="flex flex-1 flex-col md:flex-row items-center justify-between px-20 md:px-48 gap-8 md:gap-16 w-full relative" style={{ overflow: 'hidden', zIndex: 20, position: 'relative' }}>
      {/* Left Side */}
      <div className="w-full md:w-3/5 flex flex-col justify-center gap-4 items-start md:items-start max-w-2xl">
        <h1
          className="text-[40px] md:text-[55px] font-bold mb-6 leading-tight"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #BFBFBF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent"
          }}
        >
          Stronger Signals,<br />Safer Communities
        </h1>
        <p className="mb-8 text-[20px] text-gray-300 leading-relaxed" >
          A simple, reliable terminal powered by LoRa—helping <br />
          <span style={{ display: 'inline-block', height: '1.5em' }}></span>
          communities send SOS alerts, share updates, and guide rescuers<br />
          <span style={{ display: 'inline-block', height: '1.5em' }}></span>
          when flooding strikes.
        </p>
        {/* Animated transition between button and search UI */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 350, minHeight: 56, overflow: 'hidden' }}>
          {/* Button (hidden when search is shown) */}
          <Button
            className={`bg-white text-black text-lg shadow px-6 py-3 hover:bg-gray-200 hover:shadow-lg transition-all duration-500 cursor-pointer flex items-center justify-center ${showSearch ? 'opacity-0 pointer-events-none translate-x-32' : 'opacity-100 translate-x-0'}`}
            style={{ width: 'auto', height: 'auto', position: 'absolute', left: 0, top: 0, transition: 'all 0.5s cubic-bezier(.4,0,.2,1), transform 0.5s cubic-bezier(.4,0,.2,1)' }}
            onClick={() => setShowSearch(true)}
          >
            Am I part of a community?
          </Button>
          {/* Search UI (shown when search is triggered) */}
          <div
            className={`flex items-center bg-white border border-gray-300 rounded-full px-4 py-2 gap-2 shadow transition-all duration-500 ${showSearch ? 'opacity-100 translate-x-0' : 'opacity-0 pointer-events-none -translate-x-32'}`}
            style={{ width: '100%', position: 'absolute', left: 0, top: 0, minHeight: 56, transition: 'all 0.5s cubic-bezier(.4,0,.2,1), transform 0.5s cubic-bezier(.4,0,.2,1)' }}
          >
            {/* Location icon */}
            <span style={{ display: 'flex', alignItems: 'center', color: '#2563eb', fontSize: 22 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24"><path fill="#2563eb" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 6.25 12.25 6.53 12.53.29.29.76.29 1.06 0C12.75 21.25 19 14.25 19 9c0-3.87-3.13-7-7-7zm0 17.88C10.09 17.07 7 13.19 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 4.19-3.09 8.07-5 10.88z"></path><circle cx="12" cy="9" r="2.5" fill="#2563eb" /></svg>
            </span>
            <input
              type="text"
              placeholder="Search Location"
              className="flex-1 outline-none bg-transparent text-black text-base px-2"
              style={{ border: 'none', minWidth: 0 }}
            />
            <button
              className="bg-[#2563eb] rounded-full p-2 flex items-center justify-center hover:bg-blue-700 transition"
              style={{ border: 'none' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2" /><path stroke="#fff" strokeWidth="2" strokeLinecap="round" d="M20 20l-3-3" /></svg>
            </button>
          </div>
        </div>
      </div>
      {/* Right Side Hero Section Background */}
      <div className="w-full md:w-[53.6%] mt-8 md:mt-0" style={{ position: 'relative', zIndex: 1 }}>
        <div
          className="overflow-hidden"
          style={{
            width: 1021,
            height: 704,
            position: 'relative',
            zIndex: 1,
            borderTopLeftRadius: '66px',
            borderBottomLeftRadius: '66px',
            borderTopRightRadius: '0px',
            borderBottomRightRadius: '0px',
            borderLeft: '14px solid #292929',
            borderTop: '14px solid #292929',
            borderBottom: '14px solid #292929',
            boxShadow: '0 0 0 1px #222'
          }}
          ref={mapContainer}
        >
          {/* Mapbox map will render here */}
          {popover && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${popover.screen.x - 185}px, ${popover.screen.y - 195}px)`,
              zIndex: 50,
              pointerEvents: 'none'
            }}>
              <div style={{ position: 'relative', minWidth: 370, maxWidth: 390 }}>
                <div
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    padding: '22px 18px 16px 18px',
                    fontFamily: 'inherit',
                  }}
                >
                  {/* Close button top right */}
                  <button
                    onClick={() => setPopover(null)}
                    style={{
                      position: 'absolute',
                      top: 11,
                      right: 22,
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      fontSize: 28,
                      cursor: 'pointer',
                      zIndex: 2,
                      pointerEvents: 'auto'
                    }}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                  <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 18 }} id="rw-popover-title">PETUNAI HOA</div>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 18 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'start', width: '100%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: 15, width: 140 }}>Address</div>
                        <div id="rw-popover-address" style={{ fontSize: 14, textAlign: "right", flex: 1, wordBreak: 'break-word' }}>Petunia Street, Block<br />23 Lot 3 Phase 5</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'start', width: '100%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: 15, width: 140 }}>Date Registered</div>
                        <div id="rw-popover-date" style={{ fontSize: 14, textAlign: "right", flex: 1, wordBreak: 'break-word' }}>September 9 2025</div>
                      </div>
                    </div>
                  </div>
                  {/* Downward pointer/arrow */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bottom: '-24px',
                      width: 0,
                      height: 0,
                      borderLeft: '20px solid transparent',
                      borderRight: '20px solid transparent',
                      borderTop: '24px solid rgba(0,0,0,0.7)',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}