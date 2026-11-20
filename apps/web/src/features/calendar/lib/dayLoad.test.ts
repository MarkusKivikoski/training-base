import { addDays, type DayLoadInput } from '@app/metrics';
import { describe, expect, it } from 'vitest';
import {
  dayLoadByDate,
  dayLoadColor,
  dayLoadIcon,
  dayLoadText,
  peakLoad,
  scaledLoad,
  weekBand,
  type DayLoad,
} from './dayLoad';

/** `count` days from 2026-01-01 with steady load, so zones exist after the baseline. */
const series = (count: number): DayLoadInput[] =>
  Array.from({ length: count }, (_, i) => ({ date: addDays('2026-01-01', i), ctl: 40, atl: 44, tsb: -4 }));

describe('day load', () => {
  it('maps the chosen measure by date, or nothing when off', () => {
    const days = series(3);
    expect(dayLoadByDate(days, 'off').size).toBe(0);
    expect(dayLoadByDate(days, 'fitness').get('2026-01-02')?.value).toBe(40);
    expect(dayLoadByDate(days, 'fatigue').get('2026-01-02')?.value).toBe(44);
  });

  it('uses the plain series colour and no zone during the baseline', () => {
    const baselineDay = dayLoadByDate(series(3), 'fatigue').get('2026-01-03')!;
    expect(dayLoadColor(baselineDay, 'fatigue')).toBe('var(--series-2)');
    expect(dayLoadColor(baselineDay, 'fitness')).toBe('var(--series-1)');
    expect(dayLoadIcon(baselineDay)).toBe('•');
    expect(dayLoadText(baselineDay, 'fatigue')).toBe('Fatigue 44.0');
    expect(dayLoadColor(undefined, 'fatigue')).toBe('transparent');
  });

  it('colours by zone after the baseline', () => {
    const days = series(60);
    const lastDay = dayLoadByDate(days, 'fatigue').get(days.at(-1)!.date)!;
    expect(lastDay.status.baseline).toBe(false);
    expect(dayLoadColor(lastDay, 'fatigue')).toMatch(/^var\(--(status|text)-/);
    expect(dayLoadText(lastDay, 'fatigue')).toMatch(/^Fatigue 44\.0 · /);
  });

  it('scales to the peak of the visible dates', () => {
    const byDate = new Map<string, DayLoad>([
      ['2026-01-01', { value: 10, status: { baseline: true } }],
      ['2026-01-02', { value: 40, status: { baseline: true } }],
    ]);
    const peak = peakLoad(['2026-01-01', '2026-01-02', '2026-01-03'], byDate);
    expect(peak).toBe(40);
    expect(scaledLoad(byDate.get('2026-01-01'), peak)).toBe(0.25);
    expect(scaledLoad(undefined, peak)).toBeNull();
    expect(scaledLoad(byDate.get('2026-01-01'), 0)).toBeNull();
  });
});

describe('weekBand', () => {
  it('joins the edge of a week to the day before it', () => {
    const byDate = new Map<string, DayLoad>(
      ['2026-11-01', '2026-11-02', '2026-11-03'].map((date, i) => [
        date,
        { value: (i + 1) * 10, status: { baseline: true } },
      ]),
    );
    const week = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
    const slices = weekBand(week, byDate, 30);
    expect(slices[0]!.center).toBeCloseTo(2 / 3);
    // The left edge sits halfway between Sunday (10) and Monday (20).
    expect(slices[0]!.left).toBeCloseTo(0.5);
    expect(slices[2]).toBeNull();
  });
});
