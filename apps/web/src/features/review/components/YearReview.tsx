import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { useYearReview } from '../hooks/useYearReview';
import { comparisonLabel, periodNote } from '../lib/yearTotals';
import { ActivityMix } from './ActivityMix';
import { HighlightsCard } from './highlights/HighlightsCard';
import { MonthsCard } from './months/MonthsCard';
import { TotalsGrid } from './TotalsGrid';
import { YearMap } from './YearMap';

type YearReviewProps = {
  year: number;
  today: string;
  discipline: Discipline;
};

/** One year: totals against the year before, month by month, highlights, the map and the activity mix. */
export const YearReview = ({ year, today, discipline }: YearReviewProps) => {
  const review = useYearReview(year, today, discipline);

  if (review.isPending) return <Loading />;
  if (review.error) return <ErrorMessage error={review.error} />;

  return (
    <>
      <p className="text-sm text-ink-2">{periodNote(year, today)}</p>
      <TotalsGrid
        totals={review.totals}
        previousTotals={review.previousTotals}
        previousYear={year - 1}
        comparison={comparisonLabel(year, today)}
        discipline={discipline}
      />

      <MonthsCard year={year} months={review.months} previousMonths={review.previousMonths} discipline={discipline} />

      {review.scope && (
        <HighlightsCard
          year={year}
          scope={review.scope}
          maxHr={review.maxHr}
          newClimbs={review.newClimbs}
          discipline={discipline}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={`Where you ${DISCIPLINE_WORDS[discipline].did} in ${year}`} className="lg:col-span-2">
          <YearMap year={year} discipline={discipline} />
        </Card>
        <Card title="Activity mix">
          <ActivityMix totals={review.mixTotals} />
        </Card>
      </div>
    </>
  );
};
