import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const DEFAULT_GARMIN_BASE_URL = 'https://personal.connectapi.garmin.com';

const envSchema = z.object({
  GARMIN_PERSONAL_API_KEY: z.string().trim().min(1).optional(),
  GARMIN_PERSONAL_API_BASE_URL: z.url().optional(),
  DATA_DIR: z.string().trim().min(1).optional(),
});

export interface AppConfig {
  /** Undefined when not configured. Never log or echo this value. */
  garminApiKey: string | undefined;
  garminBaseUrl: string;
  dataDir: string;
}

/** Loads `<repo>/.env` into process.env if it exists. Variables already set win. */
export function loadDotEnv(file = path.join(REPO_ROOT, '.env')): void {
  if (existsSync(file)) process.loadEnvFile(file);
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    // Name the offending variables only; their values may be secrets.
    const names = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))].join(', ');
    throw new Error(`Invalid environment configuration: ${names}`);
  }
  const e = parsed.data;
  return {
    garminApiKey: e.GARMIN_PERSONAL_API_KEY,
    garminBaseUrl: (e.GARMIN_PERSONAL_API_BASE_URL ?? DEFAULT_GARMIN_BASE_URL).replace(/\/+$/, ''),
    dataDir: path.resolve(REPO_ROOT, e.DATA_DIR ?? 'data'),
  };
}
