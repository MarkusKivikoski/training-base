import { lazy, Suspense } from 'react';
import type { ActivityStreams } from '@/shared/api/client';
import { Card } from '@/shared/ui/Card';
import { Loading } from '@/shared/ui/Loading';

// MapLibre loads only for rides with a GPS track.
const RouteMap = lazy(() => import('./RouteMap').then((module) => ({ default: module.RouteMap })));

type RouteCardProps = {
  stream: ActivityStreams;
  markerTime: number | null;
  onHoverTime: (seconds: number | null) => void;
};

/** The route map card, loading the map code on demand. */
export const RouteCard = ({ stream, markerTime, onHoverTime }: RouteCardProps) => (
  <Card title="Route" className="lg:col-span-3">
    <Suspense fallback={<Loading label="Loading map…" />}>
      <RouteMap stream={stream} markerTime={markerTime} onHoverTime={onHoverTime} />
    </Suspense>
  </Card>
);
