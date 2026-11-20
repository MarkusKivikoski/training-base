import {
  createRootRoute,
  createRoute,
  createRouter,
  parseSearchWith,
  stringifySearchWith,
} from '@tanstack/react-router';
import { Layout } from './Layout';
import { ActivitiesPage } from '@/features/activities/ActivitiesPage';
import { ActivityDetailPage } from '@/features/activities/ActivityDetailPage';
import { validateActivitySearch } from '@/features/activities/search';
import { NotFoundPage } from './NotFoundPage';
import { HeatmapPage } from '@/features/heatmap/HeatmapPage';
import { validateHeatmapSearch } from '@/features/heatmap/search';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { PowerCurvePage } from '@/features/power-curve/PowerCurvePage';
import { RecordsPage } from '@/features/records/RecordsPage';
import { validateRecordsSearch } from '@/features/records/search';
import { TrendsPage } from '@/features/trends/TrendsPage';
import { validateTrendsSearch } from '@/features/trends/search';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { validateCalendarSearch } from '@/features/calendar/search';
import { ComparePage } from '@/features/compare/ComparePage';
import { validateCompareSearch } from '@/features/compare/search';
import { ClimbsPage } from '@/features/climbs/ClimbsPage';
import { ClimbDetailPage } from '@/features/climbs/ClimbDetailPage';
import { validateClimbsSearch } from '@/features/climbs/search';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { GearPage } from '@/features/gear/GearPage';
import { YearReviewPage } from '@/features/review/YearReviewPage';
import { validateReviewSearch } from '@/features/review/search';

const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: NotFoundPage,
});

const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: OverviewPage });

const activitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activities',
  validateSearch: validateActivitySearch,
  component: ActivitiesPage,
});

const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activities/$activityId',
  component: ActivityDetailPage,
});

const powerCurveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/power-curve',
  component: PowerCurvePage,
});

const heatmapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/heatmap',
  validateSearch: validateHeatmapSearch,
  component: HeatmapPage,
});

const trendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trends',
  validateSearch: validateTrendsSearch,
  component: TrendsPage,
});

const recordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/records',
  validateSearch: validateRecordsSearch,
  component: RecordsPage,
});

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  validateSearch: validateCalendarSearch,
  component: CalendarPage,
});

const compareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compare',
  validateSearch: validateCompareSearch,
  component: ComparePage,
});

const climbsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/climbs',
  validateSearch: validateClimbsSearch,
  component: ClimbsPage,
});

const climbRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/climbs/$climbId',
  component: ClimbDetailPage,
});

const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsPage });

const gearRoute = createRoute({ getParentRoute: () => rootRoute, path: '/gear', component: GearPage });

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/review',
  validateSearch: validateReviewSearch,
  component: YearReviewPage,
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  calendarRoute,
  activitiesRoute,
  activityRoute,
  compareRoute,
  powerCurveRoute,
  recordsRoute,
  climbsRoute,
  climbRoute,
  settingsRoute,
  gearRoute,
  reviewRoute,
  trendsRoute,
  heatmapRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // Plain search params: strings are written as-is (?a=24806621797, not ?a=%2224806621797%22);
  // values that parse as JSON (numbers) come back typed, anything else stays a string.
  stringifySearch: stringifySearchWith((v) => (typeof v === 'string' ? v : JSON.stringify(v))),
  parseSearch: parseSearchWith((v) => {
    try {
      return JSON.parse(v) as unknown;
    } catch {
      return v;
    }
  }),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
