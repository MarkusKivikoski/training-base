import { describe, expect, it, vi } from 'vitest';
import { GarminHttpError, GarminKeyRejectedError, GarminResponseError } from '../src/garmin/errors.js';
import type { Http } from '../src/garmin/http.js';
import { createTokenProvider, decodeJwtExp, TOKEN_PATH } from '../src/garmin/token.js';
import { fakeClock, makeJwt } from './helpers.js';

const HOUR = 3_600_000;
const KEY = 'super-secret-api-key';

function setup(issue: () => Response | Error) {
  const clock = fakeClock();
  const request = vi.fn(async (path: string, opts?: Parameters<Http['request']>[1]) => {
    void path;
    void opts;
    const r = issue();
    if (r instanceof Error) throw r;
    return r;
  });
  const tokens = createTokenProvider({ http: { request }, apiKey: KEY, now: clock.now });
  return { tokens, request, clock };
}

const jwtExpiringIn = (clockNow: number, ms: number) =>
  makeJwt({ exp: Math.floor((clockNow + ms) / 1000), scope: ['PERSONAL_API_FITNESS_READ'] });

describe('decodeJwtExp', () => {
  it('reads the exp claim', () => {
    expect(decodeJwtExp(makeJwt({ exp: 1234 }))).toBe(1234);
  });
  it('rejects non-JWTs and JWTs without exp', () => {
    expect(() => decodeJwtExp('opaque-token')).toThrow(GarminResponseError);
    expect(() => decodeJwtExp(makeJwt({ sub: 'x' }))).toThrow(/exp claim/);
  });
});

describe('createTokenProvider', () => {
  it('POSTs the key to the token endpoint and returns the plain-text JWT', async () => {
    const clock = fakeClock();
    const jwt = jwtExpiringIn(clock.now(), 24 * HOUR);
    const { tokens, request } = setup(() => new Response(`${jwt}\n`));
    expect(await tokens.get()).toBe(jwt);
    expect(request).toHaveBeenCalledWith(TOKEN_PATH, {
      method: 'POST',
      headers: { Accept: '*/*', Authorization: `ApiKey ${KEY}` },
    });
  });

  it('caches the token and renews it at 23h for a 24h token', async () => {
    let n = 0;
    const { tokens, request, clock } = setup(() => new Response(jwtExpiringIn(clock.now(), 24 * HOUR) + `#${n++}`));
    // The "#n" suffix makes each token distinct; it sits in the signature segment, so exp still parses.
    const first = await tokens.get();
    clock.advance(23 * HOUR - 1000);
    expect(await tokens.get()).toBe(first);
    clock.advance(2000);
    expect(await tokens.get()).not.toBe(first);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('renews an hour before exp when the token is short-lived', async () => {
    const { tokens, request, clock } = setup(() => new Response(jwtExpiringIn(clock.now(), 2 * HOUR)));
    await tokens.get();
    clock.advance(HOUR + 1000);
    await tokens.get();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('fetches a new token after invalidate()', async () => {
    const { tokens, request, clock } = setup(() => new Response(jwtExpiringIn(clock.now(), 24 * HOUR)));
    await tokens.get();
    tokens.invalidate();
    await tokens.get();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight request between concurrent callers', async () => {
    const { tokens, request, clock } = setup(() => new Response(jwtExpiringIn(clock.now(), 24 * HOUR)));
    await Promise.all([tokens.get(), tokens.get(), tokens.get()]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])('maps HTTP %i to GarminKeyRejectedError without leaking the key', async (status) => {
    const { tokens } = setup(() => new GarminHttpError(status, 'POST', TOKEN_PATH));
    const err = (await tokens.get().catch((e: unknown) => e)) as Error;
    expect(err).toBeInstanceOf(GarminKeyRejectedError);
    expect(err.message).not.toContain(KEY);
    expect(err.message).toMatch(/rejected or has expired/);
  });

  it('passes other HTTP errors through', async () => {
    const { tokens } = setup(() => new GarminHttpError(500, 'POST', TOKEN_PATH));
    await expect(tokens.get()).rejects.toBeInstanceOf(GarminHttpError);
  });
});
