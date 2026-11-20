import path from 'node:path';
import type { ActivityId } from '../activityId.js';
import { atomicWrite } from './atomicWrite.js';
import { fileExists } from './fsUtil.js';

/** `data/fit/<id>.fit`: raw FIT bytes as downloaded. Never modified after writing. */
export function createFitStore(dataDir: string) {
  const fileFor = (id: ActivityId) => path.join(dataDir, 'fit', `${id}.fit`);
  return {
    fileFor,
    has: (id: ActivityId) => fileExists(fileFor(id)),
    write: (id: ActivityId, bytes: Uint8Array) => atomicWrite(fileFor(id), bytes),
  };
}

export type FitStore = ReturnType<typeof createFitStore>;
