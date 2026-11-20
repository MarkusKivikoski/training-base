import { describe, expect, it } from 'vitest';
import type { Activity, ActivityStreams } from '@/shared/api/client';
import { coachMinutes, minuteLines, zoneLines } from './coachDetail';

const stream = (channels: Partial<ActivityStreams>) =>
  ({ time: [], power: null, hr: null, laps: null, ...channels }) as ActivityStreams;

const zoneSet = (threshold: number, seconds: number[]) => ({
  threshold,
  thresholdFrom: '2026-10-01',
  backApplied: false,
  seconds,
});

describe('coachMinutes', () => {
  it('averages power and HR per minute', () => {
    const minutes = coachMinutes(
      stream({ time: [0, 30, 60, 90], power: [100, 200, 300, 0], hr: [120, 130, 140, 150] }),
    );
    expect(minutes).toEqual({
      channels: ['power', 'hr'],
      rows: [
        { minute: 0, averages: [150, 125] },
        { minute: 1, averages: [150, 145] },
      ],
    });
  });

  it('keeps only the channels the ride recorded', () => {
    expect(coachMinutes(stream({ time: [0, 30], hr: [120, 130], power: [null, 0] }))?.channels).toEqual(['hr']);
    expect(coachMinutes(stream({ time: [0, 30] }))).toBeNull();
  });
});

describe('minuteLines', () => {
  it('writes CSV, leaving out minutes without readings and blanking a missing channel', () => {
    const lines = minuteLines({
      channels: ['power', 'hr'],
      rows: [
        { minute: 0, averages: [149.6, 125.2] },
        { minute: 1, averages: [null, null] },
        { minute: 2, averages: [null, 140] },
      ],
    });
    expect(lines.slice(1)).toEqual(['minute,power_w,hr_bpm', '0,150,125', '2,,140']);
  });
});

describe('zoneLines', () => {
  it('lists time in power and HR zones with their ranges', () => {
    const zones = {
      power: zoneSet(200, [600, 1200, 600, 0, 0, 0, 0]),
      hr: zoneSet(160, [300, 1500, 600, 0, 0]),
    } as Activity['zones'];
    const lines = zoneLines(zones);
    expect(lines[0]).toBe('Time in power zones, FTP (200 W):');
    expect(lines[2]).toBe('- Z2 Endurance (112–151 W): 20:00 (50%)');
    expect(lines[4]).toBe('Time in heart-rate zones, LTHR (160 bpm):');
    // Zones with no time are left out: 3 power and 3 HR zones remain.
    expect(lines).toHaveLength(4 + 4);
    expect(lines.join('\n')).not.toContain('(0%)');
  });

  it('is empty without zones or counted time', () => {
    expect(zoneLines({ power: null, hr: null })).toEqual([]);
    expect(zoneLines({ power: zoneSet(200, [0, 0, 0, 0, 0, 0, 0]), hr: null } as Activity['zones'])).toEqual([]);
  });
});
