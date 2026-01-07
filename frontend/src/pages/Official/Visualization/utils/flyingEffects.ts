// utils/flyingEffects.ts
// Utility functions for map flyTo animations and cinematic entrance
import type { Signal } from "../types/signals";

export function flyToSignal(map: mapboxgl.Map, coord: Signal["coordinates"]) {
  map.flyTo({
    center: coord,
    zoom: 17,
    pitch: 55,
    bearing: -17.6,
    duration: 1200,
    curve: 1.8,
    speed: 0.8,
    easing: (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    essential: true,
  });
}

export function cinematicMapEntrance(
  map: mapboxgl.Map,
  coord: Signal["coordinates"],
) {
  map.flyTo({
    center: coord,
    zoom: 14,
    pitch: 20,
    bearing: 5,
    duration: 4000,
    curve: 1.8,
    speed: 0.8,
    essential: true,
  });
}
