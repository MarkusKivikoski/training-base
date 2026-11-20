import { describe, expect, it } from 'vitest';
import type { Activity } from '@/shared/api/client';
import { decouplingMissingReason } from './decouplingNote';

const ride = (o: Partial<Activity>) =>
  ({
    isCycling: true,
    isIndoor: false,
    hasPower: false,
    avgHr: 140,
    durationS: 7200,
    movingDurationS: 7000,
    decoupling: null,
    ...o,
  }) as Activity;

describe('decouplingMissingReason', () => {
  it('says nothing for rides with a value, short rides and other sports', () => {
    expect(decouplingMissingReason(ride({ decoupling: { percent: 3, basis: 'speed', durationS: 5000 } }))).toBeNull();
    expect(decouplingMissingReason(ride({ movingDurationS: 3000 }))).toBeNull();
    expect(decouplingMissingReason(ride({ isCycling: false }))).toBeNull();
  });

  it('explains why a long ride has none', () => {
    expect(decouplingMissingReason(ride({ avgHr: null }))).toBe('No heart rate recorded.');
    expect(decouplingMissingReason(ride({ isIndoor: true }))).toMatch(/trainer speed/);
    expect(decouplingMissingReason(ride({ hasPower: true }))).toMatch(/variability index/);
    expect(decouplingMissingReason(ride({}))).toMatch(/hilly/);
  });
});
