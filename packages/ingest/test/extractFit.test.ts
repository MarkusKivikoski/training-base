import { describe, expect, it } from 'vitest';
import { FitExtractError } from '../src/garmin/errors.js';
import { extractFit, isFit, listZipEntries } from '../src/garmin/extractFit.js';
import { makeFit, makeZip } from './helpers.js';

describe('isFit', () => {
  it('detects the .FIT signature at bytes 8-11', () => {
    expect(isFit(makeFit())).toBe(true);
    expect(isFit(new Uint8Array(12))).toBe(false);
    expect(isFit(new Uint8Array(4))).toBe(false);
  });
});

describe('extractFit', () => {
  it('returns the single FIT entry from a ZIP, byte for byte', async () => {
    // Real downloads are ZIPs holding one "<activityId>_ACTIVITY.fit" (confirmed by the probe).
    const fit = makeFit('payload-123');
    const out = await extractFit(makeZip({ '12345_ACTIVITY.fit': fit }));
    expect(Buffer.from(out).equals(Buffer.from(fit))).toBe(true);
  });

  it('matches the .fit extension case-insensitively and ignores other entries', async () => {
    const fit = makeFit();
    const out = await extractFit(makeZip({ 'readme.txt': 'x', 'A.FIT': fit }));
    expect(Buffer.from(out).equals(Buffer.from(fit))).toBe(true);
  });

  it('passes a bare FIT file through unchanged', async () => {
    const fit = makeFit();
    expect(await extractFit(fit)).toBe(fit);
  });

  it('rejects a ZIP without a FIT file', async () => {
    await expect(extractFit(makeZip({ 'a.txt': 'x' }))).rejects.toThrow(/no \.fit file/);
  });

  it('rejects a ZIP with several FIT files', async () => {
    const zip = makeZip({ 'a.fit': makeFit(), 'b.fit': makeFit() });
    await expect(extractFit(zip)).rejects.toThrow(/2 \.fit files/);
  });

  it('rejects a .fit entry without a FIT header', async () => {
    await expect(extractFit(makeZip({ 'a.fit': 'not a fit file' }))).rejects.toThrow(/no valid FIT header/);
  });

  it('rejects bytes that are neither ZIP nor FIT', async () => {
    await expect(extractFit(new Uint8Array([1, 2, 3, 4]))).rejects.toBeInstanceOf(FitExtractError);
  });
});

describe('listZipEntries', () => {
  it('lists file names', async () => {
    expect(await listZipEntries(makeZip({ 'a.fit': makeFit(), 'b.txt': 'x' }))).toEqual(['a.fit', 'b.txt']);
  });
});
