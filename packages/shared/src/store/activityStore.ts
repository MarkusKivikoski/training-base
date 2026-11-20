import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import type { ActivityId } from '../activityId.js';
import {
  activityIndexSchema,
  activitySummarySchema,
  INDEX_SCHEMA_VERSION,
  type ActivityIndex,
  type ActivitySummary,
} from '../schemas/activity.js';
import { readJsonFile, writeJsonFile } from './jsonFile.js';

/** `data/activities/<id>.json`: parsed summary plus computed metrics. Derived data. */
export function createActivityStore(dataDir: string) {
  const dir = path.join(dataDir, 'activities');
  const fileFor = (id: ActivityId) => path.join(dir, `${id}.json`);
  return {
    fileFor,
    async read(id: ActivityId): Promise<ActivitySummary | null> {
      return readJsonFile(fileFor(id), activitySummarySchema.nullable(), () => null);
    },
    write: (a: ActivitySummary) => writeJsonFile(fileFor(a.id as ActivityId), a),
    async readAll(): Promise<ActivitySummary[]> {
      const files = await readdir(dir).catch((err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') return [] as string[];
        throw err;
      });
      const out: ActivitySummary[] = [];
      for (const f of files.filter((n) => /^\d+\.json$/.test(n))) {
        const a = await readJsonFile(path.join(dir, f), activitySummarySchema.nullable(), () => null);
        if (a) out.push(a);
      }
      return out;
    },
    /** Removes one activity's file (incremental rebuild, when its raw summary is gone). */
    remove: (id: ActivityId) => rm(fileFor(id), { force: true }),
    /** Removes the whole derived directory (used by `npm run rebuild`). */
    clear: () => rm(dir, { recursive: true, force: true }),
  };
}

/** `data/index.json`: all activity summaries, newest first. Rebuilt from activities/. */
export function createIndexStore(dataDir: string) {
  const file = path.join(dataDir, 'index.json');
  return {
    file,
    read: (): Promise<ActivityIndex> =>
      readJsonFile(file, activityIndexSchema, () => ({
        schemaVersion: INDEX_SCHEMA_VERSION,
        generatedAt: new Date(0).toISOString(),
        activities: [],
      })),
    write: (index: ActivityIndex) => writeJsonFile(file, index),
  };
}

export type ActivityStore = ReturnType<typeof createActivityStore>;
export type IndexStore = ReturnType<typeof createIndexStore>;
