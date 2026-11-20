import type { GarminClient } from '../garmin/client.js';
import { CHUNK_DAYS } from './backfill.js';
import { addDays, maxDate, type IsoDate } from './dates.js';

export interface LocalActivity {
  id: string;
  date: string;
  name: string;
}

export interface DeletedCheckDeps {
  client: Pick<GarminClient, 'searchActivities'>;
  log: (message: string) => void;
  /** Waits between list requests, to stay well inside Garmin's rate limits. */
  pause: () => Promise<void>;
  pageSize?: number;
}

/**
 * Lists every activity Garmin has between `from` and `to` (30-day chunks, oldest first, list
 * requests only) and returns the local activities in that range Garmin no longer lists, plus how
 * many activities Garmin listed. Dates
 * are padded by a day on each side, since Garmin's date filter and our local dates can differ
 * around midnight.
 */
export async function findDeleted(
  deps: DeletedCheckDeps,
  local: readonly LocalActivity[],
  { from, to }: { from: IsoDate; to: IsoDate },
): Promise<{ missing: LocalActivity[]; listed: number }> {
  const limit = deps.pageSize ?? 100;
  const remote = new Set<string>();
  const last = addDays(to, 1);
  for (let start = addDays(from, -1); start <= last; start = addDays(start, CHUNK_DAYS)) {
    const end = addDays(start, CHUNK_DAYS - 1) < last ? addDays(start, CHUNK_DAYS - 1) : last;
    for (let offset = 0; ; offset += limit) {
      const items = await deps.client.searchActivities({ start: offset, limit, startDate: start, endDate: end });
      for (const item of items) remote.add(item.id);
      if (items.length < limit) break;
      await deps.pause();
    }
    deps.log(`  ${start} .. ${end}: ${remote.size} listed so far`);
    await deps.pause();
  }
  const missing = local
    .filter((a) => a.date >= from && a.date <= to && !remote.has(a.id))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { missing, listed: remote.size };
}

/** Range to check: from the oldest local activity through today. */
export function checkRange(local: readonly LocalActivity[], today: IsoDate): { from: IsoDate; to: IsoDate } | null {
  if (local.length === 0) return null;
  const oldest = local.reduce((min, a) => (a.date < min ? a.date : min), local[0]!.date) as IsoDate;
  return { from: oldest, to: maxDate(today, oldest) };
}
