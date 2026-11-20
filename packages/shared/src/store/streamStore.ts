import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { ActivityId } from '../activityId.js';
import { routeSchema, streamSchema, type ActivityRoute, type ActivityStream } from '../schemas/stream.js';
import { atomicWrite } from './atomicWrite.js';
import { readJsonFile, writeJsonFile } from './jsonFile.js';

/** `data/streams/<id>.json.gz`: per-second columnar streams. Derived data. */
export function createStreamStore(dataDir: string) {
  const dir = path.join(dataDir, 'streams');
  const fileFor = (id: ActivityId) => path.join(dir, `${id}.json.gz`);
  return {
    fileFor,
    async read(id: ActivityId): Promise<ActivityStream | null> {
      let gz: Buffer;
      try {
        gz = await readFile(fileFor(id));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw err;
      }
      const parsed = streamSchema.safeParse(JSON.parse(gunzipSync(gz).toString('utf8')));
      if (!parsed.success) throw new Error(`${fileFor(id)} failed validation`);
      return parsed.data;
    },
    /** gzip output is deterministic (the header mtime is 0), so re-runs are byte-identical. */
    write: (id: ActivityId, stream: ActivityStream) =>
      atomicWrite(fileFor(id), gzipSync(JSON.stringify(stream), { level: 9 })),
    remove: (id: ActivityId) => rm(fileFor(id), { force: true }),
    clear: () => rm(dir, { recursive: true, force: true }),
  };
}

/** `data/routes/<id>.json`: simplified [lng, lat] polyline, outdoor rides only. Derived data. */
export function createRouteStore(dataDir: string) {
  const dir = path.join(dataDir, 'routes');
  const fileFor = (id: ActivityId) => path.join(dir, `${id}.json`);
  return {
    fileFor,
    read: (id: ActivityId): Promise<ActivityRoute | null> =>
      readJsonFile(fileFor(id), routeSchema.nullable(), () => null),
    write: (id: ActivityId, route: ActivityRoute) => writeJsonFile(fileFor(id), route),
    remove: (id: ActivityId) => rm(fileFor(id), { force: true }),
    clear: () => rm(dir, { recursive: true, force: true }),
  };
}

export type StreamStore = ReturnType<typeof createStreamStore>;
export type RouteStore = ReturnType<typeof createRouteStore>;
