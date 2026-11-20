import { describe, expect, it } from 'vitest';
import { describeWorkoutType, shownWorkoutType } from './workoutTypes';

const detected = {
  type: 'threshold' as const,
  basis: 'power' as const,
  reps: { count: 2, durationS: 1188, intensity: 0.968 },
};

describe('shownWorkoutType', () => {
  it('prefers the type set by hand, and marks heart-rate types as rough', () => {
    expect(shownWorkoutType({ workoutType: detected, workoutTypeOverride: 'vo2max' })).toEqual({
      type: 'vo2max',
      isManual: true,
      isRough: false,
    });
    expect(
      shownWorkoutType({ workoutType: { type: 'tempo', basis: 'hr', reps: null }, workoutTypeOverride: null }),
    ).toEqual({ type: 'tempo', isManual: false, isRough: true });
    expect(shownWorkoutType({ workoutType: null, workoutTypeOverride: null })).toBeNull();
  });
});

describe('describeWorkoutType', () => {
  it('names the repetitions, rounded to the planned length', () => {
    expect(describeWorkoutType({ workoutType: detected, workoutTypeOverride: null })).toBe(
      'Threshold: 2 × 20 min at 97 % of FTP',
    );
    const sprints = {
      type: 'anaerobic' as const,
      basis: 'power' as const,
      reps: { count: 8, durationS: 43, intensity: 1.4 },
    };
    expect(describeWorkoutType({ workoutType: sprints, workoutTypeOverride: null })).toBe(
      'Anaerobic: 8 × 45 s at 140 % of FTP',
    );
  });

  it('says where other types came from', () => {
    const endurance = { type: 'endurance' as const, basis: 'power' as const, reps: null };
    expect(describeWorkoutType({ workoutType: endurance, workoutTypeOverride: null })).toBe(
      'Endurance: from time in power zones',
    );
    expect(describeWorkoutType({ workoutType: { ...endurance, basis: 'hr' }, workoutTypeOverride: null })).toBe(
      'Endurance: rough type, from heart rate only',
    );
    expect(describeWorkoutType({ workoutType: endurance, workoutTypeOverride: 'mixed' })).toBe(
      'Mixed / race: set by hand',
    );
  });
});
