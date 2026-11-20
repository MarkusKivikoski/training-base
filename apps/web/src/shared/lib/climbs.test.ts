import { describe, expect, it } from 'vitest';
import { climbTitle, ordinal, vam } from './climbs';

describe('climb helpers', () => {
  it('names unnamed climbs by length and grade', () => {
    expect(climbTitle({ name: 'Kirkkonummi wall', lengthM: 640, avgGrade: 0.042 })).toBe('Kirkkonummi wall');
    expect(climbTitle({ name: null, lengthM: 646, avgGrade: 0.042 })).toBe('650 m at 4.2%');
    expect(climbTitle({ name: null, lengthM: 1620, avgGrade: 0.05 })).toBe('1.6 km at 5.0%');
  });

  it('ranks and climbing rate', () => {
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(7)).toBe('7th');
    expect(vam(100, 600)).toBe(600);
    expect(vam(100, 0)).toBeNull();
  });
});
