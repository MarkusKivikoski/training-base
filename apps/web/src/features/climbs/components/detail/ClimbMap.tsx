import type { Map as MapLibreMap } from 'maplibre-gl';
import { useCallback, useMemo, useRef } from 'react';
import { cssVar } from '@/shared/charts/chartTheme';
import { boundsOf, useBaseMap } from '@/shared/map/useBaseMap';

type ClimbPath = ReadonlyArray<readonly [number, number]>;

type ClimbMapProps = {
  /** [lng, lat] from the bottom of the climb to the top. */
  path: ClimbPath;
};

const endPoint = (coordinates: readonly [number, number], isTop: boolean) => ({
  type: 'Feature' as const,
  properties: { end: isTop },
  geometry: { type: 'Point' as const, coordinates: [coordinates[0], coordinates[1]] },
});

/** The climb's line, a hollow dot at the bottom and a filled dot at the top. */
const addClimbLayers = (map: MapLibreMap, path: ClimbPath) => {
  const lineColor = cssVar('--series-2');
  const surface = cssVar('--surface-1');

  map.addSource('climb', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: path.map((point) => [point[0], point[1]]) },
    },
  });
  map.addLayer({
    id: 'climb-line',
    type: 'line',
    source: 'climb',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': lineColor, 'line-width': 5 },
  });

  map.addSource('climb-ends', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [endPoint(path[0]!, false), endPoint(path.at(-1)!, true)] },
  });
  map.addLayer({
    id: 'climb-ends',
    type: 'circle',
    source: 'climb-ends',
    paint: {
      'circle-radius': 6,
      'circle-color': ['case', ['get', 'end'], lineColor, surface],
      'circle-stroke-color': ['case', ['get', 'end'], surface, lineColor],
      'circle-stroke-width': 2.5,
    },
  });
};

/** One climb on a map: hollow dot at the bottom, filled dot at the top. */
export const ClimbMap = ({ path }: ClimbMapProps) => {
  const container = useRef<HTMLDivElement>(null);
  const bounds = useMemo(() => boundsOf(path), [path]);
  const hasLine = path.length >= 2;

  const addLayers = useCallback(
    (map: MapLibreMap) => {
      if (hasLine) addClimbLayers(map, path);
    },
    [path, hasLine],
  );

  useBaseMap(container, { bounds, onStyle: addLayers });

  if (!hasLine) return <p className="text-sm text-ink-3">No GPS line for this climb.</p>;

  return (
    <div
      ref={container}
      role="region"
      aria-label="Map of the climb. Hollow dot: bottom, filled dot: top."
      className="h-64 w-full overflow-hidden rounded-lg sm:h-80"
    />
  );
};
