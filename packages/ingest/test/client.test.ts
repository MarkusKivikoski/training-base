import { readFile } from 'node:fs/promises';
import { toActivityId } from '@app/shared';
import { describe, expect, it, vi } from 'vitest';
import { ACTIVITY_SEARCH_PATH, createGarminClient } from '../src/garmin/client.js';
import { GarminHttpError, GarminResponseError } from '../src/garmin/errors.js';
import type { Http, RequestOptions } from '../src/garmin/http.js';
import type { TokenProvider } from '../src/garmin/token.js';

function setup(handler: (path: string, opts: RequestOptions) => Response | Error) {
  const request = vi.fn(async (path: string, opts: RequestOptions = {}) => {
    const r = handler(path, opts);
    if (r instanceof Error) throw r;
    return r;
  });
  let n = 0;
  const tokens: TokenProvider = { get: vi.fn(async () => `token-${n}`), invalidate: vi.fn(() => void n++) };
  const http: Http = { request };
  return { client: createGarminClient({ http, tokens }), request, tokens };
}

const params = { start: 0, limit: 100, startDate: '2026-10-01', endDate: '2026-10-30' };

describe('searchActivities', () => {
  it('sends the bearer token and date range', async () => {
    const { client, request } = setup(() => Response.json([]));
    await client.searchActivities(params);
    expect(request).toHaveBeenCalledWith(ACTIVITY_SEARCH_PATH, {
      headers: { Accept: 'application/json', Authorization: 'Bearer token-0' },
      query: params,
    });
  });

  it('returns IDs plus the untouched raw item', async () => {
    const item = { zeta: 1, activityId: 42, nested: { a: [1, 2] } };
    const { client } = setup(() => Response.json([item]));
    const [first] = await client.searchActivities(params);
    expect(first?.id).toBe('42');
    expect(first?.raw).toEqual(item);
    expect(Object.keys(first?.raw as object)).toEqual(['zeta', 'activityId', 'nested']);
  });

  it('parses the real response shape (redacted fixture) and keeps every field', async () => {
    const fixture = JSON.parse(
      await readFile(new URL('./fixtures/activity-list.json', import.meta.url), 'utf8'),
    ) as unknown[];
    const { client } = setup(() => Response.json(fixture));
    const listed = await client.searchActivities(params);
    expect(listed.map((a) => a.id)).toEqual(['10000000001', '10000000002']);
    expect(listed.map((a) => a.raw)).toEqual(fixture);
  });

  it('treats an empty body as no activities', async () => {
    const { client } = setup(() => new Response(''));
    expect(await client.searchActivities(params)).toEqual([]);
  });

  it('reports schema mismatches by path', async () => {
    const { client } = setup(() => Response.json([{ id: 1 }]));
    await expect(client.searchActivities(params)).rejects.toThrow(/0\.activityId/);
    await expect(client.searchActivities(params)).rejects.toBeInstanceOf(GarminResponseError);
  });

  it('retries once with a fresh token after a 401', async () => {
    let calls = 0;
    const { client, tokens, request } = setup((path) =>
      calls++ === 0 ? new GarminHttpError(401, 'GET', path) : Response.json([]),
    );
    await client.searchActivities(params);
    expect(tokens.invalidate).toHaveBeenCalledTimes(1);
    expect((request.mock.calls[1] as [string, RequestOptions])[1].headers?.['Authorization']).toBe('Bearer token-1');
  });

  it('gives up after a second 401', async () => {
    const { client } = setup((path) => new GarminHttpError(401, 'GET', path));
    await expect(client.searchActivities(params)).rejects.toMatchObject({ status: 401 });
  });
});

describe('downloadActivity', () => {
  it('requests the download path and returns bytes plus content type', async () => {
    const { client, request } = setup(
      () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'application/zip' } }),
    );
    const d = await client.downloadActivity(toActivityId(7));
    expect(request.mock.calls[0]?.[0]).toBe('/download-service/files/activity/7');
    expect([...d.bytes]).toEqual([1, 2, 3]);
    expect(d.contentType).toBe('application/zip');
  });

  it('rejects an empty download', async () => {
    const { client } = setup(() => new Response(new Uint8Array()));
    await expect(client.downloadActivity(toActivityId(7))).rejects.toThrow(/empty/);
  });
});
