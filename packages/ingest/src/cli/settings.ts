import { parseArgs } from 'node:util';
import { createSettingsStore, effectiveOn } from '@app/shared';
import { loadConfig } from '../setup.js';
import { assertIsoDate, localToday } from '../sync/dates.js';

const USAGE = `Usage:
  npm run settings                                    Show FTP, LTHR and weight history
  npm run settings -- ftp <watts> --from YYYY-MM-DD [--note "..."]
  npm run settings -- weight <kg> --from YYYY-MM-DD [--note "..."]
  npm run settings -- lthr <bpm> --from YYYY-MM-DD [--estimated] [--note "..."]
  npm run settings -- privacy-trim <metres>          Heatmap: hide the first and last metres of every route`;

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      from: { type: 'string' },
      note: { type: 'string' },
      estimated: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const store = createSettingsStore(loadConfig().dataDir);
  const [kind, valueText] = positionals;

  if (values.help) return void console.log(USAGE);

  if (!kind) {
    const today = localToday();
    const ftp = await store.readFtp();
    const weight = await store.readWeight();
    const lthr = await store.readLthr();
    const app = await store.readApp();
    console.log('FTP history:');
    for (const e of ftp) console.log(`  from ${e.from}: ${e.watts} W (${e.source})${e.note ? ` - ${e.note}` : ''}`);
    console.log('Weight history:');
    for (const e of weight) console.log(`  from ${e.from}: ${e.kg} kg${e.note ? ` - ${e.note}` : ''}`);
    console.log('LTHR history:');
    for (const e of lthr) console.log(`  from ${e.from}: ${e.bpm} bpm (${e.source})${e.note ? ` - ${e.note}` : ''}`);
    console.log(
      `Today: FTP ${effectiveOn(ftp, today)?.watts ?? 'not set'}, LTHR ${effectiveOn(lthr, today)?.bpm ?? 'not set'}, weight ${effectiveOn(weight, today)?.kg ?? 'not set'}`,
    );
    console.log(`Heatmap privacy trim: ${app.privacyTrimM} m`);
    return;
  }

  if (kind === 'privacy-trim') {
    const metres = Number(valueText);
    if (!Number.isInteger(metres) || metres < 0 || metres > 5000)
      throw new Error('Privacy trim must be a whole number of metres between 0 and 5000');
    await store.writeApp({ ...(await store.readApp()), privacyTrimM: metres });
    console.log(`Heatmap privacy trim ${metres} m saved to ${store.appFile}. Run npm run rebuild to apply it.`);
    return;
  }

  if (!values.from) throw new Error(`--from YYYY-MM-DD is required\n\n${USAGE}`);
  const from = assertIsoDate(values.from);
  const value = Number(valueText);
  const note = values.note ? { note: values.note } : {};

  if (kind === 'ftp') {
    if (!Number.isInteger(value) || value <= 0) throw new Error('FTP must be a positive whole number of watts');
    await store.upsertFtp({ from, watts: value, source: 'manual', ...note });
    console.log(`FTP ${value} W from ${from} saved to ${store.ftpFile}`);
  } else if (kind === 'weight') {
    if (!Number.isFinite(value) || value <= 0) throw new Error('Weight must be a positive number of kg');
    await store.upsertWeight({ from, kg: value, ...note });
    console.log(`Weight ${value} kg from ${from} saved to ${store.weightFile}`);
  } else if (kind === 'lthr') {
    if (!Number.isInteger(value) || value < 80 || value > 230)
      throw new Error('LTHR must be a whole number of bpm between 80 and 230');
    await store.upsertLthr({ from, bpm: value, source: values.estimated ? 'estimated' : 'manual', ...note });
    console.log(`LTHR ${value} bpm from ${from} saved to ${store.lthrFile}`);
  } else {
    throw new Error(`Unknown setting "${kind}"\n\n${USAGE}`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
