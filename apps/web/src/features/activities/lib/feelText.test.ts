import { describe, expect, it } from 'vitest';
import type { Activity } from '@/shared/api/client';
import { hasNoMeasuredLoad, ratingLoadText } from './feelText';

const activity = (o: Partial<Activity>) =>
  ({ hrLoad: null, metrics: null, durationS: 3600, movingDurationS: 2700, ...o }) as Activity;

describe('feel text', () => {
  it('estimates load from the rating only without a measured load', () => {
    expect(hasNoMeasuredLoad(activity({}))).toBe(true);
    expect(ratingLoadText(activity({}), 7)).toBe('About 75 TSS from your rating');
    expect(ratingLoadText(activity({}), null)).toBeNull();
    const withHr = activity({ hrLoad: { tss: 40, lthrUsed: 155 } as Activity['hrLoad'] });
    expect(ratingLoadText(withHr, 7)).toBeNull();
  });
});
