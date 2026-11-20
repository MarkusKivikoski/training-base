import { rm } from 'node:fs/promises';
import path from 'node:path';
import { HEATMAP_SCHEMA_VERSION, heatmapFileSchema, type HeatmapFile } from '../schemas/heatmap.js';
import { atomicWrite } from './atomicWrite.js';
import { readJsonFile } from './jsonFile.js';

/** `data/derived/heatmap.json`: combined outdoor routes for the heatmap. Derived data. */
export function createHeatmapStore(dataDir: string) {
  const file = path.join(dataDir, 'derived', 'heatmap.json');
  return {
    file,
    read: (): Promise<HeatmapFile> =>
      readJsonFile(file, heatmapFileSchema, () => ({
        schemaVersion: HEATMAP_SCHEMA_VERSION,
        generatedAt: new Date(0).toISOString(),
        trimM: 0,
        routes: [],
      })),
    // Compact, unlike other JSON files: this one holds every route's coordinates.
    write: (value: HeatmapFile) => atomicWrite(file, `${JSON.stringify(heatmapFileSchema.parse(value))}\n`),
    clear: () => rm(file, { force: true }),
  };
}

export type HeatmapStore = ReturnType<typeof createHeatmapStore>;
