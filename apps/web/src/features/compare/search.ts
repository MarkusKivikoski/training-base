/** The two rides being compared, by activity id. */
export type CompareSearch = { a?: string; b?: string };

export type RideSlot = 'a' | 'b';

const ACTIVITY_ID = /^[1-9][0-9]*$/;

// Ride ids may come back as numbers from the URL parser; keep them as strings.
const activityId = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const id = String(value);
  return ACTIVITY_ID.test(id) ? id : undefined;
};

/** The router's `validateSearch` for /compare. */
export const validateCompareSearch = (search: Record<string, unknown>): CompareSearch => {
  const out: CompareSearch = {};
  const a = activityId(search['a']);
  if (a) out.a = a;
  const b = activityId(search['b']);
  if (b) out.b = b;
  return out;
};

/** The search with ride `slot` set to `id`; an empty id clears that slot. */
export const withRide = (search: CompareSearch, slot: RideSlot, id: string): CompareSearch => {
  const next: CompareSearch = { ...search };
  if (id) next[slot] = id;
  else delete next[slot];
  return next;
};
