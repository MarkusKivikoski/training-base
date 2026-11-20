/*
 * Error types for the Garmin client. Their messages must never contain the API key,
 * a bearer token, or request headers, because they end up in logs and sync-state.json.
 */

export class GarminKeyRejectedError extends Error {
  override readonly name = 'GarminKeyRejectedError';
  constructor() {
    super(
      'Garmin Personal API key was rejected or has expired. Create a new one at ' +
        'https://connect.garmin.com/app/settings/personalApiToken and update GARMIN_PERSONAL_API_KEY in .env.',
    );
  }
}

export class GarminConfigError extends Error {
  override readonly name = 'GarminConfigError';
}

export class GarminHttpError extends Error {
  override readonly name = 'GarminHttpError';
  constructor(
    readonly status: number,
    readonly method: string,
    /** Path without the query string. */
    readonly path: string,
  ) {
    super(`Garmin API ${method} ${path} failed with HTTP ${status}`);
  }
}

/** The response didn't match the expected shape. Lists the failing paths, not the values. */
export class GarminResponseError extends Error {
  override readonly name = 'GarminResponseError';
}

export class FitExtractError extends Error {
  override readonly name = 'FitExtractError';
}
