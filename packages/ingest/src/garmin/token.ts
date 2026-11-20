import { GarminHttpError, GarminKeyRejectedError, GarminResponseError } from './errors.js';
import type { Http } from './http.js';

// From Garmin's official client (garmin/connect-personal-api-python, constants.py).
export const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';

const HOUR_MS = 60 * 60 * 1000;
/** Renew this long before the JWT's own expiry. */
const EXPIRY_MARGIN_MS = HOUR_MS;
/** Tokens are valid for 24h; renew at about 23h regardless of `exp`. */
const MAX_TOKEN_AGE_MS = 23 * HOUR_MS;

/** Reads the `exp` claim (seconds since epoch) without verifying the signature. */
export function decodeJwtExp(token: string): number {
  const payload = token.split('.')[1];
  if (!payload) throw new GarminResponseError('Token endpoint did not return a JWT');
  let exp: unknown;
  try {
    exp = (JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown }).exp;
  } catch {
    throw new GarminResponseError('Token endpoint returned an unreadable JWT payload');
  }
  if (typeof exp !== 'number' || !Number.isFinite(exp)) {
    throw new GarminResponseError('Token endpoint returned a JWT without an exp claim');
  }
  return exp;
}

export interface TokenProvider {
  /** Returns a valid bearer token, fetching a new one when needed. */
  get(): Promise<string>;
  /** Forgets the cached token, e.g. after a 401 on a data request. */
  invalidate(): void;
}

export function createTokenProvider(opts: { http: Http; apiKey: string; now?: () => number }): TokenProvider {
  const { http, apiKey, now = Date.now } = opts;
  let cached: { token: string; renewAt: number } | undefined;
  let inFlight: Promise<string> | undefined;

  async function fetchToken(): Promise<string> {
    let res: Response;
    try {
      res = await http.request(TOKEN_PATH, {
        method: 'POST',
        headers: { Accept: '*/*', Authorization: `ApiKey ${apiKey}` },
      });
    } catch (err) {
      if (err instanceof GarminHttpError && (err.status === 401 || err.status === 403)) {
        throw new GarminKeyRejectedError();
      }
      throw err;
    }
    // The token endpoint returns the JWT as plain text, not JSON.
    const token = (await res.text()).trim();
    const expMs = decodeJwtExp(token) * 1000;
    const issuedAt = now();
    cached = { token, renewAt: Math.min(expMs - EXPIRY_MARGIN_MS, issuedAt + MAX_TOKEN_AGE_MS) };
    return token;
  }

  return {
    async get() {
      if (cached && now() < cached.renewAt) return cached.token;
      inFlight ??= fetchToken().finally(() => {
        inFlight = undefined;
      });
      return inFlight;
    },
    invalidate() {
      cached = undefined;
    },
  };
}
