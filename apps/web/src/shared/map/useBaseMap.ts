import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre derives its worker URL from import.meta.url, which Vite's bundling breaks.
// Let Vite bundle the worker and hand MapLibre the resulting URL instead.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useColorScheme } from '@/shared/charts/chartTheme';

maplibregl.setWorkerUrl(workerUrl);

/** OpenFreeMap vector styles: free, no API key. Attribution comes with the style. */
const STYLE_URL = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

export type LngLatBounds = [[number, number], [number, number]];

/** [[minLng, minLat], [maxLng, maxLat]] of all points, or null when there are none. */
export const boundsOf = (points: Iterable<readonly [number, number]>): LngLatBounds | null => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) return null;
  return [
    [minX, minY],
    [maxX, maxY],
  ];
};

/**
 * A MapLibre map in `container`, styled for the current colour scheme. `onStyle` runs every
 * time a style finishes loading (first load and theme switches), because setStyle drops
 * custom sources and layers. Returns the map once its first style has loaded.
 */
export const useBaseMap = (
  container: RefObject<HTMLDivElement | null>,
  { bounds, onStyle }: { bounds: LngLatBounds | null; onStyle?: (map: MapLibreMap) => void },
): MapLibreMap | null => {
  const scheme = useColorScheme();
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const onStyleRef = useRef(onStyle);
  onStyleRef.current = onStyle;
  const initial = useRef({ scheme, bounds });

  useEffect(() => {
    if (!container.current) return;
    const { scheme: s, bounds: b } = initial.current;
    const m = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL[s],
      ...(b ? { bounds: b, fitBoundsOptions: { padding: 32 } } : { center: [24.94, 60.17], zoom: 10 }),
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    // style.load, not load: load waits for every tile and sprite image, which can take a while
    // (or stall on a missing style image), and our layers only need the style.
    m.on('style.load', () => {
      onStyleRef.current?.(m);
      setMap(m);
    });
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      m.remove();
      setMap(null);
    };
  }, [container]);

  // Theme switch: swap the style; `style.load` re-adds our layers.
  const lastScheme = useRef(scheme);
  useEffect(() => {
    if (!map || lastScheme.current === scheme) return;
    lastScheme.current = scheme;
    map.setStyle(STYLE_URL[scheme]);
  }, [map, scheme]);

  // Refit when the data's extent changes (e.g. heatmap filters).
  const boundsKey = bounds ? bounds.flat().join(',') : '';
  useEffect(() => {
    if (map && bounds) map.fitBounds(bounds, { padding: 32, duration: 0 });
    // boundsKey stands in for bounds, so a new array with the same extent does not refit.
  }, [map, boundsKey]);

  return map;
};
