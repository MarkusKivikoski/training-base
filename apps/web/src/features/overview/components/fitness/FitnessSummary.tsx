import type { DayStatus } from '@app/metrics';
import { formatLoad } from '@/shared/lib/formatters';
import { LOAD_EXPLANATIONS } from '../../constants';
import { changeSinceWeekAgo, type FitnessRow } from '../../lib/fitnessRows';
import { formatRatio, formatSignedPercent } from '../../lib/zoneText';
import { StatusChip } from '../StatusChip';
import { LoadTile } from './LoadTile';

type FitnessSummaryProps = {
  today: FitnessRow;
  weekAgo: FitnessRow | undefined;
};

const fitnessDetail = (status: DayStatus) =>
  status.fitness.baseline ? undefined : `${formatLoad(status.fitness.value, true)} / week`;

const fatigueDetail = (status: DayStatus) =>
  status.fatigue.baseline ? undefined : `${formatRatio(status.fatigue.value)} fitness`;

const formDetail = (status: DayStatus) =>
  status.form.baseline ? undefined : `${formatSignedPercent(status.form.value)} of fitness`;

/** Today's fitness, fatigue and form, each with its change over 7 days and its status. */
export const FitnessSummary = ({ today, weekAgo }: FitnessSummaryProps) => {
  const { status } = today;

  return (
    <dl className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <LoadTile
        label="Fitness (CTL)"
        explanation={LOAD_EXPLANATIONS.ctl}
        value={today.ctl}
        changeSinceWeekAgo={changeSinceWeekAgo(today, weekAgo, 'ctl')}
      >
        <StatusChip status={status.fitness} baselineUntil={status.baselineUntil} detail={fitnessDetail(status)} />
      </LoadTile>
      <LoadTile
        label="Fatigue (ATL)"
        explanation={LOAD_EXPLANATIONS.atl}
        value={today.atl}
        changeSinceWeekAgo={changeSinceWeekAgo(today, weekAgo, 'atl')}
      >
        <StatusChip status={status.fatigue} baselineUntil={status.baselineUntil} detail={fatigueDetail(status)} />
      </LoadTile>
      <LoadTile
        label="Form (TSB)"
        explanation={LOAD_EXPLANATIONS.tsb}
        value={today.tsb}
        changeSinceWeekAgo={changeSinceWeekAgo(today, weekAgo, 'tsb')}
        signed
      >
        <StatusChip status={status.form} baselineUntil={status.baselineUntil} detail={formDetail(status)} />
      </LoadTile>
    </dl>
  );
};
