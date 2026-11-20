import { describe, expect, it } from 'vitest';
import { activityTss, loadCategory, weeklyLoadByCategory, type ActivityLoadInput } from '../src/index.js';

const act = (date: string, sport: string, o: Partial<ActivityLoadInput> = {}): ActivityLoadInput => ({
  date,
  sport,
  isCycling: false,
  load: null,
  hrLoad: null,
  ...o,
});

describe('loadCategory', () => {
  it('groups Garmin activity types', () => {
    expect(loadCategory('gravel_cycling', true)).toBe('cycling');
    expect(loadCategory('running', false)).toBe('running');
    expect(loadCategory('treadmill_running', false)).toBe('running');
    expect(loadCategory('strength_training', false)).toBe('strength');
    expect(loadCategory('cross_country_skiing_ws', false)).toBe('skiing');
    expect(loadCategory('resort_skiing_snowboarding_ws', false)).toBe('skiing');
    expect(loadCategory('walking', false)).toBe('other');
  });
});

describe('activityTss and weeklyLoadByCategory', () => {
  it('uses cycling load for rides and heart-rate TSS for everything else', () => {
    // A ride's hrLoad is only for calibration; its load is what counts.
    expect(activityTss(act('2026-11-02', 'cycling', { isCycling: true, load: { tss: 80 }, hrLoad: { tss: 70 } }))).toBe(
      80,
    );
    expect(activityTss(act('2026-11-02', 'strength_training', { hrLoad: { tss: 25 } }))).toBe(25);
    expect(activityTss(act('2026-11-02', 'running'))).toBeNull();
  });

  it('sums TSS per week and group, with empty weeks included and future days left out', () => {
    const weeks = weeklyLoadByCategory(
      [
        act('2026-10-27', 'cycling', { isCycling: true, load: { tss: 60 } }),
        act('2026-11-03', 'cycling', { isCycling: true, load: { tss: 50 } }),
        act('2026-11-04', 'strength_training', { hrLoad: { tss: 20 } }),
        act('2026-11-05', 'running', { hrLoad: { tss: 40 } }),
        act('2026-11-08', 'running', { hrLoad: { tss: 30 } }), // after endDate
      ],
      { endDate: '2026-11-06', weeks: 3 },
    );
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
    expect(weeks[0]).toMatchObject({ cycling: 0, running: 0 });
    expect(weeks[1]).toMatchObject({ cycling: 60 });
    expect(weeks[2]).toMatchObject({ cycling: 50, strength: 20, running: 40, skiing: 0, other: 0 });
  });
});
