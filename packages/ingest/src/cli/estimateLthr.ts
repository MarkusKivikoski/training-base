/*
 * Prints an LTHR estimate from a 20-minute FTP test ride, plus a preview of how heart-rate
 * TSS at that LTHR compares with power TSS on rides that have both. Saves nothing: the
 * user confirms the value, then it's stored with `npm run settings -- lthr <bpm> --from <date>`.
 */
import { parseArgs } from 'node:util';
import { estimateLthr, hrSegments, hrTss } from '@app/metrics';
import { createIndexStore, createStreamStore, toActivityId } from '@app/shared';
import { formatClockS } from './cliFormat.js';
import { loadConfig } from '../setup.js';

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { activity: { type: 'string' } } });
  if (!values.activity) throw new Error('Usage: npm run estimate-lthr -- --activity <id>');
  const id = toActivityId(values.activity);
  const dataDir = loadConfig().dataDir;

  const streams = createStreamStore(dataDir);
  const stream = await streams.read(id);
  if (!stream) throw new Error(`No stream for activity ${id}. Run \`npm run rebuild\` first.`);
  if (!stream.power || !stream.hr) throw new Error(`Activity ${id} needs both power and heart rate`);

  const est = estimateLthr(stream.time, stream.power, stream.hr);
  if (!est) throw new Error('No 20-minute window with power and heart rate in this activity');
  const lthr = Math.round(est.lthr);

  const { activities } = await createIndexStore(dataDir).read();
  const ride = activities.find((a) => a.id === id);
  console.log(`Activity ${id}${ride ? ` (${ride.date}, ${ride.name})` : ''}`);
  console.log(
    `Best 20 min power: ${est.avgPower.toFixed(0)} W, from ${formatClockS(est.windowStartS)} to ${formatClockS(est.windowStartS + 1200)}`,
  );
  console.log(`Average heart rate in that window: ${est.avgHr.toFixed(1)} bpm`);
  console.log(`Estimated LTHR (95%): ${est.lthr.toFixed(1)} → ${lthr} bpm\n`);

  // Calibration preview: heart-rate TSS at this LTHR vs our power TSS.
  const powered = activities.filter((a) => a.metrics?.tss != null);
  if (powered.length) {
    console.log(`Preview at LTHR ${lthr}: power TSS vs heart-rate TSS on rides with both`);
    const ratios: number[] = [];
    for (const a of powered) {
      const s = await streams.read(toActivityId(a.id));
      if (!s?.hr) continue;
      const hr = hrTss(hrSegments(s.time, s.hr), lthr);
      const ratio = hr / a.metrics!.tss!;
      ratios.push(ratio);
      console.log(
        `  ${a.date}  power ${a.metrics!.tss!.toFixed(0).padStart(4)}  hr ${hr.toFixed(0).padStart(4)}  ratio ${ratio.toFixed(2)}`,
      );
    }
    const sorted = [...ratios].sort((x, y) => x - y);
    if (sorted.length) console.log(`  median ratio ${sorted[Math.floor(sorted.length / 2)]!.toFixed(2)}`);
  }
  console.log(
    `\nNothing saved. To use it: npm run settings -- lthr ${lthr} --from ${ride?.date ?? '<date>'} --estimated`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
