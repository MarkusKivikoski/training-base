import { useId, useState } from 'react';
import type { PlanPresets } from '@/shared/api/client';
import { Dialog } from '@/shared/ui/Dialog';
import { Toggle } from '@/shared/ui/Toggle';
import { emptyDraft, emptyEventDraft, type EventDraft, type PlanDraft } from '../../lib/planForm';
import { EventForm } from './EventForm';
import { SessionForm } from './SessionForm';

/** What the editor opens with: a new item on a date, or an existing session or event. */
export type PlanItem =
  { kind: 'new'; date: string } | { kind: 'session'; draft: PlanDraft } | { kind: 'event'; draft: EventDraft };

type ItemKind = 'session' | 'event';

const KIND_OPTIONS: ReadonlyArray<{ value: ItemKind; label: string }> = [
  { value: 'session', label: 'Session' },
  { value: 'event', label: 'Event' },
];

const TITLES: Record<ItemKind, { new: string; existing: string }> = {
  session: { new: 'Plan a session', existing: 'Planned session' },
  event: { new: 'Add an event', existing: 'Event' },
};

type PlanItemDialogProps = {
  item: PlanItem;
  presets: PlanPresets;
  today: string;
  onClose: () => void;
};

/** The plan editor: a session or a target event. A new item can switch between the two. */
export const PlanItemDialog = ({ item, presets, today, onClose }: PlanItemDialogProps) => {
  const titleId = useId();
  const isNew = item.kind === 'new';
  const [kind, setKind] = useState<ItemKind>(item.kind === 'new' ? 'session' : item.kind);
  const title = isNew ? TITLES[kind].new : TITLES[kind].existing;

  const newDate = item.kind === 'new' ? item.date : today;
  const sessionDraft = item.kind === 'session' ? item.draft : emptyDraft(newDate);
  const eventDraft = item.kind === 'event' ? item.draft : emptyEventDraft(newDate);

  return (
    <Dialog labelledBy={titleId} onCancel={onClose}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {isNew && <Toggle label="What to add" value={kind} onChange={setKind} options={KIND_OPTIONS} />}
      </div>
      {kind === 'session' ? (
        <SessionForm initial={sessionDraft} presets={presets} today={today} onClose={onClose} />
      ) : (
        <EventForm initial={eventDraft} today={today} onClose={onClose} />
      )}
    </Dialog>
  );
};
