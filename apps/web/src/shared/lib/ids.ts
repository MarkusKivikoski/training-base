/** A new unique id for user-made items, like "bike-lx3k9a-4f2" (lowercase, safe for the API). */
export const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
