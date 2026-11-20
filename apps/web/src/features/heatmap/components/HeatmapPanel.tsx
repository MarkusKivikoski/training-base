import { addDays } from '@app/metrics';
import type { HeatmapRoutes } from '@/shared/api/client';
import { formatSport } from '@/shared/lib/formatters';
import { Toggle } from '@/shared/ui/Toggle';
import { DEFAULT_RANGE_DAYS, MODE_OPTIONS, SHOW_OPTIONS } from '../constants';
import { hasDateRange, periodValue, scopeLabel, type HeatmapFilters, type HeatmapSearch } from '../search';
import { RangeControls } from './RangeControls';

type HeatmapPanelProps = {
  data: HeatmapRoutes;
  search: HeatmapSearch;
  today: string;
  onChange: (filters: HeatmapFilters) => void;
};

/** The floating panel over the map: route count, rides or runs, map style, period, ride type and date range. */
export const HeatmapPanel = ({ data, search, today, onChange }: HeatmapPanelProps) => {
  const filters: HeatmapFilters = { ...search, mode: search.mode ?? 'heatmap' };
  const routeNoun = data.routes.length === 1 ? 'route' : 'routes';
  const trimText = data.trimM > 0 ? ` · first and last ${data.trimM} m hidden` : '';

  const periodOptions = [
    { value: 'all', label: 'All' },
    ...data.years.map((year) => ({ value: String(year), label: String(year) })),
    { value: 'range', label: 'Range…' },
  ];
  const sportOptions = [
    { value: 'all', label: 'All types' },
    ...data.sports.map((sport) => ({ value: sport, label: formatSport(sport) })),
  ];

  // The ride type filter belongs to rides, so it is dropped when runs come into view.
  const changeShow = (show: (typeof SHOW_OPTIONS)[number]['value']) =>
    onChange({ ...filters, sport: undefined, show: show === 'cycling' ? undefined : show });
  const hasRideTypes = !search.show && data.sports.length > 1;

  const changeRange = (from: string | undefined, to: string | undefined) =>
    onChange({ ...filters, year: undefined, from, to });
  const changePeriod = (value: string) => {
    if (value === 'range') {
      changeRange(addDays(today, -(DEFAULT_RANGE_DAYS - 1)), today);
      return;
    }
    onChange({ ...filters, from: undefined, to: undefined, year: value === 'all' ? undefined : Number(value) });
  };

  return (
    <div className="absolute left-3 top-3 z-10 max-w-[calc(100%-4.5rem)] rounded-lg border border-line bg-surface-1/95 p-3 shadow-sm">
      <h1 className="text-base font-bold tracking-tight">Heatmap</h1>
      <p className="mb-2 text-xs text-ink-2">
        {data.routes.length} {routeNoun} · {scopeLabel(search)}
        {trimText}
      </p>
      <div className="flex flex-wrap gap-2">
        <Toggle label="Sport" value={search.show ?? 'cycling'} onChange={changeShow} options={SHOW_OPTIONS} />
        <Toggle
          label="Map style"
          value={filters.mode}
          onChange={(mode) => onChange({ ...filters, mode })}
          options={MODE_OPTIONS}
        />
        <Toggle label="Period" value={periodValue(search)} onChange={changePeriod} options={periodOptions} />
        {hasRideTypes && (
          <Toggle
            label="Ride type"
            value={search.sport ?? 'all'}
            onChange={(sport) => onChange({ ...filters, sport: sport === 'all' ? undefined : sport })}
            options={sportOptions}
          />
        )}
      </div>
      {hasDateRange(search) && <RangeControls from={search.from} to={search.to} today={today} onChange={changeRange} />}
    </div>
  );
};
