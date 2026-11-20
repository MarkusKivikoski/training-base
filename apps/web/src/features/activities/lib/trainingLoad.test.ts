import { describe, expect, it } from 'vitest';
import type { Activity } from '@/shared/api/client';
import { noPowerLoad } from './trainingLoad';

const activity = (o: Partial<Activity>) =>
  ({ isCycling: true, hrLoad: null, avgHr: 140, date: '2026-11-01', ...o }) as Activity;
const hrLoad = { tss: 54, lthrUsed: 155 } as NonNullable<Activity['hrLoad']>;

describe('noPowerLoad', () => {
  it('uses heart-rate TSS for rides', () => {
    expect(noPowerLoad(activity({ hrLoad }), null)).toEqual({ kind: 'hr-tss', tss: 54, lthr: 155 });
  });

  it('explains a ride without heart rate or LTHR', () => {
    expect(noPowerLoad(activity({ avgHr: null }), null)).toEqual({ kind: 'no-heart-rate' });
    expect(noPowerLoad(activity({}), '2026-12-01')).toEqual({ kind: 'no-lthr' });
  });

  it('shows other sports as an indicator only', () => {
    expect(noPowerLoad(activity({ isCycling: false, hrLoad }), null).kind).toBe('hr-indicator');
    expect(noPowerLoad(activity({ isCycling: false }), '2026-12-01')).toEqual({
      kind: 'other-sport',
      isBeforeFirstLthr: true,
    });
    expect(noPowerLoad(activity({ isCycling: false, avgHr: null }), '2026-12-01')).toEqual({
      kind: 'other-sport',
      isBeforeFirstLthr: false,
    });
  });
});
