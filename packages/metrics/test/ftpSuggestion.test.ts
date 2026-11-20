import { describe, expect, it } from 'vitest';
import { ftpSuggestion, lthrSuggestion, MEAN_MAX_DURATIONS_S, type RideMeanMax } from '../src/index.js';

/** A ride whose 20-minute best is `twentyMinW` (null: shorter than 20 minutes). */
const ride = (id: string, date: string, twentyMinW: number | null): RideMeanMax => ({
  id,
  date,
  name: `Ride ${id}`,
  meanMaxPower: MEAN_MAX_DURATIONS_S.map((d) => (d === 1200 ? twentyMinW : d < 1200 ? 300 : null)),
});

const FTP_199 = [{ from: '2026-10-27', watts: 199 }];
const TODAY = '2026-11-10';

describe('ftpSuggestion', () => {
  it('suggests 95% of a later ride’s 20-minute best when it beats the FTP by 3 W or more', () => {
    expect(ftpSuggestion([ride('a', '2026-11-08', 223)], FTP_199, { today: TODAY })).toEqual({
      activityId: 'a',
      name: 'Ride a',
      date: '2026-11-08',
      bestTwentyMinW: 223,
      currentFtp: 199,
      newFtp: 212,
    });
  });

  it('ignores small rises', () => {
    // 214 W × 0.95 = 203 W: 4 W up. 213 W gives 202 W: 3 W up, still enough. 212 W gives 201 W.
    expect(ftpSuggestion([ride('a', '2026-11-08', 214)], FTP_199, { today: TODAY })?.newFtp).toBe(203);
    expect(ftpSuggestion([ride('a', '2026-11-08', 213)], FTP_199, { today: TODAY })?.newFtp).toBe(202);
    expect(ftpSuggestion([ride('a', '2026-11-08', 212)], FTP_199, { today: TODAY })).toBeNull();
  });

  it('only looks at rides after the current FTP entry, up to today', () => {
    const rides = [ride('test', '2026-10-27', 260), ride('old', '2026-09-01', 260), ride('future', '2026-11-11', 260)];
    expect(ftpSuggestion(rides, FTP_199, { today: TODAY })).toBeNull();
  });

  it('picks the highest candidate, the earlier one on a tie, and skips declined rides', () => {
    const rides = [ride('a', '2026-11-03', 230), ride('b', '2026-11-05', 240), ride('c', '2026-11-07', 240)];
    expect(ftpSuggestion(rides, FTP_199, { today: TODAY })?.activityId).toBe('b');
    expect(ftpSuggestion(rides, FTP_199, { today: TODAY, dismissedRideIds: ['b'] })?.activityId).toBe('c');
    expect(ftpSuggestion(rides, FTP_199, { today: TODAY, dismissedRideIds: ['b', 'c'] })?.activityId).toBe('a');
  });

  it('skips rides without a 20-minute best', () => {
    expect(ftpSuggestion([ride('short', '2026-11-08', null)], FTP_199, { today: TODAY })).toBeNull();
    expect(ftpSuggestion([{ id: 'np', date: '2026-11-08', meanMaxPower: null }], FTP_199, { today: TODAY })).toBeNull();
  });

  it('uses the entry in effect today, ignoring future entries', () => {
    const history = [...FTP_199, { from: '2026-12-01', watts: 250 }];
    expect(ftpSuggestion([ride('a', '2026-11-08', 223)], history, { today: TODAY })?.currentFtp).toBe(199);
  });

  it('suggests a first FTP when none is set', () => {
    const suggestion = ftpSuggestion([ride('a', '2026-11-08', 200)], [], { today: TODAY });
    expect(suggestion).toMatchObject({ currentFtp: null, newFtp: 190 });
  });
});

describe('lthrSuggestion', () => {
  const LTHR_155 = [{ from: '2026-10-27', bpm: 155 }];
  const ride = (id: string, date: string, bpm: number | null) => ({
    id,
    date,
    name: `Ride ${id}`,
    lthrEstimate: bpm === null ? null : { bpm, avgHr: bpm / 0.95 },
  });

  it('suggests the rounded estimate when it beats the LTHR by 2 bpm or more', () => {
    expect(lthrSuggestion([ride('a', '2026-11-08', 158.6)], LTHR_155, { today: TODAY })).toEqual({
      activityId: 'a',
      name: 'Ride a',
      date: '2026-11-08',
      avgHr: 158.6 / 0.95,
      currentLthr: 155,
      newLthr: 159,
    });
    expect(lthrSuggestion([ride('a', '2026-11-08', 156.4)], LTHR_155, { today: TODAY })).toBeNull();
  });

  it('skips rides without an estimate, before the current entry or declined', () => {
    const rides = [ride('none', '2026-11-08', null), ride('old', '2026-10-27', 170), ride('no', '2026-11-09', 170)];
    expect(lthrSuggestion(rides, LTHR_155, { today: TODAY, dismissedRideIds: ['no'] })).toBeNull();
  });
});
