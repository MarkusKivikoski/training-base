# CLAUDE.md

## Project

A personal cycling and training dashboard for a single user. It pulls activity data from Garmin Connect through the official **Garmin Connect Personal API**, computes training metrics from raw FIT files, and shows them in a React web app.

- Desktop-first, fully responsive down to mobile.
- Single user. No multi-tenancy, no sign-up flows. Protect the deployed app with simple auth or by running it behind a VPN.
- Cycling is the primary sport and the default everywhere. Other activity types are stored but are second-class in the UI.
- Running is the one other sport with its own views: Records, Year in review and the Heatmap have a Rides / Runs choice (rides by default). Runs feed no training load, power, zones or trends. The shared type for this is `Discipline` (`'cycling' | 'running'`, in `@app/metrics`).
- No database. Garmin is the source of truth. A local file cache in `data/` makes aggregate views (power curve, PMC, heatmap) possible without re-fetching from Garmin.

## Stack

- **Monorepo:** npm workspaces (root `package.json` `"workspaces": ["apps/*", "packages/*"]`), TypeScript everywhere, strict mode.
  - Internal deps are referenced as `"@app/metrics": "*"` (npm has no `workspace:` protocol).
  - Every package must declare every dependency it imports. npm hoists to root, so undeclared imports can silently work. ESLint `import/no-extraneous-dependencies` enforces this.
- **Frontend (`apps/web`):** React, Vite, TanStack Query, TanStack Router, Tailwind.
  - Charts: ECharts for time series and power curves (log x-axis, 10k+ points, zoom/sync). Do not use Recharts.
  - Maps: MapLibre GL with deck.gl (PathLayer with additive blending for the route heatmap).
- **API (`apps/api`):** Fastify with tRPC. A thin layer: no metric computation happens here. It serves data from the local cache and never calls Garmin during a page request.
- **Ingestion (`packages/ingest`):** Garmin sync worker, FIT download, FIT parsing (`@garmin/fitsdk`), and writing to the local cache.
- **Metrics (`packages/metrics`):** pure, side-effect-free functions for all training math. Fully unit tested.
- **Shared (`packages/shared`):** types, zod schemas and the cache access layer.
- **Storage:** plain files in `data/` (see "Data layout").
  - All reads and writes go through store modules in `packages/shared/src/store/` (e.g. `activityStore`, `streamStore`, `settingsStore`). No other code touches the file layout directly.
  - Writes are atomic: write to a temp file, then rename.
  - The API loads `index.json` into memory at startup and reloads it after ingestion.
- **Tests:** Vitest. Metrics code must have tests with known input/output fixtures.

## Garmin Personal API

- Auth: POST to the personal-api token endpoint with header `Authorization: ApiKey <key>`. This returns an access token that is valid for 24h. There are **no refresh tokens**, so request a new token with the key when the current one expires. Cache the token in memory and renew at about 23h.
- The key lives in `.env` as `GARMIN_PERSONAL_API_KEY`. **Never** log it, commit it, or include it in error messages.
- The key expires (30d to 1y, depending on how it was created). Surface a clear error when the key is rejected.
- The API is read-only. It provides activity summaries (JSON), original FIT files, and health summaries.
- Garmin-derived metrics (VO2 max, recovery time, performance condition) are **not** available. We compute our own equivalents.
- Endpoint paths and response shapes: take them from Garmin's Swagger docs or real responses. **Do not guess endpoint paths or field names.** If they're unknown, ask.
- Respect rate limits. Backfill in date-range chunks with backoff and resumable progress.

## Ingestion rules

1. Download raw FIT files to `data/fit/<activityId>.fit` **before** parsing. Raw files are never modified.
2. Parsing and metric computation are a separate, re-runnable step. Fixing a metrics bug should never require a re-download.
3. Ingestion must be idempotent: files are keyed by Garmin activity ID, and re-running overwrites them with identical output.
4. A one-off importer must also accept FIT files from a Garmin account data export zip.
5. A ride whose recording was stopped by accident can be merged (`settings/ride-merges.json`): the rebuild joins its recordings' FIT records on their timestamps into one ride under the earliest recording's ID, and the later recordings get no files of their own. Garmin keeps the parts. Only rides of the same kind (indoor or outdoor), not overlapping and at most 12 h apart, can be merged.

## Data layout

```
data/
  fit/<activityId>.fit              # raw FIT as downloaded, never modified
  raw/<activityId>.json             # Garmin summary JSON as received
  activities/<activityId>.json      # parsed summary + computed metrics + meanMaxPower
  streams/<activityId>.json.gz      # per-second streams, columnar arrays
  routes/<activityId>.json          # simplified [lng, lat] polyline, outdoor only
  index.json                        # all activity summaries (no streams), rebuilt from activities/
  settings/ftp-history.json         # effective-dated FTP entries (manual or estimated)
  settings/weight-history.json      # effective-dated weight, used for W/kg
  settings/lthr-history.json        # effective-dated LTHR entries (manual or estimated)
  settings/app.json                 # privacy trim distance, declined FTP/LTHR suggestions
  settings/plan.json                # planned sessions, target events, preset TSS values
  settings/activity-notes.json      # effort rating (1–10) and note per activity
  settings/gear.json                # bikes, components, per-ride bike overrides, tyres, per-ride tyre tags
  settings/goals.json               # riding goals
  settings/climb-names.json         # names given to climbs
  settings/ride-groups.json         # names given to workouts and routes, rides placed in a workout by hand
  settings/workout-types.json       # workout types set by hand, replacing the detected type
  settings/ride-merges.json         # rides recorded in parts, joined into one (earliest recording first)
  settings/intervals.json           # work intervals set by hand, replacing the detected ones on a ride
  derived/daily-load.json           # TSS/CTL/ATL/TSB per day
  derived/heatmap.json              # combined, trimmed routes for the heatmap
  derived/repeats.json              # repeated indoor workouts and outdoor routes, every ride of each
  sync-state.json                   # backfill/sync progress cursor
```

- Activity files hold the summary (start time, sport, duration, distance, elevation, avg/max power/HR/cadence), the computed metrics (NP, IF, TSS, FTP used), and `meanMaxPower` covering the fixed durations.
- Streams are columnar: `{ "time": [...], "power": [...], "hr": [...], "cadence": [...], "speed": [...], "altitude": [...], "lat": [...], "lng": [...] }`.
- Everything except `fit/`, `raw/` and `settings/` is derived and can be deleted and regenerated with `npm run rebuild`.
- Every file has a `schemaVersion` field. On a version bump, regenerate rather than migrate.

## Metrics definitions

Implement these in `packages/metrics` as pure functions:

- **Mean-max power:** best average power over durations [1, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600, 5400, 7200] seconds. Season and all-time curves are element-wise maxima across activities.
- **NP:** 30s rolling average of power, raise each value to the 4th power, take the mean, then the 4th root.
- **IF:** NP / FTP, where FTP is the value effective on the activity date.
- **TSS:** (duration_s × NP × IF) / (FTP × 3600) × 100.
- **CTL / ATL:** exponentially weighted averages of daily TSS with time constants 42 and 7 days: `X_today = X_yesterday + (TSS_today − X_yesterday) / k`. Days without rides count as TSS 0.
- **TSB (form):** CTL_yesterday − ATL_yesterday.
- **eFTP:** 0.95 × best 20-min power within a rolling 90-day window. Label it as an estimate in the UI.
- **VO2 max estimate:** derived from 5-min max power per kg (ACSM-style formula). Always label it as an estimate. Never present it as Garmin's value.
- **Same workout (indoor):** indoor rides **with power only**. The trainer rides carry no workout name or steps, so two rides are the same workout when their power profiles (10 s bins, smoothed over 30 s) differ by at most 8 % of the reference's mean power after trying start offsets of ±3 min and a power scale of 0.87–1.15, and their lengths differ by at most 10 %. The first ride of a workout defines it. Efforts are compared over the reference ride's work intervals when those add up to 5 minutes or more, else on NP and average heart rate; the change is against the median of up to five earlier efforts, and under 2 % in power per heartbeat counts as the same.
- **Same route (outdoor):** outdoor rides only. Each route line is reduced to the 75 m grid cells it passes through; two rides follow the same route when their distances differ by at most 5 %, at least 90 % of each ride's cells lie on or next to a cell of the other, and the shared cells come in the same order (the same way round). A ride joins a route when it matches any earlier ride of it (not only the first, which may have taken a detour); the route's id comes from its first ride. Routes ridden once are not stored. Efforts are compared on moving speed (distance ÷ moving time) against the median of up to five earlier efforts, and under 2 % counts as the same. Efforts ridden with a power meter are also compared with each other on NP per heartbeat; the card shows power only when an effort has it.
- **Workout type:** rides of 15 minutes or more get one of recovery, endurance, tempo, sweet spot, threshold, VO₂ max, anaerobic or mixed/race (`classifyWorkout`), against the FTP behind the power zones. Repeated work intervals of similar length decide it, by their intensity: sweet spot 88–95 %, threshold 95–105 %, VO₂ max ≥ 105 % for up to 10 min (or 30/30-style sets), anaerobic ≥ 120 % for under 2 min. Outdoors, the work must also be at least 10 % of the ride, so climbs on a long ride don't count. Rides without such intervals are typed by IF and time in zones. Without power, the HR zones give a rough type, shown with a hollow dot. A type set by hand (`settings/workout-types.json`) replaces the detected one in the UI; the API serves both.
- Handle missing power data gracefully: such rides get no power metrics, and can optionally get HR-based TSS later.

## Heatmap

- Simplify routes at ingestion time (Douglas-Peucker), then serve the precomputed `derived/heatmap.json`.
- Support a privacy trim: drop the first and last N meters of every route (configurable in `settings/app.json`).
- Outdoor rides and runs only, each route marked with its discipline. Exclude indoor/virtual activities (no GPS, or sport type indoor) and all other sports. The map shows rides by default; runs or both are a filter.

## Frontend conventions

- Desktop-first CSS grid of dashboard cards. Below `md`, collapse to a single column. The heatmap and activity detail are full-screen on mobile.
- Screens: Overview (PMC, weekly volume, recent rides, current eFTP and W/kg), Power Curve (compare ranges), Trends (FTP, VO2 max estimate, efficiency factor), Activity Detail (synced charts plus map, and past efforts on the same indoor workout or outdoor route), Heatmap (filter by sport, year and type), Records and Year in review (rides or runs).
- Do all data fetching through TanStack Query hooks in each feature's `api.ts` (see "Code organisation"). Components never call `fetch` or `trpc` directly.
- Format units in one place (`shared/lib/formatters.ts`). Metric units by default.
- Prefer composition over prop drilling, and avoid global state libraries unless clearly needed.

## Code organisation

### Frontend layout: by feature, not by file type
```
apps/web/src/
  app/                 main.tsx, router.tsx, Layout, NotFoundPage, styles.css, components/ (nav, sync, theme)
  features/
    overview/
      OverviewPage.tsx         the page: composition only
      components/              StatusChip.tsx, RecentRidesCard.tsx, fitness/, goals/ … (a folder per multi-part card)
      api.ts                   this feature's queries and mutations, and its query keys
      search.ts                URL search params: their type and the router's validateSearch (if any)
      hooks/                   feature hooks that combine queries or hold UI behaviour (optional)
      constants.ts             the feature's constants and option lists (if any)
      lib/                     pure helpers, with their tests
    activities/  calendar/  trends/  power-curve/  records/  climbs/
    heatmap/  review/  settings/  compare/  gear/  threshold-update/
  shared/
    ui/                Card, Toggle, StatTile, DataTable, ActivityList, EnvironmentBadge … (no data fetching)
    charts/            EChart, chartTheme, markers/ (MarkerChart, MarkerCard, Vo2maxCard: used by Trends and Power Curve)
    map/               useBaseMap, HeatmapMap (Heatmap and Year in review)
    api/               tRPC client and API types (client.ts), plus one file per shared domain (activities, settings, records …) with its hooks and query keys
    lib/               formatters, theme, dates, climbs
```
- Code used by one feature lives inside that feature. Move it to `shared/` only when a second feature needs it.
- A feature imports only from `shared/` and its own folder, never from another feature. ESLint enforces this with `no-restricted-imports` patterns per feature folder (`eslint.config.js`); `shared/` may not import from `features/` or `app/`.
- Import through the `@/` alias for `apps/web/src/`, not long relative paths (`../../..`).
- Each feature's `api.ts` owns that feature's hooks and defines its query keys in one place (e.g. `garminKeys.deletedCheck()`), so invalidation can't drift. Queries used by several features live in `shared/api/<domain>.ts` (e.g. `activityKeys.detail(id)`). There is no single app-wide hooks file.
- A route with URL search params gets its type and `validateSearch` from the feature's `search.ts`; `app/router.tsx` only wires routes to pages.

### Components
- Declare components as typed arrow functions with destructured props, and a `<Name>Props` type right above. Never use the `function` keyword for components, and no class components:
  ```tsx
  type FitnessCardProps = { today: string; firstFtp: string | null };

  export const FitnessCard = ({ today, firstFtp }: FitnessCardProps) => {
    …
  };
  ```
- One exported component per file, and the file is named after it (`FitnessCard.tsx`).
- Pages only compose: they read URL state, call the feature's hooks and lay out components. No calculations and no helper components defined inside a page.
- Keep components focused and tight, but never at the cost of readability. There's no line limit, except that **a component over 400 lines must be split** (into sub-components, a hook, or `lib/` helpers).
- Constants go at the top of the file or in the feature's `constants.ts`, never scattered between functions.
- Pure logic goes in `lib/` with a unit test. Training math always goes in `@app/metrics`, never in the web app.
- A card with several parts gets its own folder under `components/` (`components/weekly-load/WeeklyLoadCard.tsx`, `WeeklyLoadSummary.tsx` …). Large ECharts option builders live next to their component as `<name>ChartOption.ts`, so the component stays readable.

### API and ingest
- The tRPC API has one router file per domain in `apps/api/src/routers/` (activities, settings, climbs, records …), merged in `router.ts`. Each builds on the shared `t` and `ApiContext` in `trpc.ts`. (Only `repeats` has been split out so far; the older domains are still inline in `router.ts`.)
- Large ingest modules are split into steps, like the existing `rebuild/*.ts` files (per-ride processing, derived files, manifest).

## Code style

- **Readable over clever.** Code should be obvious to someone reading it for the first time.
  - Descriptive names; no unclear abbreviations (`lthrHistory`, not `lh`).
  - Early returns instead of deep nesting.
  - No nested ternaries: one level at most. Beyond that, use `if` with an early return, or a small sub-component.
  - No dense one-liners that pack several steps together: split them into named intermediate values.
  - Name what a condition means (`const isRecovering = form > 5`) instead of repeating the expression.
  - Prefer a plain loop or a clear `map`/`filter` chain over clever `reduce` tricks.
- TypeScript strict. No `any` without a comment explaining why.
- Named exports everywhere (`export const …`), including page and route components. No default exports. Lazy-loaded components use `lazy(() => import(…).then((m) => ({ default: m.Name })))`.
- Naming:
  - components, and the files they're in: `PascalCase`;
  - hooks: `useCamelCase`;
  - other functions and their files: `camelCase`;
  - constants: `UPPER_SNAKE_CASE`;
  - folders: `kebab-case` (`power-curve/`, `weekly-load/`);
  - types: `PascalCase`.
- Formatting is Prettier's: run `npm run format`. Lint checks it, so don't hand-format against it.
- Tests sit next to the code they test (`change.test.ts` beside `change.ts`). Packages keep their existing `test/` folders.
- Comments explain why, not what. No dead code or commented-out code.
- Validate external data (Garmin responses, FIT parse output, cache files on read) with zod at the boundary.
- Small, focused modules. Keep the metrics package free of I/O.
- Write a test for every metric function and every parser edge case found.

## Working agreements for Claude

- Ask before adding new dependencies. (Prettier, as a dev dependency, was approved on 9.11.2026.)
- Do not invent Garmin API endpoints, fields, or behaviors. If unsure, stop and ask.
- Do not touch `.env`, `data/`, or real FIT files except to read them when asked.
- Run `npm run typecheck` and `npm test` before declaring a task done.
- Keep changes scoped to the task. Mention any unrelated issues you notice instead of fixing them silently.
