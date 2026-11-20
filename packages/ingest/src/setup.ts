import {
  createFitStore,
  createRawStore,
  createSyncStateStore,
  loadDotEnv,
  readConfig,
  type AppConfig,
} from '@app/shared';
import { createGarminClient, type GarminClient } from './garmin/client.js';
import { GarminConfigError } from './garmin/errors.js';
import { createHttp } from './garmin/http.js';
import { createTokenProvider } from './garmin/token.js';
import { localToday } from './sync/dates.js';
import type { SyncDeps } from './sync/syncRange.js';

export function loadConfig(): AppConfig {
  loadDotEnv();
  return readConfig();
}

export function createClientFromConfig(config: AppConfig): GarminClient {
  if (!config.garminApiKey) {
    throw new GarminConfigError('GARMIN_PERSONAL_API_KEY is not set. Add it to .env (see .env.example).');
  }
  const http = createHttp({ baseUrl: config.garminBaseUrl });
  const tokens = createTokenProvider({ http, apiKey: config.garminApiKey });
  return createGarminClient({ http, tokens });
}

export function createSyncDeps(
  config: AppConfig,
  opts: { refetch?: boolean; log?: (m: string) => void } = {},
): SyncDeps {
  return {
    client: createClientFromConfig(config),
    raw: createRawStore(config.dataDir),
    fit: createFitStore(config.dataDir),
    state: createSyncStateStore(config.dataDir),
    log: opts.log ?? ((m) => console.log(m)),
    today: () => localToday(),
    nowIso: () => new Date().toISOString(),
    refetch: opts.refetch ?? false,
  };
}
