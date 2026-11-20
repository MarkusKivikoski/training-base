import path from 'node:path';
import { z } from 'zod';
import { readJsonFile, writeJsonFile } from './jsonFile.js';

export const GARMIN_CHECK_SCHEMA_VERSION = 1 as const;

/** `data/garmin-check.json`: result of the last check for activities deleted in Garmin Connect. */
export const garminCheckSchema = z.object({
  schemaVersion: z.literal(GARMIN_CHECK_SCHEMA_VERSION),
  checkedAt: z.iso.datetime().nullable(),
  /** Inclusive date range that was listed from Garmin. */
  from: z.iso.date().nullable(),
  to: z.iso.date().nullable(),
  /** Cached locally but not listed by Garmin in that range: probably deleted there. */
  missing: z.array(z.object({ id: z.string(), date: z.iso.date(), name: z.string() })),
  /** Moved to data/quarantine/ by `check-deleted --quarantine`. */
  quarantined: z.array(z.string()),
});

export type GarminCheck = z.infer<typeof garminCheckSchema>;

export function createGarminCheckStore(dataDir: string) {
  const file = path.join(dataDir, 'garmin-check.json');
  return {
    file,
    read: (): Promise<GarminCheck> =>
      readJsonFile(file, garminCheckSchema, () => ({
        schemaVersion: GARMIN_CHECK_SCHEMA_VERSION,
        checkedAt: null,
        from: null,
        to: null,
        missing: [],
        quarantined: [],
      })),
    write: (value: GarminCheck) => writeJsonFile(file, garminCheckSchema.parse(value)),
  };
}

export type GarminCheckStore = ReturnType<typeof createGarminCheckStore>;
