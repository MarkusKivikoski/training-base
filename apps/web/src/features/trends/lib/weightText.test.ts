import { describe, expect, it } from 'vitest';
import { weightChangeText } from './weightText';

describe('weightChangeText', () => {
  it('describes the change since the first entry', () => {
    const history = [
      { from: '2026-11-06', kg: 84.5 },
      { from: '2026-05-01', kg: 90 },
    ];
    expect(weightChangeText(history)).toBe('−5.5 kg since 1.5.2026');
    expect(
      weightChangeText([
        { from: '2026-05-01', kg: 90 },
        { from: '2026-06-01', kg: 91.2 },
      ]),
    ).toBe('+1.2 kg since 1.5.2026');
    expect(weightChangeText([{ from: '2026-05-01', kg: 90 }])).toBeNull();
  });
});
