/*
 * Read-only inspection of data/fit/*.fit: message types, record fields present, and
 * the recording interval and gap distribution. Prints no measured values; writes nothing.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Decoder, Stream } from '@garmin/fitsdk';
import { loadConfig } from '../setup.js';

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : NaN;
};

async function main(): Promise<void> {
  const fitDir = path.join(loadConfig().dataDir, 'fit');
  const files = (await readdir(fitDir)).filter((f) => f.endsWith('.fit')).sort();
  const fieldCounts = new Map<string, number>();
  const mesgTypes = new Map<string, number>();

  console.log('file              records  median-dt  max-dt  gaps(2-3s) gaps(4-30s) gaps(>30s)  devices');
  for (const f of files) {
    const bytes = new Uint8Array(await readFile(path.join(fitDir, f)));
    const { messages, errors } = new Decoder(Stream.fromBuffer(bytes)).read();
    for (const [k, v] of Object.entries(messages)) {
      if (Array.isArray(v) && v.length) mesgTypes.set(k, (mesgTypes.get(k) ?? 0) + 1);
    }
    const records = messages.recordMesgs ?? [];
    const fieldsHere = new Set<string>();
    for (const r of records) for (const [k, v] of Object.entries(r)) if (v != null) fieldsHere.add(k);
    for (const k of fieldsHere) fieldCounts.set(k, (fieldCounts.get(k) ?? 0) + 1);

    const t = records
      .map((r) => (r.timestamp instanceof Date ? r.timestamp.getTime() / 1000 : Number(r.timestamp)))
      .filter((x) => Number.isFinite(x));
    const dts = t.slice(1).map((x, i) => x - t[i]!);
    const bands = [
      dts.filter((d) => d >= 2 && d <= 3).length,
      dts.filter((d) => d > 3 && d <= 30).length,
      dts.filter((d) => d > 30).length,
    ];
    const devices = (messages.deviceInfoMesgs ?? [])
      .map((d) => [d.manufacturer, d.productName ?? d.garminProduct ?? d.product].filter(Boolean).join(':'))
      .filter(Boolean);
    const fileId = messages.fileIdMesgs?.[0];
    const creator = [fileId?.manufacturer, fileId?.garminProduct ?? fileId?.product].filter(Boolean).join(':');
    console.log(
      `${f.slice(0, 16).padEnd(17)} ${String(records.length).padStart(7)}  ${String(median(dts)).padStart(9)}  ${String(Math.max(0, ...dts)).padStart(6)}  ${String(bands[0]).padStart(10)} ${String(bands[1]).padStart(11)} ${String(bands[2]).padStart(10)}  creator=${creator} ${[...new Set(devices)].slice(0, 3).join(',')}${errors.length ? `  ERRORS=${errors.length}` : ''}`,
    );
  }
  console.log(`\nMessage types (files containing): ${[...mesgTypes].map(([k, n]) => `${k}(${n})`).join(', ')}`);
  console.log(`Record fields (files containing): ${[...fieldCounts].map(([k, n]) => `${k}(${n})`).join(', ')}`);
}

main().catch((err: unknown) => {
  console.error(`FIT probe failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
