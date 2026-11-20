import { rm } from 'node:fs/promises';
import path from 'node:path';
import { dailyLoadFileSchema, LOAD_SCHEMA_VERSION, type DailyLoadFile } from '../schemas/activity.js';
import { readJsonFile, writeJsonFile } from './jsonFile.js';

/** `data/derived/`: aggregate derived data. `daily-load.json` holds TSS/CTL/ATL/TSB per day. */
export function createLoadStore(dataDir: string) {
  const dir = path.join(dataDir, 'derived');
  const file = path.join(dir, 'daily-load.json');
  return {
    file,
    read: (): Promise<DailyLoadFile> =>
      readJsonFile(file, dailyLoadFileSchema, () => ({
        schemaVersion: LOAD_SCHEMA_VERSION,
        generatedAt: new Date(0).toISOString(),
        days: [],
        allActivities: [],
      })),
    write: (value: DailyLoadFile) => writeJsonFile(file, value),
    clear: () => rm(dir, { recursive: true, force: true }),
  };
}

export type LoadStore = ReturnType<typeof createLoadStore>;
