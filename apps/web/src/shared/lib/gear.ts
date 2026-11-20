import type { Activity, Bike, Gear, GearComponent, Tyre } from '@/shared/api/client';

/** A component is "soon" from this share of its interval, and "due" at its interval. */
export const SOON_FRACTION = 0.9;

export type ComponentStatus = 'ok' | 'soon' | 'due' | 'untracked';

export type ComponentUsage = {
  component: GearComponent;
  distanceM: number;
  movingS: number;
  /** The larger of distance and time used as a share of their intervals; null without an interval. */
  fraction: number | null;
  status: ComponentStatus;
};

export type BikeTotals = { distanceM: number; movingS: number; rides: number };

/** Distance, riding time and ride count of the rides tagged with one set of tyres. */
export type TyreTotals = BikeTotals;

const movingSecondsOf = (activity: Activity) => activity.movingDurationS ?? activity.durationS;

/**
 * The bike a ride was on: its override if set ("none" for no bike), else the first active bike
 * that lists the ride's sport type, else none. Other sports have no bike.
 */
export const bikeFor = (activity: Activity, gear: Gear): Bike | null => {
  if (!activity.isCycling) return null;
  const override = gear.overrides[activity.id];
  if (override === 'none') return null;
  if (override) return gear.bikes.find((bike) => bike.id === override) ?? null;
  return gear.bikes.find((bike) => !bike.retired && bike.types.includes(activity.sport)) ?? null;
};

/** The tyres a ride was tagged with; null when it has no tag (or its tyres were removed). */
export const tyreFor = (activityId: string, gear: Gear): Tyre | null => {
  const tyreId = gear.rideTyres[activityId];
  if (!tyreId) return null;
  return gear.tyres.find((tyre) => tyre.id === tyreId) ?? null;
};

/** Distance, riding time and ride count per tyre id, from the rides tagged with those tyres. */
export const tyreTotals = (activities: readonly Activity[], gear: Gear): Map<string, TyreTotals> => {
  const totals = new Map<string, TyreTotals>();
  for (const activity of activities) {
    const tyre = tyreFor(activity.id, gear);
    if (!tyre) continue;
    const current = totals.get(tyre.id) ?? { distanceM: 0, movingS: 0, rides: 0 };
    current.distanceM += activity.distanceM ?? 0;
    current.movingS += movingSecondsOf(activity);
    current.rides += 1;
    totals.set(tyre.id, current);
  }
  return totals;
};

/** The bike the ride's type alone would give it, ignoring any override. */
export const bikeByType = (activity: Activity, gear: Gear): Bike | null =>
  bikeFor(activity, { ...gear, overrides: {} });

/** Distance, riding time and ride count per bike id. */
export const bikeTotals = (activities: readonly Activity[], gear: Gear): Map<string, BikeTotals> => {
  const totals = new Map<string, BikeTotals>();
  for (const activity of activities) {
    const bike = bikeFor(activity, gear);
    if (!bike) continue;
    const current = totals.get(bike.id) ?? { distanceM: 0, movingS: 0, rides: 0 };
    current.distanceM += activity.distanceM ?? 0;
    current.movingS += movingSecondsOf(activity);
    current.rides += 1;
    totals.set(bike.id, current);
  }
  return totals;
};

const statusOf = (fraction: number | null): ComponentStatus => {
  if (fraction === null) return 'untracked';
  if (fraction >= 1) return 'due';
  if (fraction >= SOON_FRACTION) return 'soon';
  return 'ok';
};

/** How much a component has been used since it was fitted, and whether it's due. */
export const componentUsage = (
  component: GearComponent,
  activities: readonly Activity[],
  gear: Gear,
): ComponentUsage => {
  let distanceM = 0;
  let movingS = 0;
  for (const activity of activities) {
    if (activity.date < component.installedOn) continue;
    if (bikeFor(activity, gear)?.id !== component.bikeId) continue;
    distanceM += activity.distanceM ?? 0;
    movingS += movingSecondsOf(activity);
  }

  const shares: number[] = [];
  if (component.intervalKm) shares.push(distanceM / 1000 / component.intervalKm);
  if (component.intervalHours) shares.push(movingS / 3600 / component.intervalHours);
  const fraction = shares.length > 0 ? Math.max(...shares) : null;
  return { component, distanceM, movingS, fraction, status: statusOf(fraction) };
};

/** Components that are due or nearly due, most worn first. */
export const componentsNeedingAttention = (activities: readonly Activity[], gear: Gear): ComponentUsage[] =>
  gear.components
    .map((component) => componentUsage(component, activities, gear))
    .filter((usage) => usage.status === 'due' || usage.status === 'soon')
    .sort((first, second) => (second.fraction ?? 0) - (first.fraction ?? 0));
