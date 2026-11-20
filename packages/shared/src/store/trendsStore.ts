import path from 'node:path';
import { TRENDS_SCHEMA_VERSION, trendsFileSchema, type TrendsFile } from '../schemas/trends.js';
import { readJsonFile, writeJsonFile } from './jsonFile.js';

/** `data/derived/trends.json`: long-term volume and fitness markers. Derived data. */
export function createTrendsStore(dataDir: string) {
  const file = path.join(dataDir, 'derived', 'trends.json');
  return {
    file,
    read: (): Promise<TrendsFile> =>
      readJsonFile(file, trendsFileSchema, () => ({
        schemaVersion: TRENDS_SCHEMA_VERSION,
        generatedAt: new Date(0).toISOString(),
        today: '1970-01-01',
        months: [],
        years: [],
        ftp: { manual: [], eftp: [] },
        vo2max: [],
        zones: { weeks: [], months: [] },
        rides: [],
        decoupling: [],
        maxHr: [],
      })),
    write: (value: TrendsFile) => writeJsonFile(file, trendsFileSchema.parse(value)),
  };
}

export type TrendsStore = ReturnType<typeof createTrendsStore>;
