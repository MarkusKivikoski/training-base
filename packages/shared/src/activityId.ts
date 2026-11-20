/** Garmin activity ID as a canonical decimal string. Used as the file key everywhere. */
export type ActivityId = string & { readonly __brand: 'ActivityId' };

/**
 * Validates and normalizes an activity ID. Only ASCII digits are accepted, which also
 * makes the ID safe to use in file paths.
 */
export function toActivityId(value: string | number): ActivityId {
  const s = typeof value === 'number' ? (Number.isSafeInteger(value) ? String(value) : '') : value;
  if (!/^[1-9][0-9]{0,19}$/.test(s)) {
    throw new Error('Invalid activity ID: must be a positive integer');
  }
  return s as ActivityId;
}
