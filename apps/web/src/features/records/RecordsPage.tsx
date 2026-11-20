import { getRouteApi } from '@tanstack/react-router';
import { useRecords } from '@/shared/api/records';
import { disciplineOfParam, sportSearch, type Discipline } from '@/shared/lib/discipline';
import { DisciplineToggle } from '@/shared/ui/DisciplineToggle';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { Toggle } from '@/shared/ui/Toggle';
import { BiggestPeriodsCard } from './components/cards/BiggestPeriodsCard';
import { BreaksCard } from './components/cards/BreaksCard';
import { ClimbRecordsCard } from './components/cards/ClimbRecordsCard';
import { FastestEffortsCard } from './components/cards/FastestEffortsCard';
import { PowerBestsCard } from './components/cards/PowerBestsCard';
import { RideHighsCard } from './components/cards/RideHighsCard';
import { SpeedDistanceCard } from './components/cards/SpeedDistanceCard';
import { StreaksCard } from './components/cards/StreaksCard';

const route = getRouteApi('/records');

/** Personal records for rides (the default) or runs, all time or for one year. */
export const RecordsPage = () => {
  const { year, sport } = route.useSearch();
  const navigate = route.useNavigate();
  const discipline = disciplineOfParam(sport);
  const records = useRecords(year, discipline);

  if (records.isPending) return <Loading />;
  if (records.error) return <ErrorMessage error={records.error} />;

  const { scope, years } = records.data;
  const isCycling = discipline === 'cycling';
  const periodLabel = year ? String(year) : 'all time';
  const periodOptions = [
    { value: 'all', label: 'All time' },
    ...years.map((option) => ({ value: String(option), label: String(option) })),
  ];
  const showPeriod = (value: string) =>
    void navigate({
      search: { ...sportSearch(discipline), ...(value === 'all' ? {} : { year: Number(value) }) },
      replace: true,
    });
  // The other sport may have no records in the chosen year, so switching goes back to all time.
  const showDiscipline = (next: Discipline) => void navigate({ search: sportSearch(next), replace: true });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Records</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DisciplineToggle value={discipline} onChange={showDiscipline} />
          {years.length > 0 && (
            <Toggle
              label="Records period"
              value={year ? String(year) : 'all'}
              onChange={showPeriod}
              options={periodOptions}
            />
          )}
        </div>
      </div>

      {scope ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FastestEffortsCard scope={scope} periodLabel={periodLabel} discipline={discipline} />
          <SpeedDistanceCard scope={scope} discipline={discipline} />
          <RideHighsCard scope={scope} discipline={discipline} />
          {isCycling && <ClimbRecordsCard scope={scope} periodLabel={periodLabel} year={year} />}
          {isCycling && <PowerBestsCard scope={scope} />}
          <BiggestPeriodsCard scope={scope} discipline={discipline} />
          <StreaksCard scope={scope} discipline={discipline} />
          <BreaksCard scope={scope} year={year} discipline={discipline} />
        </div>
      ) : (
        <p className="text-sm text-ink-3">
          No records yet. Run <code>npm run sync</code>, then <code>npm run rebuild</code>.
        </p>
      )}
    </div>
  );
};
