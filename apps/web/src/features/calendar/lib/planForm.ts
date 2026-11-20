import type { PlannedSession } from '@/shared/api/client';
import { INTENSITY_LABELS, type PlanIntensity } from '@/shared/lib/plan';

/** The editor's fields while typing. */
export type PlanDraft = {
  /** Set when editing an existing session. */
  id: string | null;
  date: string;
  title: string;
  intensity: PlanIntensity;
  /** Typed TSS for custom sessions. */
  tssText: string;
};

const MAX_TSS = 600;

/** "Easy ride", used when the title is left empty. */
export const defaultTitle = (intensity: PlanIntensity) =>
  intensity === 'custom' ? 'Planned session' : `${INTENSITY_LABELS[intensity]} ride`;

export const emptyDraft = (date: string): PlanDraft => ({
  id: null,
  date,
  title: '',
  intensity: 'medium',
  tssText: '',
});

/** An existing session's fields. A title that is just its preset's default stays empty, so it follows a new preset. */
export const draftFromSession = (session: PlannedSession): PlanDraft => ({
  id: session.id,
  date: session.date,
  title: session.title === defaultTitle(session.intensity) ? '' : session.title,
  intensity: session.intensity,
  tssText: session.tss === undefined ? '' : String(session.tss),
});

/** The typed custom TSS, or null if it isn't a whole number from 0 to 600. */
export const parseTss = (text: string): number | null => {
  if (text.trim() === '') return null;
  const tss = Number(text);
  if (!Number.isInteger(tss) || tss < 0 || tss > MAX_TSS) return null;
  return tss;
};

/** The session to save, or null while the draft isn't valid. `today` is the earliest date for a new session. */
export const sessionFromDraft = (draft: PlanDraft, id: string, today: string): PlannedSession | null => {
  const isNew = draft.id === null;
  if (!draft.date || (isNew && draft.date < today)) return null;

  const title = draft.title.trim() || defaultTitle(draft.intensity);
  const base = { id, date: draft.date, title: title.slice(0, 80) };
  if (draft.intensity !== 'custom') return { ...base, intensity: draft.intensity };

  const tss = parseTss(draft.tssText);
  if (tss === null) return null;
  return { ...base, intensity: 'custom', tss };
};

/** The event editor's fields while typing. */
export type EventDraft = {
  /** Set when editing an existing event. */
  id: string | null;
  date: string;
  name: string;
};

export const emptyEventDraft = (date: string): EventDraft => ({ id: null, date, name: '' });

/** The event to save, or null while the draft isn't valid. New events can't be in the past. */
export const eventFromDraft = (draft: EventDraft, id: string, today: string) => {
  const name = draft.name.trim();
  const isNew = draft.id === null;
  if (!name || !draft.date || (isNew && draft.date < today)) return null;
  return { id, date: draft.date, name: name.slice(0, 80) };
};
