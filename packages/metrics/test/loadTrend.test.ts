import { describe, expect, it } from 'vitest';
import { addDays, weeklyLoadTrend, weeklyTss, type DayTss } from '../src/index.js';

/** Daily TSS from `from` for n days. */
const days = (from: string, values: number[]): DayTss[] => values.map((tss, i) => ({ date: addDays(from, i), tss }));

describe('weeklyLoadTrend', () => {
  it('compares the last 7 days with the 4 weeks before', () => {
    // 28 days at 10 TSS/day (70/week), then 7 days at 15/day (105): ratio 1.5.
    const d = days('2026-01-01', [...Array(28).fill(10), ...Array(7).fill(15)]);
    const t = weeklyLoadTrend(d, '2026-02-04');
    expect(t.last7).toBe(105);
    expect(t.usualWeek).toBe(70);
    expect(t.status).toMatchObject({ baseline: false, zone: { label: 'Big jump' } });
    expect(t.status.baseline === false && t.status.value).toBeCloseTo(1.5, 6);
  });

  it('counts missing days as 0 and classifies a light week as recovery', () => {
    const d = days('2026-01-01', [...Array(28).fill(10), 20]); // then nothing
    expect(weeklyLoadTrend(d, '2026-02-04').status).toMatchObject({ zone: { label: 'Recovery week' } });
  });

  it('needs 5 weeks of history and a usual week of at least 20 TSS', () => {
    const short = days('2026-01-01', Array(20).fill(10));
    expect(weeklyLoadTrend(short, '2026-01-20')).toMatchObject({ status: { baseline: true }, readyFrom: '2026-02-04' });
    const tiny = days('2026-01-01', Array(35).fill(1));
    expect(weeklyLoadTrend(tiny, '2026-02-04').status).toEqual({ baseline: true });
  });
});

describe('weeklyTss', () => {
  it('sums ISO weeks and averages the 4 weeks before once there is history', () => {
    // Monday 5 Jan 2026 onwards: 6 weeks of 7 × 10 TSS.
    const d = days('2026-01-05', Array(42).fill(10));
    const rows = weeklyTss(d, { today: '2026-02-15', weeks: 6 });
    expect(rows.map((r) => r.weekStart)).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26',
      '2026-02-02',
      '2026-02-09',
    ]);
    expect(rows.every((r) => r.tss === 70)).toBe(true);
    expect(rows.map((r) => r.usual)).toEqual([null, null, null, null, 70, 70]);
  });
});
