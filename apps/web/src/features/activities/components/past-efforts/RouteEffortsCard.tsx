import { useMemo } from 'react';
import { useGear } from '@/shared/api/gear';
import { useActivityRoute } from '@/shared/api/repeats';
import { Card } from '@/shared/ui/Card';
import { MIN_EFFORTS_FOR_CHART } from '../../constants';
import {
  hasPowerEfforts,
  hasTaggedTyres,
  routeChart,
  routeEffortRows,
  routeTitle,
  routeVerdict,
} from '../../lib/routeEfforts';
import { PastEffortsChart } from './PastEffortsChart';
import { RepeatName } from './RepeatName';
import { RouteEffortsTable } from './RouteEffortsTable';

type RouteEffortsCardProps = {
  activityId: string;
};

/**
 * The route this outdoor ride has followed before: how its speed compares with the earlier
 * efforts and every effort on the route. Power is added (a chart panel, table columns and a line
 * on power per heartbeat) once any effort was ridden with a power meter, and a tyres column once
 * any effort is tagged with its tyres. Renders nothing for a route ridden only once.
 */
export const RouteEffortsCard = ({ activityId }: RouteEffortsCardProps) => {
  const { data: route } = useActivityRoute(activityId);
  const { data: gear } = useGear();
  const rows = useMemo(() => (route ? routeEffortRows(route, activityId, gear) : []), [route, activityId, gear]);
  const chart = useMemo(() => routeChart(rows), [rows]);
  if (!route) return null;

  const current = rows.find((row) => row.isCurrent);
  const verdict = current ? routeVerdict(current.effort, rows.length) : null;
  const showPower = hasPowerEfforts(rows);
  const chartMeasures = showPower ? 'Speed, power and heart rate' : 'Speed and heart rate';

  return (
    <Card title="Same route" className="lg:col-span-3">
      <RepeatName groupId={route.id} name={route.name} title={routeTitle(route)} noun="route" />

      {verdict && (
        <p className="mt-2 text-sm">
          <span className="font-semibold">{verdict.headline}.</span>{' '}
          <span className="text-ink-2">{verdict.detail}</span>
        </p>
      )}
      {verdict?.powerDetail && <p className="mt-1 text-sm text-ink-2">{verdict.powerDetail}</p>}
      {rows.length >= MIN_EFFORTS_FOR_CHART && (
        <PastEffortsChart
          panels={chart.panels}
          points={chart.points}
          ariaLabel={`${chartMeasures} on this route by date, ${rows.length} efforts. The table below lists them.`}
        />
      )}
      <div className="mt-3">
        <RouteEffortsTable rows={rows} activityId={activityId} showPower={showPower} showTyres={hasTaggedTyres(rows)} />
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Rides that follow the same roads from start to finish, the same way round. Speed is distance over moving time,
        so stops don’t count.
        {showPower && ' Power is normalized power, compared only among the rides with a power meter.'}
      </p>
    </Card>
  );
};
