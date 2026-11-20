import { describe, expect, it } from 'vitest';
import { effortChange, efficiencyTrend, speedChange, speedTrend } from '../src/index.js';

describe('effortChange', () => {
  it('compares with the median of the earlier efforts', () => {
    const earlier = [
      { power: 200, hr: 150 },
      { power: 200, hr: 160 },
      { power: 210, hr: 155 },
    ];
    const change = effortChange({ power: 210, hr: 150 }, earlier);
    expect(change?.againstCount).toBe(3);
    // Medians: 200 W, 155 bpm, and 200 / 150 W per beat.
    expect(change?.powerPct).toBeCloseTo(5, 6);
    expect(change?.hrBpm).toBeCloseTo(-5, 6);
    expect(change?.efficiencyPct).toBeCloseTo(5, 6);
  });

  it('uses only the last five earlier efforts that have power and heart rate', () => {
    const earlier = [
      { power: 100, hr: 100 },
      ...Array.from({ length: 5 }, () => ({ power: 200, hr: 100 })),
      { power: 300, hr: null },
    ];
    const change = effortChange({ power: 200, hr: 100 }, earlier);
    expect(change).toEqual({ againstCount: 5, powerPct: 0, hrBpm: 0, efficiencyPct: 0 });
  });

  it('is null for a first effort and for an effort without power or heart rate', () => {
    expect(effortChange({ power: 200, hr: 150 }, [])).toBeNull();
    expect(effortChange({ power: 200, hr: 150 }, [{ power: 200, hr: null }])).toBeNull();
    expect(effortChange({ power: 200, hr: null }, [{ power: 200, hr: 150 }])).toBeNull();
    expect(effortChange({ power: null, hr: 150 }, [{ power: 200, hr: 150 }])).toBeNull();
  });
});

describe('efficiencyTrend', () => {
  it('treats changes under 2 % as the same', () => {
    expect(efficiencyTrend(2)).toBe('up');
    expect(efficiencyTrend(1.9)).toBe('same');
    expect(efficiencyTrend(-1.9)).toBe('same');
    expect(efficiencyTrend(-2)).toBe('down');
  });
});

describe('speedChange', () => {
  it('compares speed and heart rate with the median of the earlier efforts', () => {
    const earlier = [
      { speed: 6, hr: 150 },
      { speed: 7, hr: 140 },
      { speed: 6.5, hr: null },
    ];
    const change = speedChange({ speed: 6.825, hr: 140 }, earlier);
    expect(change?.againstCount).toBe(3);
    // Medians: 6.5 m/s, and 145 bpm over the two efforts with heart rate.
    expect(change?.speedPct).toBeCloseTo(5, 6);
    expect(change?.hrBpm).toBeCloseTo(-5, 6);
  });

  it('leaves heart rate out when this effort or every earlier one lacks it', () => {
    expect(speedChange({ speed: 7, hr: null }, [{ speed: 7, hr: 150 }])?.hrBpm).toBeNull();
    expect(speedChange({ speed: 7, hr: 150 }, [{ speed: 7, hr: null }])?.hrBpm).toBeNull();
  });

  it('uses the last five earlier efforts, and is null for a first effort or without a speed', () => {
    const earlier = [{ speed: 1, hr: null }, ...Array.from({ length: 5 }, () => ({ speed: 5, hr: null }))];
    expect(speedChange({ speed: 5, hr: null }, earlier)).toEqual({ againstCount: 5, speedPct: 0, hrBpm: null });
    expect(speedChange({ speed: 5, hr: 140 }, [])).toBeNull();
    expect(speedChange({ speed: null, hr: 140 }, [{ speed: 5, hr: 140 }])).toBeNull();
  });
});

describe('speedTrend', () => {
  it('treats changes under 2 % as the same', () => {
    expect(speedTrend(2)).toBe('faster');
    expect(speedTrend(1.9)).toBe('same');
    expect(speedTrend(-2)).toBe('slower');
  });
});
