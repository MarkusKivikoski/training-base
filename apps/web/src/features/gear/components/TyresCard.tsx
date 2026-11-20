import { useState, type FormEvent } from 'react';
import type { Gear } from '@/shared/api/client';
import { useSaveTyre } from '@/shared/api/gear';
import type { TyreTotals } from '@/shared/lib/gear';
import { newId } from '@/shared/lib/ids';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { GEAR_FIELD_CLASS } from './GearFormButtons';
import { TyreRow } from './TyreRow';

type TyresCardProps = {
  gear: Gear;
  /** Distance, riding time and ride count of the tagged rides, by tyre id. */
  totals: ReadonlyMap<string, TyreTotals>;
};

/**
 * The sets of tyres outdoor rides can be tagged with (on a ride's page), with the distance and
 * riding time of the rides carrying each tag, and a field to add another set.
 */
export const TyresCard = ({ gear, totals }: TyresCardProps) => {
  const save = useSaveTyre();
  const [newName, setNewName] = useState('');

  const addTyre = (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (name) save.mutate({ id: newId('tyre'), name }, { onSuccess: () => setNewName('') });
  };

  return (
    <Card title="Tyres">
      <p className="text-xs text-ink-3">
        Tag an outdoor ride with its tyres on the ride’s page. The tag shows in the Same route table, and every tagged
        ride counts towards its tyres’ distance here.
      </p>
      {gear.tyres.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {gear.tyres.map((tyre) => (
            <TyreRow key={tyre.id} tyre={tyre} totals={totals.get(tyre.id)} />
          ))}
        </ul>
      )}
      <form onSubmit={addTyre} className="mt-3 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="new-tyre-name">
          Name of the new tyres
        </label>
        <input
          id="new-tyre-name"
          value={newName}
          maxLength={40}
          placeholder="e.g. Studded"
          onChange={(event) => setNewName(event.target.value)}
          className={GEAR_FIELD_CLASS}
        />
        <button
          type="submit"
          disabled={!newName.trim() || save.isPending}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-0 disabled:opacity-50"
        >
          Add tyres
        </button>
      </form>
      {save.error && <ErrorMessage error={save.error} />}
    </Card>
  );
};
