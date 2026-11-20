import { useMemo, useState } from 'react';
import { useActivities } from '@/shared/api/activities';
import { useGear } from '@/shared/api/gear';
import { useStatus } from '@/shared/api/status';
import { bikeTotals, tyreTotals } from '@/shared/lib/gear';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { BikeCard } from './components/BikeCard';
import { BikeDialog } from './components/BikeDialog';
import { ComponentDialog } from './components/ComponentDialog';
import { TyresCard } from './components/TyresCard';
import { draftFromBike, draftFromComponent, emptyBikeDraft, emptyComponentDraft } from './lib/gearForm';

/** What's being edited: a bike (new or existing) or a component on a bike. */
type Editing =
  { kind: 'bike'; bikeId: string | null } | { kind: 'component'; bikeId: string; componentId: string | null };

/** Rides fetched for totals and component wear: all of them. */
const RIDE_LIMIT = 1000;

/** Bikes with their totals and components, replace reminders for wearing parts, and the tyres rides can be tagged with. */
export const GearPage = () => {
  const status = useStatus();
  const gear = useGear();
  const rides = useActivities({ sport: 'cycling', limit: RIDE_LIMIT });
  const [editing, setEditing] = useState<Editing | null>(null);
  const today = status.data?.today;

  const allRides = useMemo(() => rides.data?.items ?? [], [rides.data]);
  const totals = useMemo(() => (gear.data ? bikeTotals(allRides, gear.data) : new Map()), [allRides, gear.data]);
  const tyreUsage = useMemo(() => (gear.data ? tyreTotals(allRides, gear.data) : new Map()), [allRides, gear.data]);
  const sportTypes = useMemo(() => [...new Set(allRides.map((ride) => ride.sport))].sort(), [allRides]);

  if (gear.isPending || rides.isPending || !today) return <Loading />;
  if (gear.error || rides.error) return <ErrorMessage error={gear.error ?? rides.error} />;

  const { bikes, components } = gear.data;
  const close = () => setEditing(null);
  const editedBike = editing ? bikes.find((bike) => bike.id === editing.bikeId) : undefined;
  const editedComponent =
    editing?.kind === 'component' ? components.find((component) => component.id === editing.componentId) : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Gear</h1>
        <button
          type="button"
          onClick={() => setEditing({ kind: 'bike', bikeId: null })}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface-1"
        >
          Add bike
        </button>
      </div>

      {bikes.length === 0 && (
        <p className="text-sm text-ink-3">
          No bikes yet. Add one and tick the ride types it’s used for: every ride of those types, old and new, counts
          for it.
        </p>
      )}

      {bikes.map((bike) => (
        <BikeCard
          key={bike.id}
          bike={bike}
          gear={gear.data}
          rides={allRides}
          totals={totals.get(bike.id)}
          today={today}
          onEditBike={() => setEditing({ kind: 'bike', bikeId: bike.id })}
          onAddComponent={() => setEditing({ kind: 'component', bikeId: bike.id, componentId: null })}
          onEditComponent={(componentId) => setEditing({ kind: 'component', bikeId: bike.id, componentId })}
        />
      ))}

      <TyresCard gear={gear.data} totals={tyreUsage} />

      {editing?.kind === 'bike' && (
        <BikeDialog
          initial={editedBike ? draftFromBike(editedBike) : emptyBikeDraft()}
          sportTypes={sportTypes}
          onClose={close}
        />
      )}
      {editing?.kind === 'component' && editedBike && (
        <ComponentDialog
          initial={editedComponent ? draftFromComponent(editedComponent) : emptyComponentDraft(editedBike.id, today)}
          bikeName={editedBike.name}
          today={today}
          onClose={close}
        />
      )}
    </div>
  );
};
