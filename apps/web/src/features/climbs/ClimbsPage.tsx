import { getRouteApi } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useClimbs } from '@/shared/api/climbs';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { Toggle } from '@/shared/ui/Toggle';
import { ClimbsTable } from './components/list/ClimbsTable';
import { isRecurring, listedClimbs, type SortKey } from './lib/climbList';

const route = getRouteApi('/climbs');

/** Every climb found in outdoor rides: the ones ridden more than once by default, sortable. */
export const ClimbsPage = () => {
  const { show } = route.useSearch();
  const navigate = route.useNavigate();
  const climbs = useClimbs();
  const [sort, setSort] = useState<SortKey>('rides');
  const showAll = show === 'all';

  const rows = useMemo(() => listedClimbs(climbs.data?.climbs ?? [], showAll, sort), [climbs.data, showAll, sort]);

  if (climbs.isPending) return <Loading />;
  if (climbs.error) return <ErrorMessage error={climbs.error} />;

  const total = climbs.data.climbs.length;
  const recurring = climbs.data.climbs.filter(isRecurring).length;
  const showOptions = [
    { value: 'recurring', label: `Ridden 2+ times (${recurring})` },
    { value: 'all', label: `All (${total})` },
  ];
  const changeShow = (value: string) =>
    void navigate({ search: value === 'all' ? { show: 'all' } : {}, replace: true });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Climbs</h1>
        <Toggle label="Which climbs" value={show ?? 'recurring'} onChange={changeShow} options={showOptions} />
      </div>

      <Card>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-3">No climbs yet. Climbs are found in outdoor rides with GPS and elevation.</p>
        ) : (
          <ClimbsTable climbs={rows} sort={sort} onSort={setSort} />
        )}
        <p className="mt-3 text-xs text-ink-3">
          Found automatically in outdoor rides: 15 m or more of gain at 3% or steeper over at least 300 m. A climb is
          defined by the first ride it was found in, and every later pass over the same start and end points counts as
          an effort (elapsed time, stops included), like Strava segments but from your own rides only. Rides (×) counts
          repeats within one ride.
        </p>
      </Card>
    </div>
  );
};
