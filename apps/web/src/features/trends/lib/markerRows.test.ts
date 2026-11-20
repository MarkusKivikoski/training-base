import { describe, expect, it } from 'vitest';
import type { Trends } from '@/shared/api/client';
import { ftpRows, maxHrRows } from './markerRows';

describe('marker rows', () => {
  it('merges FTP settings and estimates by date', () => {
    const ftp = {
      manual: [{ from: '2026-10-27', watts: 199, note: null }],
      eftp: [
        { date: '2026-11-02', watts: 201 },
        { date: '2026-10-05', watts: 190 },
      ],
    } as unknown as Trends['ftp'];
    expect(ftpRows(ftp)).toEqual([
      ['5.10.2026 · eFTP', '190 W'],
      ['27.10.2026 · set', '199 W'],
      ['2.11.2026 · eFTP', '201 W'],
    ]);
  });

  it('lists max heart rate per year, newest first', () => {
    const years = [
      { year: 2025, bpm: 181, peakBpm: 186 },
      { year: 2026, bpm: 178, peakBpm: null },
    ] as unknown as Trends['maxHr'];
    expect(maxHrRows(years)).toEqual([
      ['2026', '178 bpm'],
      ['2025', '181 bpm · single reading 186'],
    ]);
  });
});
