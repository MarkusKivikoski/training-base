import { describe, expect, it } from 'vitest';
import {
  defaultTitle,
  draftFromSession,
  emptyDraft,
  emptyEventDraft,
  eventFromDraft,
  parseTss,
  sessionFromDraft,
} from './planForm';

const TODAY = '2026-11-10';

describe('plan form', () => {
  it('builds a preset session with a default title', () => {
    expect(sessionFromDraft(emptyDraft('2026-11-12'), 'a', TODAY)).toEqual({
      id: 'a',
      date: '2026-11-12',
      title: 'Medium ride',
      intensity: 'medium',
    });
    expect(defaultTitle('custom')).toBe('Planned session');
  });

  it('needs a valid TSS for a custom session', () => {
    const draft = { ...emptyDraft('2026-11-12'), intensity: 'custom' as const, title: ' Sweet spot ' };
    expect(sessionFromDraft({ ...draft, tssText: '' }, 'a', TODAY)).toBeNull();
    expect(sessionFromDraft({ ...draft, tssText: '85' }, 'a', TODAY)).toEqual({
      id: 'a',
      date: '2026-11-12',
      title: 'Sweet spot',
      intensity: 'custom',
      tss: 85,
    });
    expect(parseTss('12.5')).toBeNull();
    expect(parseTss('601')).toBeNull();
  });

  it('lets a default title follow a new preset, but keeps a typed one', () => {
    expect(draftFromSession({ id: 'a', date: '2026-11-12', title: 'Hard ride', intensity: 'hard' }).title).toBe('');
    expect(draftFromSession({ id: 'a', date: '2026-11-12', title: 'Hills', intensity: 'hard' }).title).toBe('Hills');
  });

  it('keeps new sessions from today on, but lets existing ones be edited', () => {
    expect(sessionFromDraft(emptyDraft('2026-11-09'), 'a', TODAY)).toBeNull();
    const past = draftFromSession({ id: 'p', date: '2026-11-01', title: 'Old', intensity: 'easy' });
    expect(sessionFromDraft(past, 'p', TODAY)).toMatchObject({ id: 'p', date: '2026-11-01' });
  });
});

describe('event form', () => {
  it('needs a name and a date from today on for a new event', () => {
    expect(eventFromDraft(emptyEventDraft('2027-06-14'), 'e', TODAY)).toBeNull();
    expect(eventFromDraft({ ...emptyEventDraft('2027-06-14'), name: ' Kalevan kierros ' }, 'e', TODAY)).toEqual({
      id: 'e',
      date: '2027-06-14',
      name: 'Kalevan kierros',
    });
    expect(eventFromDraft({ ...emptyEventDraft('2026-11-01'), name: 'Past' }, 'e', TODAY)).toBeNull();
    expect(eventFromDraft({ id: 'e', date: '2026-11-01', name: 'Past' }, 'e', TODAY)).not.toBeNull();
  });
});
