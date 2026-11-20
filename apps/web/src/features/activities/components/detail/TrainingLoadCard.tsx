import type { Activity } from '@/shared/api/client';
import { formatDate, formatTss } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { noPowerLoad, type NoPowerLoad } from '../../lib/trainingLoad';
import { Stat } from './Stat';

type TrainingLoadCardProps = {
  activity: Activity;
  /** Date of the first LTHR entry, for the hints. */
  firstLthr: string | null;
};

/** For activities without power: heart-rate TSS, which is what counts toward training load. */
export const TrainingLoadCard = ({ activity, firstLthr }: TrainingLoadCardProps) => (
  <Card title="Training load">
    <p className="text-sm text-ink-2">No power data for this activity.</p>
    <LoadDetails load={noPowerLoad(activity, firstLthr)} firstLthr={firstLthr} />
  </Card>
);

type LoadDetailsProps = {
  load: NoPowerLoad;
  firstLthr: string | null;
};

const LoadDetails = ({ load, firstLthr }: LoadDetailsProps) => {
  switch (load.kind) {
    case 'hr-tss':
      return (
        <>
          <dl className="mt-3">
            <Stat label="TSS · heart rate" value={formatTss(load.tss)} />
          </dl>
          <p className="mt-2 text-xs text-ink-3">Using LTHR {load.lthr} bpm. Heart-rate TSS is an estimate.</p>
        </>
      );

    case 'hr-indicator':
      return (
        <>
          <dl className="mt-3">
            <Stat label="TSS · heart rate (indicator)" value={formatTss(load.tss)} />
          </dl>
          <p className="mt-2 text-xs text-ink-3">
            Using your cycling LTHR {load.lthr} bpm, so it&apos;s a rough indicator. Not part of cycling fitness; it
            shows in All activities load on the Overview.
          </p>
        </>
      );

    case 'other-sport':
      return (
        <p className="mt-3 text-xs text-ink-3">
          Only rides count toward training load.
          {load.isBeforeFirstLthr && firstLthr
            ? ` Heart-rate load for other activities starts with your first LTHR (${formatDate(firstLthr)}).`
            : ''}
        </p>
      );

    case 'no-heart-rate':
      return <p className="mt-3 text-xs text-ink-3">No heart rate either, so this ride adds no training load.</p>;

    case 'no-lthr':
      return (
        <p className="mt-3 text-xs text-ink-3">
          No LTHR set for this date, so there’s no heart-rate TSS.
          {firstLthr
            ? ` Your first LTHR entry is ${formatDate(firstLthr)}.`
            : ' Add one with npm run settings -- lthr.'}
        </p>
      );
  }
};
