import { describe, expect, it } from 'vitest';
import type { RideWorkout, WorkoutEffort, WorkoutSummary } from '@/shared/api/client';
import {
  blocksLabel,
  comparedOnText,
  effortRows,
  effortVerdict,
  workoutChartPoints,
  workoutOptionLabel,
  workoutTitle,
} from './pastEfforts';

const block = (startS: number, durationS: number) => ({ startS, endS: startS + durationS });
const SIX_BY_FOUR = [0, 1, 2, 3, 4, 5].map((index) => block(600 + index * 420, 228 + index));

const effort = (activityId: string, date: string, overrides: Partial<WorkoutEffort> = {}): WorkoutEffort => ({
  activityId,
  date,
  offsetS: 0,
  difference: 0,
  isManual: false,
  durationS: 3780,
  avgPower: 136,
  np: 138,
  avgHr: 130,
  decouplingPercent: null,
  blocks: [],
  work: null,
  change: null,
  ...overrides,
});

const workout = (overrides: Partial<RideWorkout> = {}): RideWorkout => ({
  id: 'workout-1',
  referenceId: '1',
  durationS: 3780,
  blocks: [],
  efforts: [effort('1', '2026-10-28'), effort('2', '2026-11-11', { np: 140, avgHr: 125 })],
  name: null,
  ratings: { '2': 6 },
  override: null,
  ...overrides,
});

describe('workout labels', () => {
  it('describes equally long work blocks to the nearest half minute, and uneven ones by count', () => {
    expect(blocksLabel(SIX_BY_FOUR)).toBe('6 × 4:00');
    expect(blocksLabel([block(0, 60), block(300, 600)])).toBe('2 work intervals');
    expect(blocksLabel([block(0, 20)])).toBe('1 × 0:30');
    expect(blocksLabel([])).toBeNull();
  });

  it('titles a workout by its name, else by its shape', () => {
    expect(workoutTitle({ name: 'Threshold', durationS: 5340, blocks: SIX_BY_FOUR })).toBe('Threshold');
    expect(workoutTitle({ name: null, durationS: 5340, blocks: SIX_BY_FOUR })).toBe('6 × 4:00 · 1 h 29 min');
    expect(workoutTitle({ name: null, durationS: 3780, blocks: [] })).toBe('1 h 3 min workout');
  });

  it('labels a workout in the picker', () => {
    const summary: WorkoutSummary = {
      id: 'workout-1',
      name: null,
      referenceId: '1',
      durationS: 3780,
      blocks: [],
      efforts: 2,
      firstDate: '2026-10-28',
      lastDate: '2026-11-11',
    };
    expect(workoutOptionLabel(summary)).toBe('1 h 3 min workout · first 28.10.2026 · 2 rides');
    expect(workoutOptionLabel({ ...summary, efforts: 1, name: 'Steps' })).toBe('Steps · first 28.10.2026 · 1 ride');
  });
});

describe('effortRows', () => {
  it('compares a workout without work blocks on NP and average heart rate, newest first', () => {
    const rows = effortRows(workout(), '2');
    expect(rows.map((row) => [row.effort.activityId, row.power, row.hr, row.rating, row.isCurrent])).toEqual([
      ['2', 140, 125, 6, true],
      ['1', 138, 130, null, false],
    ]);
    expect(rows[0]!.wattsPerBeat).toBeCloseTo(1.12, 6);
  });

  it('uses the work blocks when the workout has them, and marks rides cut short', () => {
    const stats = { avgPower: 200, avgHr: 150, endHr: 156 };
    const withBlocks = workout({
      blocks: [block(600, 240), block(1020, 240)],
      efforts: [
        effort('1', '2026-10-28', { blocks: [stats, stats], work: { avgPower: 200, avgHr: 150 } }),
        effort('2', '2026-11-11', { blocks: [stats, null], work: { avgPower: 205, avgHr: 148 } }),
        effort('3', '2026-11-15', { blocks: [null, null], work: null }),
      ],
    });
    const rows = effortRows(withBlocks, '1');
    expect(rows.map((row) => [row.effort.activityId, row.power, row.hr, row.isCutShort])).toEqual([
      ['3', null, null, true],
      ['2', 205, 148, true],
      ['1', 200, 150, false],
    ]);
    expect(rows[0]!.wattsPerBeat).toBeNull();
  });

  it('turns the rows into chart points, oldest first', () => {
    expect(workoutChartPoints(effortRows(workout(), '2'))).toEqual([
      {
        date: '2026-10-28',
        isCurrent: false,
        values: [138, 130],
        tooltip: '28.10.2026: <b>138 W</b> at <b>130 bpm</b>',
      },
      {
        date: '2026-11-11',
        isCurrent: true,
        values: [140, 125],
        tooltip: '11.11.2026: <b>140 W</b> at <b>125 bpm</b>',
      },
    ]);
  });

  it('says what the numbers cover', () => {
    expect(comparedOnText({ blocks: [] })).toMatch(/normalized power .* whole ride/);
    expect(comparedOnText({ blocks: [block(0, 240)] })).toMatch(/over the work interval /);
    expect(comparedOnText({ blocks: SIX_BY_FOUR })).toMatch(/over the 6 work intervals /);
  });
});

describe('effortVerdict', () => {
  it('reads the change in power per heartbeat', () => {
    const up = effortVerdict({ againstCount: 1, powerPct: 5, hrBpm: -5, efficiencyPct: 8.6 });
    expect(up.trend).toBe('up');
    expect(up.headline).toBe('More power per heartbeat');
    expect(up.detail).toBe('+8.6% W per beat against your previous effort: power +5.0%, heart rate -5 bpm.');

    const same = effortVerdict({ againstCount: 3, powerPct: 0.4, hrBpm: 1.2, efficiencyPct: -0.5 });
    expect(same.headline).toBe('About the same power per heartbeat');
    expect(same.detail).toBe(
      '-0.5% W per beat against the median of your previous 3 efforts: power +0.4%, heart rate +1 bpm.',
    );

    expect(effortVerdict({ againstCount: 1, powerPct: -3, hrBpm: 2, efficiencyPct: -4.3 }).headline).toBe(
      'Less power per heartbeat',
    );
  });
});
