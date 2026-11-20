import type { Map as MapLibreMap } from 'maplibre-gl';
import { cssVar } from '@/shared/charts/chartTheme';
import { indexAtTime } from '../../lib/streamPoints';
import type { GpsTrack } from '../../lib/gpsTrack';

const pointFeature = (coordinates: [number, number]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'Point' as const, coordinates },
});

const EMPTY_COLLECTION = { type: 'FeatureCollection' as const, features: [] };

/** The marker source's data: the GPS point at `seconds` into the ride, or nothing. */
export const markerData = (track: GpsTrack, seconds: number | null) => {
  if (seconds === null || track.times.length === 0) return EMPTY_COLLECTION;
  const index = indexAtTime(track.times, seconds);
  return { type: 'FeatureCollection' as const, features: [pointFeature(track.coordinates[index]!)] };
};

/** Adds the route line, start and end dots, and the hover marker (shown at `markerTime`). */
export const addRouteLayers = (map: MapLibreMap, track: GpsTrack, markerTime: number | null) => {
  const routeColor = cssVar('--series-2');
  const ink = cssVar('--text-primary');
  const surface = cssVar('--surface-1');
  const start = track.coordinates[0]!;
  const end = track.coordinates.at(-1)!;

  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: track.coordinates },
    },
  });
  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': routeColor, 'line-width': 3.5 },
  });

  map.addSource('ends', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [pointFeature(start), pointFeature(end)] },
  });
  map.addLayer({
    id: 'ends',
    type: 'circle',
    source: 'ends',
    paint: {
      'circle-radius': 5,
      'circle-color': surface,
      'circle-stroke-color': routeColor,
      'circle-stroke-width': 2.5,
    },
  });

  map.addSource('marker', { type: 'geojson', data: markerData(track, markerTime) });
  map.addLayer({
    id: 'marker',
    type: 'circle',
    source: 'marker',
    paint: { 'circle-radius': 6, 'circle-color': ink, 'circle-stroke-color': surface, 'circle-stroke-width': 2 },
  });
};
