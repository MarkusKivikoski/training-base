import { goalProgress, periodBounds } from '@app/metrics';
import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { useActivities } from '@/shared/api/activities';
import { useGoals } from '../../api';
import { GoalEditor } from './GoalEditor';
import { GoalRow } from './GoalRow';

type GoalsCardProps = {
  today: string;
};

/**
 * Riding goals: progress this week/month/year against an even pace, with what's still needed,
 * and an editor. Goals live in settings/goals.json.
 */
export const GoalsCard = ({ today }: GoalsCardProps) => {
  const goals = useGoals();
  const [isEditing, setIsEditing] = useState(false);
  const list = goals.data ?? [];

  // Rides from the earliest period start any goal needs (a week can begin in the previous year).
  const from = [periodBounds('year', today).start, periodBounds('week', today).start].sort()[0]!;
  const rides = useActivities({ sport: 'cycling', from, limit: 1000 }, { enabled: list.length > 0 });

  if (goals.isPending) return null;

  const editButton = (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-xs text-ink-2 hover:text-ink hover:underline"
    >
      {list.length > 0 ? 'Edit goals' : 'Set a goal'}
    </button>
  );

  return (
    <Card title="Goals" className="sm:col-span-2 xl:col-span-4" action={isEditing ? undefined : editButton}>
      {goals.error && <ErrorMessage error={goals.error} />}
      {isEditing && <GoalEditor goals={list} onDone={() => setIsEditing(false)} />}
      {!isEditing && list.length === 0 && (
        <p className="text-sm text-ink-3">
          No goals yet. Set one, e.g. 3,000 km this year or 6 h per week, to see your progress against an even pace.
        </p>
      )}
      {!isEditing && list.length > 0 && (
        <ul className="divide-y divide-line">
          {list.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              progress={rides.data ? goalProgress(rides.data.items, goal, today) : null}
            />
          ))}
        </ul>
      )}
    </Card>
  );
};
