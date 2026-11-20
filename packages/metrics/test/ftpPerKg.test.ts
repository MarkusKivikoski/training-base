import { describe, expect, it } from 'vitest';
import { ftpPerKgSeries } from '../src/index.js';

describe('ftpPerKgSeries', () => {
  it('recomputes W/kg whenever the FTP or the weight changes', () => {
    const points = ftpPerKgSeries(
      [
        { from: '2026-10-27', watts: 199 },
        { from: '2026-12-01', watts: 210 },
      ],
      [
        { from: '2026-05-01', kg: 90 },
        { from: '2026-11-04', kg: 85 },
        { from: '2026-11-06', kg: 84.5 },
      ],
    );
    expect(points.map((p) => [p.date, p.ftp, p.kg])).toEqual([
      ['2026-10-27', 199, 90],
      ['2026-11-04', 199, 85],
      ['2026-11-06', 199, 84.5],
      ['2026-12-01', 210, 84.5],
    ]);
    expect(points[0]!.wattsPerKg).toBeCloseTo(2.211, 3);
  });

  it('applies the earliest weight before it, and is empty without both', () => {
    expect(ftpPerKgSeries([{ from: '2026-10-27', watts: 199 }], [{ from: '2026-11-04', kg: 85 }])[0]).toMatchObject({
      date: '2026-10-27',
      kg: 85,
    });
    expect(ftpPerKgSeries([], [{ from: '2026-11-04', kg: 85 }])).toEqual([]);
  });
});
