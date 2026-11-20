import { PathLayer } from '@deck.gl/layers';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { useEffect, useMemo, useRef } from 'react';
import type { HeatmapRoutes } from '@/shared/api/client';
import { cssVar, useColorScheme } from '@/shared/charts/chartTheme';
import { formatDate, formatSport } from '@/shared/lib/formatters';
import { boundsOf, useBaseMap } from './useBaseMap';

type Route = HeatmapRoutes['routes'][number];

/** heatmap: overlaps accumulate so often-ridden roads stand out. solid: every ridden road in plain opaque orange. */
export type HeatmapMode = 'heatmap' | 'solid';

/**
 * Line alpha (0–255) for n routes: opaque enough to read a handful of routes, fainter as
 * routes pile up so dense areas build a gradient instead of saturating. Overlap brightness
 * grows with n × alpha, so alpha falls with √n to keep busy areas from going solid.
 */
export const routeAlpha = (routeCount: number, scheme: 'light' | 'dark'): number => {
  const [max, min] = scheme === 'dark' ? [140, 40] : [110, 35];
  return Math.round(Math.min(max, Math.max(min, max * Math.sqrt(20 / Math.max(1, routeCount)))));
};

/** "#2a78d6" -> [42, 120, 214]. */
const hexToRgb = (hex: string): [number, number, number] => {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

type HeatmapMapProps = {
  routes: Route[];
  mode: HeatmapMode;
  /** Called with the activity id when a route is clicked. */
  onOpen: (id: string) => void;
};

/**
 * All routes on one map. In heatmap mode overlaps accumulate (additive glow on the dark map,
 * stacked opacity on the light one), so roads ridden often stand out; in solid mode every ridden
 * road is the same opaque orange. Clicking a route opens that activity.
 */
export const HeatmapMap = ({ routes, mode, onOpen }: HeatmapMapProps) => {
  const container = useRef<HTMLDivElement>(null);
  const scheme = useColorScheme();
  const bounds = useMemo(() => boundsOf(routes.flatMap((route) => route.points)), [routes]);
  const map = useBaseMap(container, { bounds });
  const overlay = useRef<MapboxOverlay | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!map) return;
    // Not interleaved: deck.gl draws on its own canvas above the map, so theme switches keep it.
    const deckOverlay = new MapboxOverlay({
      interleaved: false,
      onError: (err) => console.error('deck.gl', err),
      getCursor: ({ isHovering }) => (isHovering ? 'pointer' : 'grab'),
      getTooltip: ({ object }) => {
        const route = object as Route | null;
        return route ? { text: `${formatDate(route.date)} · ${formatSport(route.sport)}\nClick to open` } : null;
      },
    });
    map.addControl(deckOverlay);
    overlay.current = deckOverlay;
    return () => {
      map.removeControl(deckOverlay);
      overlay.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!overlay.current) return;
    const color = hexToRgb(cssVar('--series-2'));
    const isSolid = mode === 'solid';
    // Dark map: additive, so overlapping routes add light and glow. Light map: normal alpha
    // stacking, so overlaps get more opaque (additive would wash them out to near-white).
    // Solid: plain opaque drawing, overlaps look the same as single routes.
    const destinationFactor = !isSolid && scheme === 'dark' ? 'one' : 'one-minus-src-alpha';

    overlay.current.setProps({
      layers: [
        new PathLayer<Route>({
          id: 'routes',
          data: routes,
          getPath: (route) => route.points,
          getColor: [...color, isSolid ? 255 : routeAlpha(routes.length, scheme)],
          getWidth: !isSolid && routes.length > 100 ? 2 : 3,
          widthUnits: 'pixels',
          capRounded: true,
          jointRounded: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [...hexToRgb(cssVar('--text-primary')), 220],
          onClick: ({ object }) => {
            if (object) onOpenRef.current(object.id);
          },
          parameters: {
            blend: true,
            blendColorOperation: 'add',
            blendColorSrcFactor: 'src-alpha',
            blendColorDstFactor: destinationFactor,
            blendAlphaOperation: 'add',
            blendAlphaSrcFactor: 'one',
            blendAlphaDstFactor: destinationFactor,
            depthWriteEnabled: false,
            depthCompare: 'always',
          },
          updateTriggers: { getColor: [scheme, routes.length, mode], getWidth: [routes.length, mode] },
        }),
      ],
    });
  }, [map, routes, scheme, mode]);

  const mapKind = mode === 'solid' ? 'Map' : 'Heatmap';
  return (
    <div
      ref={container}
      role="region"
      aria-label={`${mapKind} of ${routes.length} outdoor routes. Click a route to open the ride.`}
      className="h-full w-full"
    />
  );
};
