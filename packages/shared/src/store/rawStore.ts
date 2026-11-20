import path from 'node:path';
import type { ActivityId } from '../activityId.js';
import { atomicWrite } from './atomicWrite.js';
import { fileExists } from './fsUtil.js';

/**
 * `data/raw/<id>.json`: Garmin summary JSON as received, with object keys sorted.
 *
 * Garmin returns the same activity's fields in a different key order on each request
 * (observed 2026-11-04). Sorting keys gives byte-identical files on re-runs. Values and
 * array order are untouched.
 */
export function createRawStore(dataDir: string) {
  const fileFor = (id: ActivityId) => path.join(dataDir, 'raw', `${id}.json`);
  return {
    fileFor,
    has: (id: ActivityId) => fileExists(fileFor(id)),
    write: (id: ActivityId, summary: unknown) =>
      atomicWrite(fileFor(id), `${JSON.stringify(sortKeysDeep(summary), null, 2)}\n`),
  };
}

/** Returns a copy of a JSON value with object keys sorted recursively. */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeysDeep((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

export type RawStore = ReturnType<typeof createRawStore>;
