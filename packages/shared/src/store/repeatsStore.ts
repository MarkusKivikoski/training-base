import path from 'node:path';
import { REPEATS_SCHEMA_VERSION, repeatsFileSchema, type RepeatsFile } from '../schemas/repeats.js';
import { readJsonFile, writeJsonFile } from './jsonFile.js';

/** `data/derived/repeats.json`: repeated indoor workouts and outdoor routes, with every ride of each. Derived data. */
export function createRepeatsStore(dataDir: string) {
  const file = path.join(dataDir, 'derived', 'repeats.json');
  return {
    file,
    read: (): Promise<RepeatsFile> =>
      readJsonFile(file, repeatsFileSchema, () => ({
        schemaVersion: REPEATS_SCHEMA_VERSION,
        generatedAt: new Date(0).toISOString(),
        workouts: [],
        routes: [],
      })),
    write: (value: RepeatsFile) => writeJsonFile(file, repeatsFileSchema.parse(value)),
  };
}

export type RepeatsStore = ReturnType<typeof createRepeatsStore>;
