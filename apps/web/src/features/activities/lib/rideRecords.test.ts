import { describe, expect, it } from 'vitest';
import type { RidePlace } from '@/shared/api/client';
import { holdsAllTimeBest, placeLabel, recordRows } from './rideRecords';

const place = (o: Partial<RidePlace>): RidePlace => ({ scope: 'all', kind: 'maxSpeed', rank: 1, value: 15, ...o });

describe('ride records', () => {
  it('groups placings per record, in display order', () => {
    const rows = recordRows([
      place({ kind: 'power', key: 300, value: 280, scope: '2026', rank: 2 }),
      place({ kind: 'effort', key: 10000, value: 1200, extra: 8.33 }),
      place({ kind: 'power', key: 60, value: 410 }),
      place({ kind: 'power', key: 300, value: 280, scope: 'all', rank: 3 }),
    ]);
    expect(rows.map((row) => row.id)).toEqual(['effort-10000', 'power-60', 'power-300']);
    expect(rows[0]!.label).toBe('Fastest 10 km');
    expect(rows[2]!.places.map(placeLabel)).toEqual(['2nd in 2026', '3rd all time']);
  });

  it('words a run in pace and run distances', () => {
    const rows = recordRows(
      [
        place({ kind: 'effort', key: 21_098, value: 6000, extra: 3.52 }),
        place({ kind: 'avgSpeed', value: 3.2 }),
        place({ kind: 'longestBreak', value: 12 }),
      ],
      'running',
    );
    expect(rows.map((row) => [row.label, row.value])).toEqual([
      ['Fastest half marathon', '1:40:00 · 4:44 /km'],
      ['Fastest average (5 km+)', '5:13 /km'],
      ['Longest break, back with this run', '12 days off'],
    ]);
  });

  it('spots an all-time first place', () => {
    expect(holdsAllTimeBest(recordRows([place({ scope: '2026' })]))).toBe(false);
    expect(holdsAllTimeBest(recordRows([place({})]))).toBe(true);
  });
});
