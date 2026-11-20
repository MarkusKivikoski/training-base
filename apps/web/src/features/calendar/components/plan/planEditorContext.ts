import { createContext, useContext } from 'react';
import type { PlannedEvent, PlannedSession } from '@/shared/api/client';

type PlanEditor = {
  /** Opens the editor for a new session or event on `date`. */
  openNew: (date: string) => void;
  openEditSession: (session: PlannedSession) => void;
  openEditEvent: (event: PlannedEvent) => void;
};

export const PlanEditorContext = createContext<PlanEditor | null>(null);

/** Opens the plan editor from anywhere inside the Calendar. */
export const usePlanEditor = (): PlanEditor => {
  const editor = useContext(PlanEditorContext);
  if (!editor) throw new Error('usePlanEditor must be used inside PlanEditorProvider');
  return editor;
};
