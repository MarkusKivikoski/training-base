import { useState } from 'react';
import type { Activity, Bike, Gear } from '@/shared/api/client';
import { useSaveComponent } from '@/shared/api/gear';
import { componentUsage, type BikeTotals } from '@/shared/lib/gear';
import { formatDate, formatDistance, formatHours, formatSport } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ComponentRow } from './ComponentRow';

type BikeCardProps = {
  bike: Bike;
  gear: Gear;
  rides: readonly Activity[];
  totals: BikeTotals | undefined;
  today: string;
  onEditBike: () => void;
  onAddComponent: () => void;
  onEditComponent: (componentId: string) => void;
};

/** A bike with its totals, the ride types it takes, and its components' wear. */
export const BikeCard = ({
  bike,
  gear,
  rides,
  totals,
  today,
  onEditBike,
  onAddComponent,
  onEditComponent,
}: BikeCardProps) => {
  const saveComponent = useSaveComponent();
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const components = gear.components.filter((component) => component.bikeId === bike.id);
  const typesText =
    bike.types.length > 0 ? bike.types.map(formatSport).join(', ') : 'no ride types: set rides on their page';

  const replacing = components.find((component) => component.id === replacingId);

  const markReplaced = () => {
    setReplacingId(null);
    if (replacing) saveComponent.mutate({ ...replacing, installedOn: today });
  };

  return (
    <Card
      title={bike.retired ? `${bike.name} · retired` : bike.name}
      action={
        <button type="button" onClick={onEditBike} className="text-xs text-ink-2 hover:text-ink hover:underline">
          Edit bike
        </button>
      }
    >
      <p className="text-sm text-ink-2">
        <span className="font-semibold text-ink">{formatDistance(totals?.distanceM ?? 0, 0)}</span> ·{' '}
        {formatHours(totals?.movingS ?? 0)} · {totals?.rides ?? 0} {totals?.rides === 1 ? 'ride' : 'rides'}
      </p>
      <p className="mt-0.5 text-xs text-ink-3">Gets {typesText}.</p>

      <h3 className="mt-4 text-xs font-medium text-ink-2">Components</h3>
      {components.length === 0 ? (
        <p className="mt-1 text-sm text-ink-3">No components yet. Add a chain or tyres to get replace reminders.</p>
      ) : (
        <ul className="divide-y divide-line">
          {components.map((component) => (
            <ComponentRow
              key={component.id}
              usage={componentUsage(component, rides, gear)}
              onEdit={() => onEditComponent(component.id)}
              onReplace={() => setReplacingId(component.id)}
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onAddComponent}
        className="mt-3 rounded-md border border-dashed border-line px-2 py-1 text-xs text-ink-2 hover:text-ink"
      >
        + Add component
      </button>
      {replacing && (
        <ConfirmationModal
          title={`Mark ${replacing.name} as replaced today (${formatDate(today)})?`}
          message="Its usage starts again from zero."
          confirmLabel="Mark replaced"
          onConfirm={markReplaced}
          onCancel={() => setReplacingId(null)}
        />
      )}
    </Card>
  );
};
