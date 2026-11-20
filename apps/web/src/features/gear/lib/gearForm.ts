import type { Bike, GearComponent } from '@/shared/api/client';

export type BikeDraft = { id: string | null; name: string; types: string[]; retired: boolean };

export type ComponentDraft = {
  id: string | null;
  bikeId: string;
  name: string;
  installedOn: string;
  intervalKmText: string;
  intervalHoursText: string;
};

export const emptyBikeDraft = (): BikeDraft => ({ id: null, name: '', types: [], retired: false });

export const draftFromBike = (bike: Bike): BikeDraft => ({ ...bike, types: [...bike.types] });

export const emptyComponentDraft = (bikeId: string, today: string): ComponentDraft => ({
  id: null,
  bikeId,
  name: '',
  installedOn: today,
  intervalKmText: '',
  intervalHoursText: '',
});

export const draftFromComponent = (component: GearComponent): ComponentDraft => ({
  id: component.id,
  bikeId: component.bikeId,
  name: component.name,
  installedOn: component.installedOn,
  intervalKmText: component.intervalKm === undefined ? '' : String(component.intervalKm),
  intervalHoursText: component.intervalHours === undefined ? '' : String(component.intervalHours),
});

/** The bike to save, or null while it has no name. */
export const bikeFromDraft = (draft: BikeDraft, id: string): Bike | null => {
  const name = draft.name.trim();
  if (!name) return null;
  return { id, name: name.slice(0, 60), types: draft.types, retired: draft.retired };
};

/** A typed interval: undefined when empty, null when not a whole positive number. */
const parseInterval = (text: string, max: number): number | undefined | null => {
  if (text.trim() === '') return undefined;
  const value = Number(text);
  if (!Number.isInteger(value) || value <= 0 || value > max) return null;
  return value;
};

/** The component to save, or null while it isn't valid. `today` is the latest install date. */
export const componentFromDraft = (draft: ComponentDraft, id: string, today: string): GearComponent | null => {
  const name = draft.name.trim();
  const intervalKm = parseInterval(draft.intervalKmText, 100_000);
  const intervalHours = parseInterval(draft.intervalHoursText, 10_000);
  if (!name || !draft.installedOn || draft.installedOn > today) return null;
  if (intervalKm === null || intervalHours === null) return null;

  return {
    id,
    bikeId: draft.bikeId,
    name: name.slice(0, 60),
    installedOn: draft.installedOn,
    ...(intervalKm === undefined ? {} : { intervalKm }),
    ...(intervalHours === undefined ? {} : { intervalHours }),
  };
};
