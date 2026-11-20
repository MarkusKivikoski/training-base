import { describe, expect, it } from 'vitest';
import type { DayLoad } from '@/shared/api/client';
import { buildFitnessRows, changeSinceWeekAgo, riddenRows, rowsInRange } from './fitnessRows';

const day = (date: string, ctl: number): DayLoad => ({ date, tss: 50, ctl, atl: ctl + 5, tsb: -5 });

describe('rowsInRange', () => {
  const rows = buildFitnessRows([day('2026-08-01', 5), day('2026-09-20', 8), day('2026-11-08', 10)]);

  it('keeps the days inside the range, ending today', () => {
    expect(rowsInRange(rows, '2026-11-08', '6w').map((r) => r.date)).toEqual(['2026-11-08']);
    expect(rowsInRange(rows, '2026-11-08', '3m').map((r) => r.date)).toEqual(['2026-09-20', '2026-11-08']);
    expect(rowsInRange(rows, '2026-11-08', 'all')).toHaveLength(3);
  });

  it('adds a status to every day', () => {
    expect(rows.every((r) => 'form' in r.status)).toBe(true);
  });
});

describe('changeSinceWeekAgo', () => {
  it('is the difference, or null when a day is missing', () => {
    expect(changeSinceWeekAgo(day('2026-11-08', 10), day('2026-11-01', 7), 'ctl')).toBe(3);
    expect(changeSinceWeekAgo(day('2026-11-08', 10), undefined, 'ctl')).toBeNull();
  });
});

describe('forecast rows', () => {
  const days = [day('2026-11-09', 10), day('2026-11-10', 12)];

  it('adds planned days after today, up to the last plan', () => {
    const rows = buildFitnessRows(
      days,
      [
        { date: '2026-11-10', tss: 999 },
        { date: '2026-11-13', tss: 84 },
      ],
      '2026-11-10',
    );
    expect(rows.map((r) => [r.date, r.tss, r.isPlanned])).toEqual([
      ['2026-11-09', 50, false],
      ['2026-11-10', 50, false],
      ['2026-11-11', 0, true],
      ['2026-11-12', 0, true],
      ['2026-11-13', 84, true],
    ]);
    expect(riddenRows(rows)).toHaveLength(2);
    // Fitness keeps decaying on rest days, then rises with the planned TSS.
    expect(rows[2]!.ctl).toBeLessThan(12);
    expect(rows[4]!.ctl).toBeGreaterThan(rows[3]!.ctl);
  });

  it('has no forecast without upcoming plans', () => {
    expect(buildFitnessRows(days, [{ date: '2026-11-01', tss: 50 }], '2026-11-10')).toHaveLength(2);
  });
});
