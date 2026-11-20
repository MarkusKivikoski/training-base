import { powerProfile, RIDER_TYPES, type CurvePoint } from '@app/metrics';
import { Card } from '@/shared/ui/Card';
import type { KgForDate } from '../../lib/curveValues';
import { missingProfileDurations } from '../../lib/profileText';
import { ProfileRow } from './ProfileRow';

type RiderProfileCardProps = {
  curve: readonly CurvePoint[];
  kgFor: KgForDate;
  rangeLabel: string;
  hasWeight: boolean;
};

/**
 * Rider type from the shape of the power curve (Coggan's power profile): each key duration's
 * W/kg on a scale from the untrained to the world-class end of the reference ranges.
 */
export const RiderProfileCard = ({ curve, kgFor, rangeLabel, hasWeight }: RiderProfileCardProps) => (
  <Card title={`Rider profile · ${rangeLabel}`} className="mt-4">
    <ProfileBody curve={curve} kgFor={kgFor} hasWeight={hasWeight} />
  </Card>
);

type ProfileBodyProps = Omit<RiderProfileCardProps, 'rangeLabel'>;

const ProfileBody = ({ curve, kgFor, hasWeight }: ProfileBodyProps) => {
  if (!hasWeight) {
    return <p className="text-sm text-ink-3">Add your weight to see your rider profile (it compares W/kg).</p>;
  }

  const profile = powerProfile(curve, kgFor);
  if (!profile) {
    const missing = missingProfileDurations(curve);
    const missingText = missing.length > 0 ? `; missing ${missing.join(', ')}` : '';
    return (
      <p className="text-sm text-ink-3">
        Needs best efforts at 5 s, 1 min, 5 min and 20 min in this range{missingText}.
      </p>
    );
  }

  const riderType = RIDER_TYPES[profile.type];

  return (
    <>
      <p className="text-lg font-semibold text-ink">{riderType.label}</p>
      <p className="mb-4 text-sm text-ink-2">{riderType.description}</p>
      <div className="space-y-3" role="list" aria-label="Power profile by duration">
        {profile.points.map((point) => (
          <ProfileRow
            key={point.key}
            label={point.label}
            wattsPerKg={point.wkg}
            watts={point.watts}
            score={point.score}
          />
        ))}
        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_7.5rem] gap-3 text-[11px] text-ink-3" aria-hidden>
          <span />
          <span className="flex justify-between">
            <span>Untrained</span>
            <span>World class</span>
          </span>
          <span />
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-3">
        After Coggan&apos;s power profile (reference ranges from the men&apos;s table). FTP is 95% of your best 20
        minutes. The shape matters, not the level: it compares which durations are relatively strongest. It only
        reflects efforts you actually went all out on, so a sprint you never did in this range makes you look less of a
        sprinter than you are.
      </p>
    </>
  );
};
