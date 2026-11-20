import { describe, expect, it } from 'vitest';
import { acceptInput, formatThreshold, ftpPrompt, lthrPrompt, rideLabel, riseText } from './thresholdPrompt';

const ftp = ftpPrompt({
  activityId: '25012996238',
  name: 'Sisäpyöräily',
  date: '2026-11-09',
  bestTwentyMinW: 223,
  currentFtp: 199,
  newFtp: 212,
});

const lthr = lthrPrompt({
  activityId: '25012996238',
  name: 'Sisäpyöräily',
  date: '2026-11-09',
  avgHr: 167.6,
  currentLthr: 155,
  newLthr: 159,
});

describe('threshold prompts', () => {
  it('describes an FTP update', () => {
    expect(riseText(ftp)).toBe('+13 W');
    expect(rideLabel(ftp)).toBe('Sisäpyöräily · 9.11.2026');
    expect(ftp.basis).toBe('95% of your best 20 minutes (223 W) in that ride.');
    expect(riseText({ ...ftp, current: null })).toBeNull();
  });

  it('describes an LTHR update', () => {
    expect(riseText(lthr)).toBe('+4 bpm');
    expect(formatThreshold('lthr', 159)).toBe('159 bpm');
    expect(lthr.basis).toBe('95% of your average heart rate (168 bpm) during that ride’s best 20 minutes of power.');
  });

  it('saves an estimated entry from the ride date', () => {
    expect(acceptInput(ftp)).toEqual({
      kind: 'ftp',
      entry: {
        from: '2026-11-09',
        watts: 212,
        source: 'estimated',
        note: '95% of 20-min best (223 W) in Sisäpyöräily',
      },
    });
    expect(acceptInput(lthr)).toEqual({
      kind: 'lthr',
      entry: {
        from: '2026-11-09',
        bpm: 159,
        source: 'estimated',
        note: '95% of HR (168 bpm) in best 20-min power in Sisäpyöräily',
      },
    });
  });
});
