import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityStreams } from '@/shared/api/client';
import { boundsOf, useBaseMap } from '@/shared/map/useBaseMap';
import { gpsTrack, nearestPointIndex } from '../../lib/gpsTrack';
import { addRouteLayers, markerData } from './routeMapLayers';

/** Nearest point must be within this many screen pixels of the pointer to count as hovering the route. */
const HOVER_RADIUS_PX = 24;

type RouteMapProps = {
  stream: ActivityStreams;
  /** Seconds into the ride to place the marker at, or null for no marker. */
  markerTime: number | null;
  /** Called with the hovered point's time, or null when the pointer leaves the route. */
  onHoverTime: (seconds: number | null) => void;
};

/**
 * The full-resolution route of one ride, synced with the ride charts: `markerTime` places
 * a marker, and hovering the route reports the nearest point's time via `onHoverTime`.
 */
export const RouteMap = ({ stream, markerTime, onHoverTime }: RouteMapProps) => {
  const container = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const track = useMemo(() => gpsTrack(stream), [stream]);
  const bounds = useMemo(() => boundsOf(track.coordinates), [track]);
  const hasRoute = track.coordinates.length >= 2;

  // The latest marker time, for when the style (re)loads and the layers are added again.
  const markerTimeRef = useRef(markerTime);
  markerTimeRef.current = markerTime;

  const addLayers = useCallback(
    (map: MapLibreMap) => {
      if (hasRoute) addRouteLayers(map, track, markerTimeRef.current);
    },
    [track, hasRoute],
  );

  const map = useBaseMap(container, { bounds, onStyle: addLayers });

  useEffect(() => {
    const source = map?.getSource('marker') as GeoJSONSource | undefined;
    source?.setData(markerData(track, markerTime));
  }, [map, markerTime, track]);

  // Route hover -> nearest point's time, so the charts can follow.
  useEffect(() => {
    if (!map || track.times.length === 0) return;

    const onMove = (event: MapMouseEvent) => {
      const project = (i: number) => map.project(track.coordinates[i]!);
      const index = nearestPointIndex(track.times.length, project, event.point, HOVER_RADIUS_PX);
      map.getCanvas().style.cursor = index === null ? '' : 'crosshair';
      onHoverTime(index === null ? null : track.times[index]!);
    };
    const onOut = () => onHoverTime(null);

    map.on('mousemove', onMove);
    map.on('mouseout', onOut);
    return () => {
      map.off('mousemove', onMove);
      map.off('mouseout', onOut);
    };
  }, [map, track, onHoverTime]);

  useEffect(() => {
    if (!isFullScreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullScreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullScreen]);

  if (!hasRoute) return <p className="text-sm text-ink-3">No GPS track recorded.</p>;

  return (
    <div className={isFullScreen ? 'fixed inset-0 z-50 bg-surface-0' : 'relative'}>
      <div
        ref={container}
        role="region"
        aria-label="Route map. Hover the route to see the ride data at that point."
        className={isFullScreen ? 'h-full w-full' : 'h-72 w-full overflow-hidden rounded-lg sm:h-96'}
      />
      <button
        type="button"
        onClick={() => setIsFullScreen((current) => !current)}
        className="absolute left-2 top-2 rounded-md border border-line bg-surface-1 px-2.5 py-1 text-xs font-medium text-ink shadow-sm hover:bg-surface-0"
      >
        {isFullScreen ? 'Close full screen' : 'Full screen'}
      </button>
    </div>
  );
};
