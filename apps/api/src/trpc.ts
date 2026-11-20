import { initTRPC } from '@trpc/server';
import type {
  ClimbsStore,
  GarminCheckStore,
  HeatmapStore,
  LoadStore,
  RecordsStore,
  RepeatsStore,
  SettingsStore,
  StreamStore,
  SyncStateStore,
  TrendsStore,
} from '@app/shared';
import type { IndexCache } from './indexCache.js';
import type { SyncJob } from './syncJob.js';

export interface ApiContext {
  index: IndexCache;
  settings: SettingsStore;
  streams: StreamStore;
  load: LoadStore;
  heatmap: HeatmapStore;
  trends: TrendsStore;
  records: RecordsStore;
  climbs: ClimbsStore;
  repeats: RepeatsStore;
  garminCheck: GarminCheckStore;
  syncState: SyncStateStore;
  /** The background sync started by the Sync now button. */
  syncJob: SyncJob;
  /** Local date "today", YYYY-MM-DD. */
  today: () => string;
}

/** The one tRPC instance every router file builds on. */
export const t = initTRPC.context<ApiContext>().create();
