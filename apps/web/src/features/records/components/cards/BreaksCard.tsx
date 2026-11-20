import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { formatDate, formatDistance } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { breakDetail, breakLength } from '../../lib/recordText';
import type { RecordEntry, RecordsScope } from '../../types';
import { PodiumPlace } from '../podium/PodiumPlace';
import { RideLink } from '../podium/RideLink';

type BreaksCardProps = {
  scope: RecordsScope;
  year: number | undefined;
  discipline: Discipline;
};

const LongestBreaks = ({ breaks }: { breaks: readonly RecordEntry[] }) => {
  if (breaks.length === 0) return <p className="text-sm text-ink-3">—</p>;
  return (
    <div className="space-y-2">
      {breaks.map((entry, i) => (
        <PodiumPlace
          key={entry.id}
          rank={i}
          entry={entry}
          value={breakLength(entry.value)}
          detail={breakDetail(entry)}
        />
      ))}
    </div>
  );
};

/** `value` of a first ride is its distance in metres (0 when it has none). */
const FirstRides = ({ rides }: { rides: readonly RecordEntry[] }) => {
  if (rides.length === 0) return <p className="text-sm text-ink-3">—</p>;
  return (
    <ul className="divide-y divide-line text-sm">
      {rides.map((entry) => (
        <li key={entry.id} className="flex items-baseline gap-3 py-1.5">
          <span className="w-10 shrink-0 font-semibold tabular-nums">{entry.date.slice(0, 4)}</span>
          <span className="w-20 shrink-0 tabular-nums text-ink-2">{formatDate(entry.date)}</span>
          <span className="min-w-0 truncate">
            <RideLink entry={entry}>{entry.name}</RideLink>
          </span>
          {entry.value > 0 && (
            <span className="ml-auto shrink-0 tabular-nums text-ink-3">{formatDistance(entry.value, 1)}</span>
          )}
        </li>
      ))}
    </ul>
  );
};

/** The longest breaks between rides (or runs), and the first one of each year (or of the selected year). */
export const BreaksCard = ({ scope, year, discipline }: BreaksCardProps) => {
  const { one, many } = DISCIPLINE_WORDS[discipline];

  return (
    <Card title={`Breaks & first ${many}`} className="lg:col-span-2">
      <div className="grid gap-5 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-xs font-medium text-ink-2">Longest break between {many}</h3>
          <LongestBreaks breaks={scope.breaks} />
        </section>
        <section>
          <h3 className="mb-2 text-xs font-medium text-ink-2">
            {year ? `First ${one} of ${year}` : `First ${one} of each year`}
          </h3>
          <FirstRides rides={scope.firstRides} />
        </section>
      </div>
      <p className="mt-3 text-xs text-ink-3">
        Breaks count full days without a {one} (other activities don&apos;t end a break), credited to the {one} that
        ended them
        {year ? `; this year's view shows breaks that ended in ${year}` : ''}.
      </p>
    </Card>
  );
};
