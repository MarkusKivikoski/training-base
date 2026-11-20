import { formatSport } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { Toggle } from '@/shared/ui/Toggle';
import { ENVIRONMENT_OPTIONS, FILTER_FIELD_CLASS, type SportScope } from '../../constants';
import { hasActiveFilters, type ActivitySearch, type ActivitySearchPatch } from '../../search';
import { KmInput } from './KmInput';
import { SearchField } from './SearchField';

type ActivityFiltersCardProps = {
  search: ActivitySearch;
  sport: SportScope;
  /** Sport types in the current scope, with their counts, for the Type menu. */
  types: ReadonlyArray<{ type: string; count: number }>;
  onChange: (patch: ActivitySearchPatch) => void;
  onClear: () => void;
};

/** Search, type, indoor/outdoor, date range, distance range and "has power" filters. */
export const ActivityFiltersCard = ({ search, sport, types, onChange, onClear }: ActivityFiltersCardProps) => {
  const allTypesLabel = sport === 'cycling' ? 'All ride types' : 'All types';

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <SearchField value={search.q} onChange={(q) => onChange({ q })} />

        <label className="flex flex-col gap-1 text-xs text-ink-2">
          Type
          <select
            value={search.type ?? ''}
            onChange={(event) => onChange({ type: event.target.value || undefined })}
            className={FILTER_FIELD_CLASS}
          >
            <option value="">{allTypesLabel}</option>
            {types.map((option) => (
              <option key={option.type} value={option.type}>
                {formatSport(option.type)} ({option.count})
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1 text-xs text-ink-2">
          <span>Where</span>
          <Toggle
            label="Indoor or outdoor"
            value={search.env ?? 'both'}
            onChange={(env) => onChange({ env: env === 'both' ? undefined : env })}
            options={ENVIRONMENT_OPTIONS}
          />
        </div>

        <label className="flex flex-col gap-1 text-xs text-ink-2">
          From
          <input
            type="date"
            value={search.from ?? ''}
            max={search.to}
            onChange={(event) => onChange({ from: event.target.value || undefined })}
            className={FILTER_FIELD_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-2">
          To
          <input
            type="date"
            value={search.to ?? ''}
            min={search.from}
            onChange={(event) => onChange({ to: event.target.value || undefined })}
            className={FILTER_FIELD_CLASS}
          />
        </label>

        <KmInput label="Min km" value={search.minKm} onChange={(minKm) => onChange({ minKm })} />
        <KmInput label="Max km" value={search.maxKm} onChange={(maxKm) => onChange({ maxKm })} />

        <label className="flex items-center gap-2 pb-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={Boolean(search.power)}
            onChange={(event) => onChange({ power: event.target.checked ? 1 : undefined })}
            className="size-4 accent-series-1"
          />
          Has power
        </label>

        {hasActiveFilters(search) && (
          <button type="button" onClick={onClear} className="pb-2 text-sm text-ink-2 hover:text-ink hover:underline">
            Clear filters
          </button>
        )}
      </div>
    </Card>
  );
};
