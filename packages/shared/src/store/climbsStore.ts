import path from 'node:path';
import { CLIMBS_SCHEMA_VERSION, climbsFileSchema, type ClimbsFile } from '../schemas/climbs.js';
import { readJsonFile, writeJsonFile } from './jsonFile.js';

/** `data/derived/climbs.json`: climbs found in outdoor rides and every effort on them. Derived data. */
export function createClimbsStore(dataDir: string) {
  const file = path.join(dataDir, 'derived', 'climbs.json');
  return {
    file,
    read: (): Promise<ClimbsFile> =>
      readJsonFile(file, climbsFileSchema, () => ({
        schemaVersion: CLIMBS_SCHEMA_VERSION,
        generatedAt: new Date(0).toISOString(),
        climbs: [],
      })),
    write: (value: ClimbsFile) => writeJsonFile(file, climbsFileSchema.parse(value)),
  };
}

export type ClimbsStore = ReturnType<typeof createClimbsStore>;
