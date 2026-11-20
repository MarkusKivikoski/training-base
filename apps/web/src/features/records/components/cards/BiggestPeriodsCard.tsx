import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { Card } from '@/shared/ui/Card';
import { MEDAL_BG } from '@/shared/ui/medals';
import { PERIOD_KINDS, PERIOD_MEASURES } from '../../constants';
import type { RecordEntry, RecordsScope } from '../../types';
import { RankedValue } from '../podium/RankedValue';

type BiggestPeriodsCardProps = {
  scope: RecordsScope;
  discipline: Discipline;
};

type PeriodPodiumProps = {
  label: string;
  entries: readonly RecordEntry[];
  format: (value: number) => string;
  periodName: (date: string) => string;
};

const PeriodPodium = ({ label, entries, format, periodName }: PeriodPodiumProps) => (
  <div>
    <p className="mb-1 text-xs text-ink-3">{label}</p>
    {entries.length === 0 ? (
      <p className="text-sm text-ink-3">—</p>
    ) : (
      <div className="space-y-1.5">
        {entries.map((entry, i) => (
          <div key={entry.date} className={`flex items-baseline gap-2 rounded-md px-2 py-0.5 text-sm ${MEDAL_BG[i]}`}>
            <RankedValue rank={i} value={format(entry.value)} />
            <span className="truncate text-xs text-ink-3">{periodName(entry.date)}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

/** Biggest week / month / year by hours, distance, elevation and rides (or runs); the top entry is emphasised. */
export const BiggestPeriodsCard = ({ scope, discipline }: BiggestPeriodsCardProps) => {
  const words = DISCIPLINE_WORDS[discipline];
  const countText = (count: number) => `${count} ${count === 1 ? words.one : words.many}`;

  return (
    <Card title="Biggest periods" className="lg:col-span-2">
      <div className="space-y-4">
        {PERIOD_KINDS.map((kind) => {
          const podiums = scope.periods[kind.key];
          if (!podiums) return null;
          return (
            <section key={kind.key}>
              <h3 className="mb-2 text-xs font-medium text-ink-2">Biggest {kind.label.toLowerCase()}</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {PERIOD_MEASURES.map((measure) => (
                  <PeriodPodium
                    key={measure.key}
                    label={measure.label}
                    entries={podiums[measure.key]}
                    format={measure.format}
                    periodName={kind.name}
                  />
                ))}
                <PeriodPodium
                  label={words.titleMany}
                  entries={podiums.rides}
                  format={countText}
                  periodName={kind.name}
                />
              </div>
            </section>
          );
        })}
        <p className="text-xs text-ink-3">
          All {words.many}, indoor and outdoor. Weeks run Monday to Sunday. Moving time as on Trends.
        </p>
      </div>
    </Card>
  );
};
