import { Link } from '@tanstack/react-router';
import { DISCIPLINE_WORDS, sportSearch, type Discipline } from '@/shared/lib/discipline';
import { Card } from '@/shared/ui/Card';
import { MEDAL_BG } from '@/shared/ui/medals';
import { useActivityRecords } from '../../api';
import { holdsAllTimeBest, placeLabel, recordRows } from '../../lib/rideRecords';

type ActivityRecordsCardProps = {
  activityId: string;
  /** Whose records the activity can hold: ride records or run records. */
  discipline: Discipline;
};

/**
 * The records this ride or run holds (top 3, all time or in its year), one row per record with each
 * placing as a link to that view of the Records page. Renders nothing when it holds none.
 */
export const ActivityRecordsCard = ({ activityId, discipline }: ActivityRecordsCardProps) => {
  const { data: places } = useActivityRecords(activityId);
  if (!places || places.length === 0) return null;

  const rows = recordRows(places, discipline);
  const recordsSearch = (scope: string) => ({
    ...sportSearch(discipline),
    ...(scope === 'all' ? {} : { year: Number(scope) }),
  });
  const title = holdsAllTimeBest(rows) ? 'Records · includes an all-time best' : 'Records';

  return (
    <Card title={title} className="lg:col-span-3">
      <ul className="divide-y divide-line text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2">
            <span className="min-w-44 font-medium">{row.label}</span>
            <span className="tabular-nums text-ink">{row.value}</span>
            <span className="flex flex-wrap gap-2 sm:ml-auto">
              {row.places.map((place) => {
                const isFirst = place.rank === 1;
                return (
                  <Link
                    key={place.scope}
                    to="/records"
                    search={recordsSearch(place.scope)}
                    className={`rounded-full px-2 py-0.5 text-xs text-ink hover:underline ${MEDAL_BG[place.rank - 1]} ${
                      isFirst ? 'font-semibold' : ''
                    }`}
                  >
                    {placeLabel(place)}
                  </Link>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-3">
        Top-3 placings on the Records page. Speed and distance records count outdoor {DISCIPLINE_WORDS[discipline].many}{' '}
        only.
      </p>
    </Card>
  );
};
