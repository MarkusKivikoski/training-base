import path from 'node:path';
import { manifestSchema, type Manifest } from '../schemas/manifest.js';
import { readJsonFile, writeJsonFile } from './jsonFile.js';

/** `data/derived/manifest.json`: per-ride input fingerprints for incremental rebuilds. */
export function createManifestStore(dataDir: string) {
  const file = path.join(dataDir, 'derived', 'manifest.json');
  return {
    file,
    /** Null when there is none yet (or after a full clear), which means: rebuild everything. */
    read: (): Promise<Manifest | null> => readJsonFile(file, manifestSchema.nullable(), () => null),
    write: (value: Manifest) => writeJsonFile(file, manifestSchema.parse(value)),
  };
}

export type ManifestStore = ReturnType<typeof createManifestStore>;
