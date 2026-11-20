/*
 * Prints the shape of real Garmin responses (field names and types, never values) so
 * the provisional schemas in packages/shared/src/schemas/garmin.ts can be confirmed.
 * Writes nothing to disk.
 */
import { toActivityId } from '@app/shared';
import { GarminKeyRejectedError } from '../garmin/errors.js';
import { isFit, listZipEntries } from '../garmin/extractFit.js';
import { createClientFromConfig, loadConfig } from '../setup.js';
import { addDays, localToday } from '../sync/dates.js';

/** Describes a JSON value as `path: type` lines, merging the keys of all array elements. */
function describeShape(value: unknown, path = '$', out = new Map<string, Set<string>>()) {
  const add = (p: string, t: string) => {
    const set = out.get(p) ?? new Set<string>();
    set.add(t);
    out.set(p, set);
  };
  if (Array.isArray(value)) {
    add(path, `array(${value.length})`);
    for (const v of value) describeShape(v, `${path}[]`, out);
  } else if (value !== null && typeof value === 'object') {
    add(path, 'object');
    for (const [k, v] of Object.entries(value)) describeShape(v, `${path}.${k}`, out);
  } else {
    add(path, value === null ? 'null' : typeof value);
  }
  return out;
}

async function main(): Promise<void> {
  const client = createClientFromConfig(loadConfig());
  const endDate = localToday();
  const startDate = addDays(endDate, -30);

  console.log(`Activity list, ${startDate} .. ${endDate}, limit 2:`);
  const json = await client.searchActivitiesRaw({ start: 0, limit: 2, startDate, endDate });
  for (const [path, types] of describeShape(json)) console.log(`  ${path}: ${[...types].join(' | ')}`);

  const first = Array.isArray(json) ? (json[0] as Record<string, unknown> | undefined) : undefined;
  const rawId = first?.['activityId'];
  if (typeof rawId !== 'number' && typeof rawId !== 'string') {
    console.log('\nNo activityId on the first list item; skipping the download probe.');
    return;
  }

  console.log('\nDownload of the first activity:');
  const { bytes, contentType } = await client.downloadActivity(toActivityId(rawId));
  console.log(`  content-type: ${contentType ?? '(none)'}`);
  console.log(`  size: ${bytes.length} bytes, bare FIT: ${isFit(bytes)}`);
  if (!isFit(bytes)) {
    const names = await listZipEntries(bytes);
    console.log(`  zip entries: ${names.map((n) => n.replace(/\d+/g, '<n>')).join(', ') || '(none)'}`);
  }
}

main().catch((err: unknown) => {
  console.error(`Probe failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = err instanceof GarminKeyRejectedError ? 2 : 1;
});
