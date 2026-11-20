import { getRouteApi } from '@tanstack/react-router';
import { useRecords } from '@/shared/api/records';
import { Toggle } from '@/shared/ui/Toggle';
import { useActivityPages, useGarminCheck } from './api';
import { ActivityFiltersCard } from './components/list/ActivityFiltersCard';
import { ActivityResultsCard } from './components/list/ActivityResultsCard';
import { MissingInGarminNotice } from './components/list/MissingInGarminNotice';
import { YearFilter } from './components/list/YearFilter';
import { currentSort, sortSearchPatch, type ActivitySortState } from './lib/activitySort';
import { PAGE_SIZE, SPORT_OPTIONS, type SportScope } from './constants';
import { hasActiveFilters, mergeActivitySearch, toActivityListInput, type ActivitySearchPatch } from './search';

const route = getRouteApi('/activities');

/** All activities, newest first unless sorted by another column, with filters and sort kept in the URL. */
export const ActivitiesPage = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const sport: SportScope = search.sport ?? 'cycling';
  const garminCheck = useGarminCheck();
  const pages = useActivityPages(toActivityListInput(search, PAGE_SIZE));
  const records = useRecords(undefined);
  const sort = currentSort(search);

  const updateFilters = (patch: ActivitySearchPatch) => {
    void navigate({ search: mergeActivitySearch(search, patch), replace: true });
  };
  // Clearing the filters keeps the sport scope and the sort.
  const clearFilters = () => {
    const kept = { sport: search.sport, sort: search.sort, order: search.order };
    void navigate({ search: mergeActivitySearch({}, kept), replace: true });
  };
  const changeSort = (next: ActivitySortState) => updateFilters(sortSearchPatch(next));
  // Types differ between the two scopes, so a chosen type is cleared.
  const changeSport = (next: SportScope) =>
    updateFilters({ sport: next === 'all' ? 'all' : undefined, type: undefined });

  const firstPage = pages.data?.pages[0];
  const activities = pages.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Activities</h1>
        <div className="flex flex-wrap items-center gap-3">
          <YearFilter years={records.data?.years ?? []} from={search.from} to={search.to} onChange={updateFilters} />
          <Toggle label="Activity types" value={sport} onChange={changeSport} options={SPORT_OPTIONS} />
        </div>
      </div>

      <MissingInGarminNotice missing={garminCheck.data?.missing ?? []} checkedAt={garminCheck.data?.checkedAt} />

      <ActivityFiltersCard
        search={search}
        sport={sport}
        types={firstPage?.types ?? []}
        onChange={updateFilters}
        onClear={clearFilters}
      />

      <ActivityResultsCard
        activities={activities}
        total={firstPage?.total}
        sport={sport}
        isFiltered={hasActiveFilters(search)}
        isPending={pages.isPending}
        error={pages.error}
        hasMore={pages.hasNextPage}
        isLoadingMore={pages.isFetchingNextPage}
        onLoadMore={() => void pages.fetchNextPage()}
        sort={sort}
        onSortChange={changeSort}
      />
    </div>
  );
};
