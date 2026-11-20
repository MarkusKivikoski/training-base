import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import type { ActivityId } from '../activityId.js';
import { fileExists } from './fsUtil.js';

/**
 * `data/quarantine/<id>/`: raw summaries and FIT files of activities removed from the app
 * (deleted in Garmin Connect). Moved, never deleted, so moving them back to raw/ and fit/ and
 * rebuilding restores an activity.
 */
export function createQuarantineStore(dataDir: string) {
  const dirFor = (id: ActivityId) => path.join(dataDir, 'quarantine', id);
  return {
    dirFor,
    /** Moves raw/<id>.json and fit/<id>.fit into quarantine. Returns the files moved (relative to data/). */
    async move(id: ActivityId): Promise<string[]> {
      const moved: string[] = [];
      for (const [sub, file] of [
        ['raw', `${id}.json`],
        ['fit', `${id}.fit`],
      ] as const) {
        const src = path.join(dataDir, sub, file);
        if (!(await fileExists(src))) continue;
        await mkdir(dirFor(id), { recursive: true });
        await rename(src, path.join(dirFor(id), file));
        moved.push(`${sub}/${file}`);
      }
      return moved;
    },
  };
}

export type QuarantineStore = ReturnType<typeof createQuarantineStore>;
