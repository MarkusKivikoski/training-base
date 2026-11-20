/*
 * Sanity check: compares our NP and mean-max power with the values Garmin stored in
 * data/raw/ for the same rides. A report, not a test: Garmin's zero and pause handling
 * differs, so a few percent is expected. TSS is compared only when Garmin's FTP matches ours.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MEAN_MAX_DURATIONS_S, createIndexStore } from '@app/shared';
import { loadConfig } from '../setup.js';

const pct = (ours: number, theirs: number) => ((ours - theirs) / theirs) * 100;
const fmt = (v: number | null) => (v === null ? '   -  ' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`.padStart(6));
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : null;
};

// Garmin's maxAvgPower_* keys that line up with our durations.
const GARMIN_DURATIONS = [1, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600];

async function main(): Promise<void> {
  const dataDir = loadConfig().dataDir;
  const { activities } = await createIndexStore(dataDir).read();
  const powered = activities.filter((a) => a.metrics);
  if (powered.length === 0) return void console.log('No rides with power metrics. Run `npm run rebuild` first.');

  const npDiffs: number[] = [];
  const mmpDiffs = new Map<number, number[]>();
  const shown = GARMIN_DURATIONS.filter((d) => (MEAN_MAX_DURATIONS_S as readonly number[]).includes(d));

  console.log(
    `date        NP ours  NP Garmin   diff  TSS diff  | mean-max diff at ${shown.map((d) => `${d}s`).join(' ')}`,
  );
  for (const a of powered) {
    const raw = JSON.parse(await readFile(path.join(dataDir, 'raw', `${a.id}.json`), 'utf8')) as Record<
      string,
      unknown
    >;
    const gNp = typeof raw['normPower'] === 'number' ? raw['normPower'] : null;
    const gTss = typeof raw['trainingStressScore'] === 'number' ? raw['trainingStressScore'] : null;
    const gFtp = typeof raw['maxFtp'] === 'number' ? raw['maxFtp'] : null;
    const np = a.metrics!.np;
    const npDiff = gNp ? pct(np, gNp) : null;
    if (npDiff !== null) npDiffs.push(npDiff);
    const tssDiff = gTss && a.metrics!.tss !== null && gFtp === a.metrics!.ftpUsed ? pct(a.metrics!.tss, gTss) : null;

    const cells = shown.map((d) => {
      const ours = a.meanMaxPower?.[(MEAN_MAX_DURATIONS_S as readonly number[]).indexOf(d)] ?? null;
      const theirs = raw[`maxAvgPower_${d}`];
      if (ours === null || typeof theirs !== 'number' || theirs <= 0) return fmt(null);
      const diff = pct(ours, theirs);
      mmpDiffs.set(d, [...(mmpDiffs.get(d) ?? []), diff]);
      return fmt(diff);
    });
    console.log(
      `${a.date}  ${np.toFixed(0).padStart(7)}  ${gNp === null ? '      -' : gNp.toFixed(0).padStart(9)}  ${fmt(npDiff)}  ${fmt(tssDiff).padStart(8)}  | ${cells.join(' ')}`,
    );
  }
  console.log(`\nMedian NP difference: ${fmt(median(npDiffs))} over ${npDiffs.length} rides`);
  console.log(
    `Median mean-max difference: ${shown.map((d) => `${d}s ${fmt(median(mmpDiffs.get(d) ?? [])).trim()}`).join(', ')}`,
  );

  // Calibration of our heart-rate TSS against power TSS, on rides that have both.
  const both = activities.filter((a) => a.metrics?.tss != null && a.hrLoad);
  if (both.length === 0) {
    console.log('\nNo rides with both power TSS and heart-rate TSS (needs an FTP and an LTHR on the same date).');
    return;
  }
  console.log('\nHeart-rate TSS vs power TSS');
  const ratios: number[] = [];
  for (const a of both) {
    const ratio = a.hrLoad!.tss / a.metrics!.tss!;
    ratios.push(ratio);
    console.log(
      `${a.date}  power ${a.metrics!.tss!.toFixed(0).padStart(4)}  hr ${a.hrLoad!.tss.toFixed(0).padStart(4)}  ratio ${ratio.toFixed(2)}  (IF ${a.metrics!.intensityFactor?.toFixed(2)})`,
    );
  }
  console.log(`Median ratio ${median(ratios)!.toFixed(2)} over ${ratios.length} rides (target 0.85–1.15)`);
}

main().catch((err: unknown) => {
  console.error(`check-metrics failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
