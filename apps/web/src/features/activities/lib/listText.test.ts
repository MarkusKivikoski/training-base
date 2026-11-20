import { describe, expect, it } from 'vitest';
import { activityNoun, parseKm, resultsTitle } from './listText';

describe('list text', () => {
  it('names rides or activities', () => {
    expect(activityNoun('cycling')).toBe('rides');
    expect(activityNoun('all', 1)).toBe('activity');
  });

  it('builds the results title', () => {
    expect(resultsTitle(374, 'cycling', false)).toBe('374 rides');
    expect(resultsTitle(1, 'cycling', true)).toBe('1 ride match');
    expect(resultsTitle(0, 'all', true)).toBe('0 activities match');
  });

  it('parses a km bound', () => {
    expect(parseKm('42,5')).toBe(42.5);
    expect(parseKm(' 0 ')).toBe(0);
    expect(parseKm('')).toBeUndefined();
    expect(parseKm('-3')).toBeUndefined();
    expect(parseKm('far')).toBeUndefined();
  });
});
