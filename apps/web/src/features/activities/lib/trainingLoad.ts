import type { Activity } from '@/shared/api/client';

/**
 * What the training-load card says about a ride without power:
 * - `hr-tss`: a ride with heart-rate TSS, which counts toward fitness;
 * - `hr-indicator`: another sport with heart-rate TSS, shown only as a rough indicator;
 * - `other-sport`: another sport without heart-rate load;
 * - `no-heart-rate`: a ride with no heart rate either, so no load;
 * - `no-lthr`: a ride with heart rate, but no LTHR set for its date.
 */
export type NoPowerLoad =
  | { kind: 'hr-tss'; tss: number; lthr: number }
  | { kind: 'hr-indicator'; tss: number; lthr: number }
  | { kind: 'other-sport'; isBeforeFirstLthr: boolean }
  | { kind: 'no-heart-rate' }
  | { kind: 'no-lthr' };

/** Which training-load explanation fits a ride without power. `firstLthr` is the first LTHR entry's date. */
export const noPowerLoad = (activity: Activity, firstLthr: string | null): NoPowerLoad => {
  const { hrLoad } = activity;

  if (!activity.isCycling) {
    if (hrLoad) return { kind: 'hr-indicator', tss: hrLoad.tss, lthr: hrLoad.lthrUsed };
    const hasHeartRate = activity.avgHr != null;
    const isBeforeFirstLthr = hasHeartRate && firstLthr !== null && activity.date < firstLthr;
    return { kind: 'other-sport', isBeforeFirstLthr };
  }

  if (hrLoad) return { kind: 'hr-tss', tss: hrLoad.tss, lthr: hrLoad.lthrUsed };
  if (activity.avgHr == null) return { kind: 'no-heart-rate' };
  return { kind: 'no-lthr' };
};
