import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ActivityId, ActivitySummary, FitStore, RideMerge } from '@app/shared';
import { decodeFit } from '../fit/parseFit.js';
import { joinRecordings, mergeSummaries, type Recording } from './mergeRides.js';
import { summaryFromRaw } from './summaryFromRaw.js';

/** One recording's source files as stored: raw/<id>.json, and fit/<id>.fit when there is one. */
interface RecordingFiles {
  id: ActivityId;
  raw: Buffer;
  fit: Uint8Array | null;
}

/**
 * What one ride is built from: a single recording, or several joined by settings/ride-merges.json
 * (earliest first, the ride keeping the first one's id).
 */
export interface RideSource {
  id: ActivityId;
  recordings: RecordingFiles[];
}

const sha1 = (bytes: Uint8Array | string) => createHash('sha1').update(bytes).digest('hex');

/**
 * Each merge by every activity id in it. Merges with a recording missing from raw/ (not synced
 * yet, or quarantined) are left out, so their recordings stay separate rides.
 */
export function mergesByRecording(
  merges: readonly RideMerge[],
  rawIds: ReadonlySet<string>,
  log: (message: string) => void,
): Map<string, RideMerge> {
  const byRecording = new Map<string, RideMerge>();
  for (const merge of merges) {
    const missing = merge.filter((id) => !rawIds.has(id));
    if (missing.length > 0) {
      log(`  merge ${merge.join(' + ')}: not applied, ${missing.join(', ')} not in raw/`);
      continue;
    }
    for (const id of merge) byRecording.set(id, merge);
  }
  return byRecording;
}

export async function readRideSource(
  ids: readonly ActivityId[],
  rawDir: string,
  fitStore: FitStore,
): Promise<RideSource> {
  const recordings: RecordingFiles[] = [];
  for (const id of ids) {
    const raw = await readFile(path.join(rawDir, `${id}.json`));
    const hasFit = await fitStore.has(id);
    const fit = hasFit ? new Uint8Array(await readFile(fitStore.fileFor(id))) : null;
    recordings.push({ id, raw, fit });
  }
  return { id: ids[0]!, recordings };
}

/** Streams need a FIT file for every recording: a joined stream with a part missing would mislead. */
export const hasEveryFit = (source: RideSource) => source.recordings.every((recording) => recording.fit !== null);

/**
 * Fingerprints for the manifest. A single recording keeps the plain file hashes; a merge hashes
 * its recordings' ids and hashes together, so joining, splitting or changing a part rebuilds it.
 */
export function sourceFingerprint(source: RideSource): { raw: string; fit: string | null } {
  const [only] = source.recordings;
  if (source.recordings.length === 1 && only) {
    return { raw: sha1(only.raw), fit: only.fit ? sha1(only.fit) : null };
  }
  const rawParts = source.recordings.map((recording) => `${recording.id}:${sha1(recording.raw)}`);
  const fitParts = source.recordings.map((recording) => `${recording.id}:${recording.fit ? sha1(recording.fit) : ''}`);
  return {
    raw: sha1(rawParts.join('\n')),
    fit: hasEveryFit(source) ? sha1(fitParts.join('\n')) : null,
  };
}

/** The ride's summary from its Garmin summaries (joined for a merge), before any stream metrics. */
export function baseSummaryOf(source: RideSource): ActivitySummary {
  const summaries = source.recordings.map((recording) => summaryFromRaw(JSON.parse(recording.raw.toString('utf8'))));
  const [only] = summaries;
  if (summaries.length === 1 && only) return only;
  return mergeSummaries(summaries);
}

/** Decoded FIT records and laps of the ride, the recordings of a merge joined into one. */
export function decodeSource(source: RideSource): Recording {
  const decoded = source.recordings.map((recording) => decodeFit(recording.fit!));
  const [only] = decoded;
  if (decoded.length === 1 && only) return only;
  return joinRecordings(decoded);
}
