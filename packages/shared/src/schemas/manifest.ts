import { z } from 'zod';

export const MANIFEST_SCHEMA_VERSION = 1 as const;

/**
 * Fingerprints of one ride's inputs at its last rebuild. When they still match, an incremental
 * rebuild reuses the ride's derived files instead of re-parsing its FIT file.
 */
export const manifestRideSchema = z.object({
  /** SHA-1 of raw/<id>.json. */
  raw: z.string(),
  /** SHA-1 of fit/<id>.fit, or null without a FIT file. */
  fit: z.string().nullable(),
  /** SHA-1 of the settings that change per-ride values (FTP and LTHR histories). */
  settings: z.string(),
  /** The FIT problem from the last parse, so incremental rebuilds keep reporting it. */
  error: z.string().optional(),
  /** The FIT file holds no records (a manual entry), so the ride has no streams. Not a problem. */
  noRecords: z.literal(true).optional(),
});

/** derived/manifest.json: what each ride's derived files were built from. Derived data. */
export const manifestSchema = z.object({
  schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
  /** Formula and schema versions the files were built with; a mismatch forces a full rebuild. */
  derivedVersion: z.string(),
  rides: z.record(z.string(), manifestRideSchema),
});

export type ManifestRide = z.infer<typeof manifestRideSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
