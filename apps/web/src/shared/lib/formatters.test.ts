import { describe, expect, it } from 'vitest';
import {
  EMPTY,
  formatClock,
  formatDate,
  formatDateTime,
  formatShortDate,
  formatDistance,
  formatDuration,
  formatDurationLabel,
  formatIntensityFactor,
  formatTss,
  formatHours,
  formatPace,
  formatRecordDistance,
  formatPower,
  formatSpeed,
  formatSport,
  formatWattsPerKg,
} from './formatters';

describe('formatters', () => {
  it('formats durations', () => {
    expect(formatDuration(5400)).toBe('1 h 30 min');
    expect(formatDuration(3600)).toBe('1 h');
    expect(formatDuration(2700)).toBe('45 min');
    expect(formatClock(5400)).toBe('1:30:00');
    expect(formatClock(605)).toBe('10:05');
    expect(formatHours(5400)).toBe('1.5 h');
  });

  it('formats metric units', () => {
    expect(formatDistance(42195)).toBe('42.2 km');
    expect(formatDistance(0)).toBe(EMPTY); // indoor rides
    expect(formatSpeed(10)).toBe('36.0 km/h');
    expect(formatPace(3.2)).toBe('5:13 /km');
    expect(formatPace(4)).toBe('4:10 /km');
    expect(formatPace(0)).toBe(EMPTY);
    expect(formatRecordDistance(400)).toBe('400 m');
    expect(formatRecordDistance(10_000)).toBe('10 km');
    expect(formatRecordDistance(21_098)).toBe('Half marathon');
    expect(formatRecordDistance(42_195)).toBe('Marathon');
    expect(formatPower(199.4)).toBe('199 W');
    expect(formatWattsPerKg(2.654)).toBe('2.65 W/kg');
  });

  it('renders missing values as a dash', () => {
    for (const f of [formatDuration, formatClock, formatDistance, formatSpeed, formatPower]) {
      expect(f(null)).toBe(EMPTY);
      expect(f(undefined)).toBe(EMPTY);
    }
  });

  it('formats dates as d.m.yyyy without leading zeros or time-zone shifts', () => {
    expect(formatDate('2026-11-04')).toBe('4.11.2026');
    expect(formatDate('2026-01-31')).toBe('31.1.2026');
    expect(formatShortDate('2026-12-24')).toBe('24.12.');
    expect(formatDateTime('2026-11-04T23:30:00')).toBe('4.11.2026 23:30');
    expect(formatDateTime('2026-11-04T08:05:00')).toBe('4.11.2026 08:05');
  });

  it('formats power-curve durations and training metrics', () => {
    expect([1, 5, 60, 90, 300, 1200, 3600, 5400, 7200].map(formatDurationLabel)).toEqual([
      '1 s',
      '5 s',
      '1 min',
      '1 min 30 s',
      '5 min',
      '20 min',
      '1 h',
      '1 h 30 min',
      '2 h',
    ]);
    expect(formatIntensityFactor(0.857)).toBe('0.86');
    expect(formatTss(134.6)).toBe('135');
    expect(formatTss(null)).toBe(EMPTY);
  });

  it('labels sports', () => {
    expect(formatSport('gravel_cycling')).toBe('Gravel cycling');
    expect(formatSport('indoor_cycling')).toBe('Indoor cycling');
  });
});
