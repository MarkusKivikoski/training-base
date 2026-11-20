import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { Card } from '@/shared/ui/Card';
import { streakDates, streakLength } from '../../lib/recordText';
import type { RecordsScope, Streak } from '../../types';

type StreakStatProps = {
  label: string;
  streak: Streak;
  unit: 'day' | 'week';
};

const StreakStat = ({ label, streak, unit }: StreakStatProps) => (
  <div>
    <dt className="text-xs text-ink-2">{label}</dt>
    <dd className="mt-0.5 text-2xl font-semibold tracking-tight">{streakLength(streak, unit)}</dd>
    {streak && <dd className="text-xs text-ink-3">{streakDates(streak, unit === 'week')}</dd>}
  </div>
);

type StreaksCardProps = {
  scope: RecordsScope;
  discipline: Discipline;
};

/** Longest day and week streaks, and (all time only) the current ones. */
export const StreaksCard = ({ scope, discipline }: StreaksCardProps) => {
  const { streaks } = scope;
  const { one } = DISCIPLINE_WORDS[discipline];
  const hasCurrentStreaks = 'currentDays' in streaks;

  return (
    <Card title="Streaks" className="lg:col-span-2">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StreakStat label="Longest day streak" streak={streaks.days} unit="day" />
        <StreakStat label="Longest week streak" streak={streaks.weeks} unit="week" />
        {hasCurrentStreaks && (
          <>
            <StreakStat label="Current day streak" streak={streaks.currentDays ?? null} unit="day" />
            <StreakStat label="Current week streak" streak={streaks.currentWeeks ?? null} unit="week" />
          </>
        )}
      </dl>
      <p className="mt-3 text-xs text-ink-3">
        Consecutive days with a {one}, and consecutive weeks (Monday to Sunday) with at least one {one}. A current
        streak still counts if your last {one} was yesterday or last week.
      </p>
    </Card>
  );
};
