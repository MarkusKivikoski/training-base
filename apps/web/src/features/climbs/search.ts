/** Which climbs are listed: those ridden twice or more by default, or all (`?show=all`). */
export type ClimbsSearch = { show?: 'all' };

/** The router's `validateSearch` for /climbs. */
export const validateClimbsSearch = (search: Record<string, unknown>): ClimbsSearch =>
  search['show'] === 'all' ? { show: 'all' } : {};
