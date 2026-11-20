/** Query keys for activity notes (effort rating and note): the detail page and copy-for-coach share them. */
export const noteKeys = {
  all: ['notes'] as const,
  activity: (id: string) => [...noteKeys.all, id] as const,
};
