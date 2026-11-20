# Planned and possible features

*A backlog of features not built yet, collected on 8.11.2026 and last updated on 9.11.2026. Nothing here is committed to; each item is a candidate slice. Effort is relative to the slices built so far: S small, M medium, L large.*

**Already built:**
- Garmin sync with incremental rebuild and the Sync now button;
- Overview with fitness and form zones;
- Calendar with fatigue background;
- Trends;
- Power Curve and VO₂ max estimate;
- Records;
- Heatmap;
- Activities and ride detail, with charts, map, time in zones and records.

**Built from this backlog (8.11.2026):**
- **Weekly load against recent weeks:** a Weekly load card on the Overview. It compares the last 7 days' TSS with your usual week (the 4 weeks before) and shows a status, from recovery week to very big jump.
- **Time in zones by week and month:** on Trends. Heart rate or power, by week or month, in hours or %, plus an easy/moderate/hard split for the last 4 weeks.
- **Intervals and laps:** work intervals detected from power (88% of FTP or more for 30 s+), shaded on the power chart, and the device's laps from the FIT file (stream schema v3).
- **Compare two rides:** `/compare`. It has a side-by-side table with differences, charts overlaid by distance, and similar-ride suggestions. Every ride page links to it.
- **Climbs:**
   - Climbs are found in outdoor rides (15 m or more of gain, at 3% or steeper, over 300 m+) and grouped into distinct hills.
   - Every pass over a climb is timed by GPS and ranked.
   - Pages: Climbs, a page per climb (map, profile, history; climbs can be renamed), and a climbs card on ride pages.
   - Climb records: longest climb, and biggest gain on a climb.
- **Goals:** in `settings/goals.json`, edited on the Overview. Each shows progress against an even pace, what's needed per week, and a pace chart.
- **Load for non-ride activities:** an "All activities" load card on the Overview. Other sports count heart-rate TSS, labelled as an indicator and kept out of cycling fitness. It starts with the first LTHR (27.10.2026) and is never back-dated.
- **Activity search and filters:** name search, type, indoor/outdoor, date range, distance range and "has power", filtered in the API and kept in the URL.
- **Manual light/dark switch:** Auto / Light / Dark in the sidebar and mobile header, remembered in the browser. Charts and maps follow it.
- **Rides deleted in Garmin:** `npm run check-deleted` re-lists Garmin (list requests only) and flags cached activities Garmin no longer has, on Activities and the ride page. `--quarantine` moves their files to `data/quarantine/` after confirmation, and never deletes. First run: 722 of 722 found.
- **Shared table component:** `DataTable` replaced 16 hand-written tables. Time in zones stays custom.
- **Smaller ideas:**
   - Calendar month totals row.
   - Heatmap date-range filter with presets.
   - Power Curve W/kg view and a rider profile card (Coggan's power profile, men's table).
   - Records: rides per week/month/year, hilliest ride, earliest start, longest break between rides, and first ride of each year.
   - Year over year: a Gym workouts option. Trends: a Max heart rate card (best 30 s per year). Climbs sortable by max grade.

**Built on 9.11.2026:**
- **Settings page:** `/settings` edits the FTP, LTHR and weight histories (add, replace, remove dated entries) and the heatmap privacy trim. Saving recomputes stats in the background through the sync job (`npm run sync -- --rebuild-only`, no Garmin calls), queued if a sync is running. `npm run settings` still works.
- **Year in review:** `/review?year=2025`. Totals against the previous year (the same part of it for a year in progress), riding hours by month, highlights from that year's records, max heart rate and climbs, a map of the year's routes and the activity mix.

## Recommended next
1. **Production server with a password** (M): makes the app always on, and is the foundation for the Strava plan. With the settings page done, nothing day to day needs a terminal any more.
2. **Garmin training effect on the ride page** (S): data that's already cached for 185 activities.

---

## Still open from the original spec (CLAUDE.md)

### Garmin export-zip importer — M
- **What:** import FIT files from a Garmin account data export zip (CLAUDE.md, ingestion rule 4), into the same `fit/` → rebuild pipeline.
- **Why:** it's the only spec item not built. It would bring in history older than the API's reach, and anything the API missed.
- **Notes:** match activities against existing ones by Garmin activity ID, or by start time when IDs are missing, so nothing is imported twice. Low urgency, since the API already returned 5 years of history.

### Deployment and protection — M
- **What:** a one-port production server (Fastify serving the built web app and the API), protected by simple auth (a password) or reachable only over a VPN, as CLAUDE.md requires.
- **Why:** today the app is localhost only, and in development it runs as two processes, which has left processes holding ports. A production server makes it something that's simply on.
- **Notes:** a start script, running as a background service on Windows, a home server or a VPS, and backups of `data/settings/` and `data/raw` + `data/fit`. This is also phase 0 of `stravaPlan.md`.

---

## Bigger directions

### Strava and friends — L
- **What:** open the app to up to 10 friends through Strava OAuth, Garmin users included through Strava's sync.
- **Notes:** planned in **`stravaIntegrationPlan.md`** (9.11.2026). Login with Strava works, but the 2026 API Policy limits Strava data to a ≤7-day cache, so friends get a "live" Strava view, plus full features from their own uploaded FIT files. Questions for Strava are in the plan.

### Health view — M/L (needs a check first)
- **What:** sleep, overnight HRV, resting heart rate, skin temperature and similar, next to training load.
- **Notes:** CLAUDE.md says the Personal API offers "health summaries", but the endpoints and fields have to be checked against Garmin's documentation and a probe of your account before planning. Garmin's derived scores (Body Battery, recovery) aren't available, so only raw measurements plus the app's own baselines are possible.

---

## Smaller ideas noted along the way
- **Activity detail:** show Garmin's training effect and training load where present (185 activities have them).
- **Calendar:** optional planned workouts.
- **Data export:** CSV of activities, and of daily load.
- **Earlier load history (decision):** apply the earliest LTHR back in time for the all-activities load indicator only, so strength and runs before 27.10.2026 show up. Today load is never back-dated.
