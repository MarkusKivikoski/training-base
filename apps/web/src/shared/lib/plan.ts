import type { Plan, PlannedEvent, PlannedSession, PlanPresets } from '@/shared/api/client';

export type PlanIntensity = PlannedSession['intensity'];

export const INTENSITY_LABELS: Record<PlanIntensity, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  custom: 'Custom',
};

/** A session's planned TSS: its own for custom sessions, else its preset's. */
export const plannedTss = (session: PlannedSession, presets: PlanPresets): number => {
  if (session.intensity === 'custom') return session.tss ?? 0;
  return presets[session.intensity];
};

/** Planned TSS per session, for the load forecast. */
export const plannedLoad = (plan: Plan): Array<{ date: string; tss: number }> =>
  plan.sessions.map((session) => ({ date: session.date, tss: plannedTss(session, plan.presets) }));

/** Items per date, in plan order. */
export const byDate = <Item extends { date: string }>(items: readonly Item[]): Map<string, Item[]> => {
  const grouped = new Map<string, Item[]>();
  for (const item of items) {
    const list = grouped.get(item.date) ?? [];
    list.push(item);
    grouped.set(item.date, list);
  }
  return grouped;
};

/** Sessions per date, in plan order. */
export const sessionsByDate = (sessions: readonly PlannedSession[]) => byDate(sessions);

/** The first event on or after today, if any. */
export const nextEvent = (events: readonly PlannedEvent[], today: string): PlannedEvent | undefined =>
  [...events].sort((a, b) => a.date.localeCompare(b.date)).find((event) => event.date >= today);

/** Whole days from one date to another (0 on the same day). */
export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** "today", "tomorrow", "in 12 days". */
export const countdownText = (from: string, to: string): string => {
  const days = daysBetween(from, to);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
};

/** A new, unique session id ("s-lx3k9a-4f2"). */
export const newSessionId = (): string => `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
