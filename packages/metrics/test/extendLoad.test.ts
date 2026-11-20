import { describe, expect, it } from 'vitest';
import { dailyLoad, extendLoad } from '../src/index.js';

describe('extendLoad', () => {
  it('continues a series exactly as dailyLoad would have', () => {
    const entries = [
      { date: '2026-11-01', tss: 80 },
      { date: '2026-11-03', tss: 120 },
      { date: '2026-11-06', tss: 60 },
    ];
    const whole = dailyLoad(entries, { from: '2026-11-01', to: '2026-11-08' });
    const known = dailyLoad(entries.slice(0, 2), { from: '2026-11-01', to: '2026-11-04' });
    const extended = extendLoad(known.at(-1)!, entries.slice(2), '2026-11-08');
    expect(extended.map((d) => d.date)).toEqual(['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
    expect(extended).toEqual(whole.slice(4));
  });

  it('sums several plans on one day and counts unplanned days as rest', () => {
    const last = { date: '2026-11-10', tss: 0, ctl: 42, atl: 42, tsb: 0 };
    const days = extendLoad(
      last,
      [
        { date: '2026-11-12', tss: 50 },
        { date: '2026-11-12', tss: 20 },
      ],
      '2026-11-12',
    );
    expect(days[0]).toMatchObject({ tss: 0, ctl: 41, atl: 36 });
    expect(days[1]!.tss).toBe(70);
  });

  it('returns nothing when the plan ends on or before the last day', () => {
    expect(extendLoad({ date: '2026-11-10', tss: 0, ctl: 1, atl: 1, tsb: 0 }, [], '2026-11-10')).toEqual([]);
  });
});
