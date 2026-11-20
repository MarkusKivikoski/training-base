import { Link } from '@tanstack/react-router';
import type { ClimbSummary, RecordsResponse, Trends } from '@/shared/api/client';
import { DISCIPLINE_WORDS, sportSearch, type Discipline } from '@/shared/lib/discipline';
import { Card } from '@/shared/ui/Card';
import { yearHighlights } from '../../lib/highlights';
import { HighlightDetailText } from './HighlightDetailText';

type HighlightsCardProps = {
  year: number;
  scope: NonNullable<RecordsResponse['scope']>;
  maxHr: Trends['maxHr'][number] | null;
  newClimbs: readonly ClimbSummary[];
  discipline: Discipline;
};

/** The year's records worth celebrating, from the Records page's view of that year. */
export const HighlightsCard = ({ year, scope, maxHr, newClimbs, discipline }: HighlightsCardProps) => (
  <Card title={`Highlights of ${year}`}>
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
      {yearHighlights({ scope, maxHr, newClimbs, discipline }).map((highlight) => (
        <div key={highlight.label}>
          <dt className="text-xs text-ink-2">{highlight.label}</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{highlight.value}</dd>
          <dd className="truncate text-xs text-ink-3">
            <HighlightDetailText detail={highlight.detail} />
          </dd>
        </div>
      ))}
    </dl>
    <p className="mt-3 text-xs text-ink-3">
      From the {year} view of{' '}
      <Link to="/records" search={{ year, ...sportSearch(discipline) }} className="underline hover:text-ink">
        Records
      </Link>
      . Speed and distance count outdoor {DISCIPLINE_WORDS[discipline].many}; time
      {discipline === 'cycling' ? ' and power count' : ' counts'} all {DISCIPLINE_WORDS[discipline].many}.
    </p>
  </Card>
);
