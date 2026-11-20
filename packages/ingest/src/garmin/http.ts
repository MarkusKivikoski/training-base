import { GarminHttpError } from './errors.js';

export interface HttpOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  /** Minimum gap between request starts. Garmin doesn't document rate limits, so stay conservative. */
  minIntervalMs?: number;
  /** Total attempts for retryable failures (429, 5xx, network errors, timeouts). */
  maxAttempts?: number;
  timeoutMs?: number;
  /** Base delay for exponential backoff. */
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
}

export interface Http {
  /** Resolves with a 2xx response. Throws GarminHttpError for other statuses once retries run out. */
  request(path: string, options?: RequestOptions): Promise<Response>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createHttp(options: HttpOptions): Http {
  const {
    baseUrl,
    fetch = globalThis.fetch,
    minIntervalMs = 1000,
    maxAttempts = 5,
    timeoutMs = 30_000,
    backoffBaseMs = 2000,
    backoffMaxMs = 120_000,
    sleep = defaultSleep,
    now = Date.now,
    random = Math.random,
  } = options;

  let nextSlot = 0;
  // Reserving slots synchronously keeps the pacing correct even for concurrent callers.
  async function pace(): Promise<void> {
    const t = now();
    const start = Math.max(t, nextSlot);
    nextSlot = start + minIntervalMs;
    if (start > t) await sleep(start - t);
  }

  function backoffDelay(attempt: number, res?: Response): number {
    const retryAfter = res ? parseRetryAfter(res.headers.get('retry-after'), now()) : undefined;
    if (retryAfter !== undefined) return Math.min(retryAfter, backoffMaxMs);
    const exp = Math.min(backoffBaseMs * 2 ** (attempt - 1), backoffMaxMs);
    return exp + Math.floor(random() * backoffBaseMs);
  }

  return {
    async request(path, { method = 'GET', query, headers } = {}) {
      const url = new URL(baseUrl + path);
      for (const [k, v] of Object.entries(query ?? {})) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }

      for (let attempt = 1; ; attempt++) {
        await pace();
        let res: Response;
        try {
          res = await fetch(url, {
            method,
            ...(headers ? { headers } : {}),
            signal: AbortSignal.timeout(timeoutMs),
          });
        } catch (err) {
          // Network failure or timeout. Rethrow without the URL or headers attached.
          if (attempt >= maxAttempts) {
            const reason = err instanceof Error ? err.name : 'unknown error';
            throw new Error(`Garmin API ${method} ${path} failed after ${attempt} attempts (${reason})`);
          }
          await sleep(backoffDelay(attempt));
          continue;
        }

        if (res.ok) return res;

        const retryable = res.status === 429 || res.status >= 500;
        await res.body?.cancel();
        if (!retryable || attempt >= maxAttempts) {
          throw new GarminHttpError(res.status, method, path);
        }
        await sleep(backoffDelay(attempt, res));
      }
    },
  };
}

/** Parses Retry-After (delta seconds or HTTP date) into milliseconds. */
export function parseRetryAfter(value: string | null, nowMs: number): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - nowMs);
}
