import type { CurvePoint } from '@app/metrics';
import { describe, expect, it } from 'vitest';
import { plottedValue, pointAt, pointWattsPerKg } from './curveValues';
import { missingProfileDurations, scoreBarPercent, scoreText } from './profileText';
import { compareLabel, curveCardTitle, rangeFor } from './ranges';

const point = (durationS: number, watts: number, date = '2026-11-01'): CurvePoint => ({
  durationS,
  watts,
  date,
  activityId: '1',
});

describe('ranges', () => {
  it('ends every preset today', () => {
    expect(rangeFor('last42', '2026-11-09')).toEqual({ from: '2026-09-29', to: '2026-11-09' });
    expect(rangeFor('last90', '2026-11-09')).toEqual({ from: '2026-08-12', to: '2026-11-09' });
    expect(rangeFor('year', '2026-11-09')).toEqual({ from: '2026-01-01', to: '2026-11-09' });
    expect(rangeFor('all', '2026-11-09')).toEqual({ to: '2026-11-09' });
  });

  it('titles the card', () => {
    expect(curveCardTitle('last90', 'none')).toBe('Best power · Last 90 days');
    expect(curveCardTitle('year', 'all')).toBe('Best power · This year vs All time');
    expect(compareLabel('none')).toBeNull();
  });
});

describe('curve values', () => {
  const kgFor = (date: string) => (date >= '2026-10-01' ? 80 : null);

  it('uses the weight on the ride date', () => {
    expect(pointWattsPerKg(point(300, 240), kgFor)).toBe(3);
    expect(pointWattsPerKg(point(300, 240, '2025-01-01'), kgFor)).toBeNull();
  });

  it('plots W/kg only when asked and known', () => {
    expect(plottedValue(point(60, 333), kgFor, true)).toBe(4.16);
    expect(plottedValue(point(60, 333.4), kgFor, false)).toBe(333);
    expect(plottedValue(point(60, 333.4, '2025-01-01'), kgFor, true)).toBe(333);
    expect(pointAt([point(5, 700), point(60, 333)], 60)?.watts).toBe(333);
  });
});

describe('profile text', () => {
  it('clamps bars and describes scores', () => {
    expect(scoreBarPercent(1.4)).toBe(100);
    expect(scoreBarPercent(-0.2)).toBe(0);
    expect(scoreText(0.42)).toBe('42% of the way from untrained to world class');
    expect(scoreText(-0.1)).toBe('below the untrained end of the range');
  });

  it('lists missing durations', () => {
    expect(missingProfileDurations([point(5, 700), point(300, 260)])).toEqual(['1 min', 'FTP']);
  });
});
