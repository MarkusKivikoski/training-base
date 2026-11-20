import type { HeatmapInput } from '@/shared/api/client';
import { formatDate } from '@/shared/lib/formatters';

export type HeatmapMode = 'heatmap' | 'solid';

/** Whose routes are shown besides rides, the default: runs, or rides and runs together. */
export type HeatmapShow = 'running' | 'all';

/**
 * Heatmap filters in the URL. A date range replaces the year; rides, all years, all types and the
 * heatmap style are the defaults and stay out. The ride type (`sport`) only applies to rides.
 */
export type HeatmapSearch = {
  show?: HeatmapShow;
  year?: number;
  from?: string;
  to?: string;
  sport?: string;
  mode?: 'solid';
};

/** The filters while editing them, defaults included. */
export type HeatmapFilters = {
  show?: HeatmapShow | undefined;
  year?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
  sport?: string | undefined;
  mode: HeatmapMode;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SPORT_TYPE = /^[a-z_]+$/;
const FIRST_YEAR = 1990;

const isoDate = (value: unknown) => (typeof value === 'string' && ISO_DATE.test(value) ? value : undefined);

/** The URL search for these filters: a range wins over a year, and defaults are left out. */
export const heatmapSearch = (filters: HeatmapFilters): HeatmapSearch => {
  const out: HeatmapSearch = {};
  if (filters.show) out.show = filters.show;
  const hasRange = Boolean(filters.from || filters.to);
  if (hasRange) {
    if (filters.from) out.from = filters.from;
    if (filters.to) out.to = filters.to;
  } else if (filters.year) {
    out.year = filters.year;
  }
  if (filters.sport && !filters.show) out.sport = filters.sport;
  if (filters.mode === 'solid') out.mode = 'solid';
  return out;
};

/** The router's `validateSearch` for /heatmap. */
export const validateHeatmapSearch = (search: Record<string, unknown>): HeatmapSearch => {
  const year = Number(search['year']);
  const sport = search['sport'];
  const show = search['show'];
  return heatmapSearch({
    show: show === 'running' || show === 'all' ? show : undefined,
    year: Number.isInteger(year) && year > FIRST_YEAR ? year : undefined,
    from: isoDate(search['from']),
    to: isoDate(search['to']),
    sport: typeof sport === 'string' && SPORT_TYPE.test(sport) ? sport : undefined,
    mode: search['mode'] === 'solid' ? 'solid' : 'heatmap',
  });
};

/** The heatmap query for the filters. */
export const toHeatmapInput = (search: HeatmapSearch): HeatmapInput => {
  const input: HeatmapInput = {};
  if (search.show) input.discipline = search.show;
  if (search.year) input.year = search.year;
  if (search.from) input.from = search.from;
  if (search.to) input.to = search.to;
  if (search.sport) input.sports = [search.sport];
  return input;
};

export const hasDateRange = (search: HeatmapSearch) => Boolean(search.from || search.to);

/** The Period toggle's value: "range", a year, or "all". */
export const periodValue = (search: HeatmapSearch): string => {
  if (hasDateRange(search)) return 'range';
  return search.year ? String(search.year) : 'all';
};

/** "1.9.2026 – today", "2025" or "all years". */
export const scopeLabel = (search: HeatmapSearch): string => {
  if (hasDateRange(search)) {
    const start = search.from ? formatDate(search.from) : 'start';
    const end = search.to ? formatDate(search.to) : 'today';
    return `${start} – ${end}`;
  }
  return search.year ? String(search.year) : 'all years';
};
