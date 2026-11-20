import path from 'node:path';
import { RECORDS_SCHEMA_VERSION, recordsFileSchema, type RecordsFile } from '../schemas/records.js';
import { readJsonFile, writeJsonFile } from './jsonFile.js';

/** `data/derived/records.json`: personal records per discipline, for all time and each year. Derived data. */
export function createRecordsStore(dataDir: string) {
  const file = path.join(dataDir, 'derived', 'records.json');
  return {
    file,
    read: (): Promise<RecordsFile> =>
      readJsonFile(file, recordsFileSchema, () => ({
        schemaVersion: RECORDS_SCHEMA_VERSION,
        generatedAt: new Date(0).toISOString(),
        today: '1970-01-01',
        disciplines: { cycling: { years: [], scopes: {} }, running: { years: [], scopes: {} } },
      })),
    write: (value: RecordsFile) => writeJsonFile(file, recordsFileSchema.parse(value)),
  };
}

export type RecordsStore = ReturnType<typeof createRecordsStore>;
