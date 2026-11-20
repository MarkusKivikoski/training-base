import { useMemo, useState, type ReactNode } from 'react';
import type { PlannedEvent, PlannedSession, PlanPresets } from '@/shared/api/client';
import { draftFromSession } from '../../lib/planForm';
import { PlanEditorContext } from './planEditorContext';
import { PlanItemDialog, type PlanItem } from './PlanItemDialog';

type PlanEditorProviderProps = {
  presets: PlanPresets;
  today: string;
  children: ReactNode;
};

/** Holds the plan editor, so any day on the Calendar can open it. */
export const PlanEditorProvider = ({ presets, today, children }: PlanEditorProviderProps) => {
  const [item, setItem] = useState<PlanItem | null>(null);

  const editor = useMemo(
    () => ({
      openNew: (date: string) => setItem({ kind: 'new', date }),
      openEditSession: (session: PlannedSession) => setItem({ kind: 'session', draft: draftFromSession(session) }),
      openEditEvent: (event: PlannedEvent) => setItem({ kind: 'event', draft: { ...event } }),
    }),
    [],
  );

  return (
    <PlanEditorContext.Provider value={editor}>
      {children}
      {item && <PlanItemDialog item={item} presets={presets} today={today} onClose={() => setItem(null)} />}
    </PlanEditorContext.Provider>
  );
};
