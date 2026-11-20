import type { SyncErrorCode } from '@app/shared';
import { GarminConfigError, GarminHttpError, GarminKeyRejectedError } from '../garmin/errors.js';
import { SyncLockedError } from './lock.js';

/** Maps a failure to a code the UI can explain. Messages stay the error's own (secret-free). */
export function classifySyncError(err: unknown): SyncErrorCode {
  if (err instanceof SyncLockedError) return 'locked';
  if (err instanceof GarminKeyRejectedError) return 'key';
  if (err instanceof GarminConfigError) return 'config';
  if (err instanceof GarminHttpError)
    return err.status === 429 ? 'rate' : err.status === 401 || err.status === 403 ? 'key' : 'other';
  const text = `${err instanceof Error ? err.message : String(err)} ${(err as { cause?: { code?: string } })?.cause?.code ?? ''}`;
  if (/fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|network/i.test(text)) return 'offline';
  return 'other';
}
