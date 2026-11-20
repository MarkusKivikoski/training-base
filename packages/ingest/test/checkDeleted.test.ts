import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createQuarantineStore, type ActivityId } from '@app/shared';
import { describe, expect, it } from 'vitest';
import type { SearchParams } from '../src/garmin/client.js';
import { checkRange, findDeleted } from '../src/sync/checkDeleted.js';
import { useTempDir } from './helpers.js';

const local = [
  { id: '1', date: '2026-01-05', name: 'A' },
  { id: '2', date: '2026-02-10', name: 'B' },
  { id: '3', date: '2026-03-20', name: 'C' },
  { id: '4', date: '2026-03-21', name: 'D' },
];

/** A fake Garmin list that pages `remote` by date, like the real search endpoint. */
function fakeClient(remote: Array<{ id: string; date: string }>) {
  const calls: SearchParams[] = [];
  return {
    calls,
    searchActivities: async (p: SearchParams) => {
      calls.push(p);
      const inRange = remote.filter((r) => r.date >= p.startDate && r.date <= p.endDate);
      return inRange.slice(p.start, p.start + p.limit).map((r) => ({ id: r.id as ActivityId, raw: {} }));
    },
  };
}

describe('findDeleted', () => {
  it('reports cached activities Garmin no longer lists, listing the whole range in chunks and pages', async () => {
    const client = fakeClient([
      { id: '1', date: '2026-01-05' },
      { id: '3', date: '2026-03-20' },
      { id: '4', date: '2026-03-21' },
      { id: '9', date: '2026-03-21' }, // only in Garmin: not our concern here
    ]);
    const { missing, listed } = await findDeleted(
      { client, log: () => {}, pause: async () => {}, pageSize: 2 },
      local,
      { from: '2026-01-05', to: '2026-03-31' },
    );
    expect(missing.map((a) => a.id)).toEqual(['2']);
    expect(listed).toBe(4);
    // Padded by a day each side, 30-day chunks, and a second page where a chunk was full.
    expect(client.calls[0]).toMatchObject({ startDate: '2026-01-04', start: 0 });
    expect(client.calls.at(-1)!.endDate).toBe('2026-04-01');
    expect(client.calls.some((c) => c.start === 2)).toBe(true);
  });

  it('only judges activities inside the checked range', async () => {
    const { missing } = await findDeleted({ client: fakeClient([]), log: () => {}, pause: async () => {} }, local, {
      from: '2026-03-01',
      to: '2026-03-31',
    });
    expect(missing.map((a) => a.id)).toEqual(['3', '4']);
  });

  it('checks from the oldest cached activity through today', () => {
    expect(checkRange(local, '2026-11-08')).toEqual({ from: '2026-01-05', to: '2026-11-08' });
    expect(checkRange([], '2026-11-08')).toBeNull();
  });
});

describe('quarantine store', () => {
  const tempDir = useTempDir();
  it('moves raw and FIT files instead of deleting them', async () => {
    const dir = tempDir();
    await mkdir(path.join(dir, 'raw'), { recursive: true });
    await mkdir(path.join(dir, 'fit'), { recursive: true });
    await writeFile(path.join(dir, 'raw', '7.json'), '{}');
    await writeFile(path.join(dir, 'fit', '7.fit'), 'x');
    const store = createQuarantineStore(dir);
    expect(await store.move('7' as ActivityId)).toEqual(['raw/7.json', 'fit/7.fit']);
    expect(await readdir(path.join(dir, 'raw'))).toEqual([]);
    expect((await readdir(store.dirFor('7' as ActivityId))).sort()).toEqual(['7.fit', '7.json']);
    expect(await store.move('8' as ActivityId)).toEqual([]);
  });
});
