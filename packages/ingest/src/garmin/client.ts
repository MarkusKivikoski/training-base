import { activityListSchema, toActivityId, type ActivityId } from '@app/shared';
import { GarminHttpError, GarminResponseError } from './errors.js';
import type { Http, RequestOptions } from './http.js';
import type { TokenProvider } from './token.js';

// Paths from Garmin's official client (garmin/connect-personal-api-python, client.py).
export const ACTIVITY_SEARCH_PATH = '/activitylist-service/activities/search/activities';
export const activityDownloadPath = (id: ActivityId) => `/download-service/files/activity/${id}`;

export interface SearchParams {
  start: number;
  limit: number;
  /** YYYY-MM-DD, inclusive. */
  startDate: string;
  /** YYYY-MM-DD, inclusive. */
  endDate: string;
}

export interface ListedActivity {
  id: ActivityId;
  /** The list item exactly as Garmin returned it. */
  raw: unknown;
}

export interface Download {
  bytes: Uint8Array;
  contentType: string | null;
}

export interface GarminClient {
  /** Unvalidated JSON, for the probe. */
  searchActivitiesRaw(params: SearchParams): Promise<unknown>;
  searchActivities(params: SearchParams): Promise<ListedActivity[]>;
  /** Returns the download as received. Garmin sends a ZIP that wraps the FIT file. */
  downloadActivity(id: ActivityId): Promise<Download>;
}

export function createGarminClient({ http, tokens }: { http: Http; tokens: TokenProvider }): GarminClient {
  async function authed(path: string, options: RequestOptions): Promise<Response> {
    const send = async () =>
      http.request(path, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${await tokens.get()}` },
      });
    try {
      return await send();
    } catch (err) {
      // A token can be revoked before its exp. Retry once with a fresh one.
      if (err instanceof GarminHttpError && err.status === 401) {
        tokens.invalidate();
        return send();
      }
      throw err;
    }
  }

  async function searchActivitiesRaw(p: SearchParams): Promise<unknown> {
    const res = await authed(ACTIVITY_SEARCH_PATH, {
      headers: { Accept: 'application/json' },
      query: { start: p.start, limit: p.limit, startDate: p.startDate, endDate: p.endDate },
    });
    const text = await res.text();
    if (text.trim() === '') return [];
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new GarminResponseError('Activity list response was not valid JSON');
    }
  }

  return {
    searchActivitiesRaw,

    async searchActivities(p) {
      const json = await searchActivitiesRaw(p);
      const parsed = activityListSchema.safeParse(json);
      if (!parsed.success) {
        const where = parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('; ');
        throw new GarminResponseError(
          `Activity list response has an unexpected shape (${where}). Run \`npm run probe\` and update packages/shared/src/schemas/garmin.ts.`,
        );
      }
      // Keep the original elements, not zod's output, so raw/ stores exactly what Garmin sent.
      const items = json as unknown[];
      return parsed.data.map((item, i) => ({ id: toActivityId(item.activityId), raw: items[i] }));
    },

    async downloadActivity(id) {
      const res = await authed(activityDownloadPath(id), {
        headers: { Accept: 'application/zip, application/x-zip-compressed, application/octet-stream' },
      });
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length === 0) throw new GarminResponseError(`Download for activity ${id} was empty`);
      return { bytes, contentType: res.headers.get('content-type') };
    },
  };
}
