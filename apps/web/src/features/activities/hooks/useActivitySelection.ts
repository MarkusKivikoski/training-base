import { useState } from 'react';
import type { Activity } from '@/shared/api/client';
import type { ActivitySelection } from '@/shared/ui/ActivityList';

/** Checkbox selection over the listed activities; ids not in the list don't count as selected. */
export const useActivitySelection = (activities: readonly Activity[]) => {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const selection: ActivitySelection = {
    selectedIds,
    onToggle: (id) =>
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    onToggleAll: (selectAll) =>
      setSelectedIds(selectAll ? new Set(activities.map((activity) => activity.id)) : new Set()),
  };

  const selected = activities.filter((activity) => selectedIds.has(activity.id));
  const clear = () => setSelectedIds(new Set());

  return { selection, selected, clear };
};
