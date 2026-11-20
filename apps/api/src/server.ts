import {
  createSyncStateStore,
  createHeatmapStore,
  createLoadStore,
  createRecordsStore,
  createClimbsStore,
  createRepeatsStore,
  createGarminCheckStore,
  createTrendsStore,
  createSettingsStore,
  createStreamStore,
  loadDotEnv,
  readConfig,
} from '@app/shared';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createIndexCache } from './indexCache.js';
import { createSyncJob, npmSyncSpawner } from './syncJob.js';
import { appRouter, type ApiContext, type AppRouter } from './router.js';

function localToday(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

async function main(): Promise<void> {
  loadDotEnv();
  const config = readConfig();
  const port = Number(process.env['API_PORT'] ?? 3001);
  // Localhost only. Put auth or a VPN in front before exposing it anywhere else.
  const host = process.env['API_HOST'] ?? '127.0.0.1';

  const index = createIndexCache(config.dataDir);
  const initial = await index.get();
  const ctx: ApiContext = {
    index,
    settings: createSettingsStore(config.dataDir),
    streams: createStreamStore(config.dataDir),
    load: createLoadStore(config.dataDir),
    heatmap: createHeatmapStore(config.dataDir),
    trends: createTrendsStore(config.dataDir),
    records: createRecordsStore(config.dataDir),
    climbs: createClimbsStore(config.dataDir),
    repeats: createRepeatsStore(config.dataDir),
    garminCheck: createGarminCheckStore(config.dataDir),
    syncState: createSyncStateStore(config.dataDir),
    // The repo root (two levels up from apps/api/src), where `npm run sync` is defined.
    syncJob: createSyncJob({
      spawner: npmSyncSpawner(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')),
    }),
    today: () => localToday(),
  };

  // tRPC batches put the joined procedure names ("a.b,c.d,…") in one route parameter. Fastify's
  // default limit of 100 characters answers 414 for any batch of more than a few queries. The web
  // client caps URLs at 2000 characters, so this never binds.
  const app = Fastify({ logger: { level: 'warn' }, maxParamLength: 5000 });
  await app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: () => ctx,
      onError: ({ path, error }) => {
        if (error.code === 'INTERNAL_SERVER_ERROR') app.log.error({ path, err: error }, 'tRPC error');
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  });
  app.get('/health', async () => ({ ok: true }));

  await app.listen({ port, host });
  console.log(`API on http://${host}:${port} — ${initial.activities.length} activities from ${config.dataDir}`);
}

main().catch((err: unknown) => {
  console.error(`API failed to start: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
