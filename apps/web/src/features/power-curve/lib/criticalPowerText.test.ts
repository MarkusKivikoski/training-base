import { describe, expect, it } from 'vitest';
import { durationsText, fitText, formatWPrime, versusFtpText } from './criticalPowerText';

describe('critical power text', () => {
  it('formats W′ and the fit', () => {
    expect(formatWPrime(18_460)).toBe('18.5 kJ');
    expect(fitText(0.999)).toBe('Good fit');
    expect(fitText(0.985)).toBe('Fair fit');
    expect(fitText(0.9)).toMatch(/^Loose fit/);
  });

  it('compares CP with the FTP', () => {
    expect(versusFtpText(220.4, 199)).toBe('CP is 21 W above your FTP (199 W)');
    expect(versusFtpText(190, 199)).toBe('CP is 9 W below your FTP (199 W)');
    expect(versusFtpText(199.2, 199)).toBe('CP matches your FTP (199 W)');
    expect(versusFtpText(220, null)).toBeNull();
  });

  it('lists the durations used', () => {
    expect(durationsText([120, 300, 1200])).toBe('2 min, 5 min and 20 min');
  });
});
