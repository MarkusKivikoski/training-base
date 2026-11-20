import { describe, expect, it, vi } from 'vitest';
import { GarminHttpError } from '../src/garmin/errors.js';
import { createHttp, parseRetryAfter } from '../src/garmin/http.js';
import { fakeClock } from './helpers.js';

function setup(responses: Array<Response | Error>, opts: { minIntervalMs?: number } = {}) {
  const clock = fakeClock();
  const fetch = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    if (next instanceof Error) throw next;
    return next;
  });
  const http = createHttp({
    baseUrl: 'https://example.test',
    fetch: fetch as unknown as typeof globalThis.fetch,
    minIntervalMs: opts.minIntervalMs ?? 0,
    backoffBaseMs: 1000,
    sleep: clock.sleep,
    now: clock.now,
    random: () => 0,
  });
  return { http, fetch, clock };
}

describe('createHttp', () => {
  it('builds the URL with the query string, skipping undefined values', async () => {
    const { http, fetch } = setup([new Response('ok')]);
    await http.request('/a/b', { query: { start: 0, limit: 2, x: undefined } });
    expect(String((fetch.mock.calls[0] as unknown[])[0])).toBe('https://example.test/a/b?start=0&limit=2');
  });

  it('retries 429 honoring Retry-After seconds', async () => {
    const { http, clock } = setup([
      new Response('', { status: 429, headers: { 'retry-after': '7' } }),
      new Response('ok'),
    ]);
    const res = await http.request('/x');
    expect(await res.text()).toBe('ok');
    expect(clock.sleeps).toEqual([7000]);
  });

  it('retries 5xx with exponential backoff', async () => {
    const { http, clock } = setup([
      new Response('', { status: 500 }),
      new Response('', { status: 502 }),
      new Response('', { status: 503 }),
      new Response('ok'),
    ]);
    await http.request('/x');
    expect(clock.sleeps).toEqual([1000, 2000, 4000]);
  });

  it('retries network errors', async () => {
    const { http, fetch } = setup([new TypeError('fetch failed'), new Response('ok')]);
    await http.request('/x');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gives up after 5 attempts with a GarminHttpError', async () => {
    const { http, fetch } = setup(Array.from({ length: 6 }, () => new Response('', { status: 503 })));
    const err = await http.request('/x?y=1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GarminHttpError);
    expect((err as GarminHttpError).status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('does not retry other 4xx', async () => {
    const { http, fetch } = setup([new Response('', { status: 404 })]);
    await expect(http.request('/x')).rejects.toMatchObject({ status: 404 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('paces requests at least minIntervalMs apart', async () => {
    const { http, clock } = setup([new Response('1'), new Response('2'), new Response('3')], { minIntervalMs: 1000 });
    await http.request('/x');
    await http.request('/x');
    clock.advance(400);
    await http.request('/x');
    expect(clock.sleeps).toEqual([1000, 600]);
  });

  it('never puts request headers in error messages', async () => {
    const { http } = setup([new Response('', { status: 400 })]);
    const err = (await http
      .request('/x', { headers: { Authorization: 'ApiKey SECRET-KEY' } })
      .catch((e: unknown) => e)) as Error;
    expect(err.message).not.toContain('SECRET-KEY');
  });
});

describe('parseRetryAfter', () => {
  it('parses seconds and HTTP dates', () => {
    expect(parseRetryAfter('3', 0)).toBe(3000);
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 4000)).toBe(6000);
    expect(parseRetryAfter('soon', 0)).toBeUndefined();
    expect(parseRetryAfter(null, 0)).toBeUndefined();
  });
});
