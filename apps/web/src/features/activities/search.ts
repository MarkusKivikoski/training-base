import type { ActivityListInput, ActivitySortColumn, SortOrder } from '@/shared/api/client';
import { SORT_COLUMNS } from './constants';

/**
 * Activities list filters and sort in the URL. Cycling is the default, so only "all" appears as a
 * sport; newest first is the default, so it leaves out `sort` and `order`.
 */
export type ActivitySearch = {
  sort?: ActivitySortColumn;
  order?: SortOrder;
  sport?: 'all';
  q?: string;
  type?: string;
  env?: 'indoor' | 'outdoor';
  from?: string;
  to?: string;
  minKm?: number;
  maxKm?: number;
  power?: 1;
};

/** Changes to some filters; `undefined`, `''` or `null` removes a filter. */
export type ActivitySearchPatch = Partial<Record<keyof ActivitySearch, unknown>>;

const MAX_QUERY_LENGTH = 100;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SPORT_TYPE = /^[a-z_]+$/;

const matchingString = (value: unknown, pattern: RegExp) =>
  typeof value === 'string' && pattern.test(value) ? value : undefined;

const nonNegativeNumber = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return undefined;
  return number;
};

const searchText = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).slice(0, MAX_QUERY_LENGTH);
  return text === '' ? undefined : text;
};

/** The router's `validateSearch` for /activities: keeps only valid filters, drops the rest. */
export const validateActivitySearch = (search: Record<string, unknown>): ActivitySearch => {
  const out: ActivitySearch = {};

  const sort = SORT_COLUMNS.find((option) => option.value === search['sort'])?.value;
  if (sort) out.sort = sort;
  if (search['order'] === 'asc' || search['order'] === 'desc') out.order = search['order'];

  if (search['sport'] === 'all') out.sport = 'all';

  const q = searchText(search['q']);
  if (q) out.q = q;

  const type = matchingString(search['type'], SPORT_TYPE);
  if (type) out.type = type;

  if (search['env'] === 'indoor' || search['env'] === 'outdoor') out.env = search['env'];

  const from = matchingString(search['from'], ISO_DATE);
  if (from) out.from = from;
  const to = matchingString(search['to'], ISO_DATE);
  if (to) out.to = to;

  const minKm = nonNegativeNumber(search['minKm']);
  if (minKm !== undefined) out.minKm = minKm;
  const maxKm = nonNegativeNumber(search['maxKm']);
  if (maxKm !== undefined) out.maxKm = maxKm;

  const power = search['power'];
  if (power === 1 || power === '1' || power === true) out.power = 1;

  return out;
};

/** The search with `patch` applied; empty values drop out, so they leave the URL. */
export const mergeActivitySearch = (search: ActivitySearch, patch: ActivitySearchPatch): ActivitySearch => {
  const merged: Record<string, unknown> = { ...search, ...patch };
  for (const key of Object.keys(merged)) {
    const value = merged[key];
    const isEmpty = value === undefined || value === '' || value === null;
    if (isEmpty) delete merged[key];
  }
  return merged as ActivitySearch;
};

/** Whether any filter beyond the sport scope is set. */
export const hasActiveFilters = (search: ActivitySearch): boolean =>
  Boolean(
    search.q ||
    search.type ||
    search.env ||
    search.from ||
    search.to ||
    search.minKm !== undefined ||
    search.maxKm !== undefined ||
    search.power,
  );

/** The list query for these filters and sort (without the page cursor). */
export const toActivityListInput = (search: ActivitySearch, pageSize: number): Omit<ActivityListInput, 'cursor'> => {
  const input: Omit<ActivityListInput, 'cursor'> = { sport: search.sport ?? 'cycling', limit: pageSize };
  if (search.sort) input.sort = search.sort;
  if (search.order) input.order = search.order;
  if (search.q) input.q = search.q;
  if (search.type) input.types = [search.type];
  if (search.env) input.environment = search.env;
  if (search.from) input.from = search.from;
  if (search.to) input.to = search.to;
  if (search.minKm !== undefined) input.minKm = search.minKm;
  if (search.maxKm !== undefined) input.maxKm = search.maxKm;
  if (search.power) input.hasPower = true;
  return input;
};
