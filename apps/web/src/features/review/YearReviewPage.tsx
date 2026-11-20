import { getRouteApi } from '@tanstack/react-router';
import { useRecords } from '@/shared/api/records';
import { useStatus } from '@/shared/api/status';
import { DISCIPLINE_WORDS, disciplineOfParam, sportSearch, type Discipline } from '@/shared/lib/discipline';
import { DisciplineToggle } from '@/shared/ui/DisciplineToggle';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { Toggle } from '@/shared/ui/Toggle';
import { YearReview } from './components/YearReview';

const route = getRouteApi('/review');

/** A year's riding (or running) summarised: totals against the year before, month by month, highlights, the map. */
export const YearReviewPage = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const discipline = disciplineOfParam(search.sport);
  const status = useStatus();
  const records = useRecords(undefined, discipline);
  const today = status.data?.today;
  const years = records.data?.years ?? [];
  const year = search.year ?? (today ? Number(today.slice(0, 4)) : years[0]);

  // The sport toggle stays in every state, so a sport without activities can be switched away from.
  const showDiscipline = (next: Discipline) => void navigate({ search: sportSearch(next), replace: true });
  const showYear = (value: string) =>
    void navigate({ search: { ...sportSearch(discipline), year: Number(value) }, replace: true });
  const yearOptions = [...years]
    .sort((first, second) => first - second)
    .map((option) => ({ value: String(option), label: String(option) }));

  const isLoading = status.isPending || records.isPending;
  const hasNothingToReview = !isLoading && (years.length === 0 || !today);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{year ?? 'Year'} in review</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DisciplineToggle value={discipline} onChange={showDiscipline} />
          {year !== undefined && yearOptions.length > 0 && (
            <Toggle label="Year" value={String(year)} onChange={showYear} options={yearOptions} />
          )}
        </div>
      </div>
      {isLoading && <Loading />}
      {records.error && <ErrorMessage error={records.error} />}
      {hasNothingToReview && !records.error && (
        <p className="text-sm text-ink-3">No {DISCIPLINE_WORDS[discipline].many} yet.</p>
      )}
      {/* Keyed by year and sport, so switching either starts from a clean state. */}
      {!isLoading && !records.error && !hasNothingToReview && year !== undefined && today && (
        <YearReview key={`${year}-${discipline}`} year={year} today={today} discipline={discipline} />
      )}
    </div>
  );
};
