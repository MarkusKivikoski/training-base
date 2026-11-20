import { describe, expect, it } from 'vitest';
import { minuteAverages } from './minuteAverages';

describe('minuteAverages', () => {
  it('averages each channel per minute, skipping gaps', () => {
    const values = { power: [100, 200, null, 300], speed: [5, null, null, 10] };
    const rows = minuteAverages(
      [0, 30, 60, 130],
      [{ key: 'power' }, { key: 'speed', scale: 3.6 }],
      (key) => values[key],
    );
    expect(rows).toEqual([
      { minute: 0, averages: [150, 18] },
      { minute: 1, averages: [null, null] },
      { minute: 2, averages: [300, 36] },
    ]);
  });
});
