# Strava integration plan: opening Training Base to a few friends

> **Superseded on 9.11.2026 by [`stravaIntegrationPlan.md`](stravaIntegrationPlan.md).** Strava's 2026 API Policy allows Strava data only in a cache of at most 7 days, with no stored or derived history and no aggregated location data. The per-user stored-history design below doesn't meet that.

*Written 8.11.2026. Strava facts were checked that day against Strava's developer docs and API agreement (see Sources). Re-check them before building: Strava changes its terms when it publishes them.*

## Summary

- **Recommendation:** use **Strava as the data source for friends.** Each friend clicks "Connect with Strava", approves read access on Strava's own page, and the app gets OAuth tokens. Nobody handles API keys.
- **Garmin users are covered too:** most of them already auto-sync to Strava, so one integration serves everyone.
- **Garmin's partner program can be skipped,** along with the per-user Personal API keys that the current single-user app depends on.
- **Strava's limits fit "a couple of friends" exactly:**
  - a new app works only for its creator ("Single Player Mode");
  - one self-service upgrade in the dashboard raises it to **10 athletes**, no review needed;
  - beyond 10 needs Strava's review.
- **The data is good enough:** per-activity streams (time, power, heart rate, cadence, speed, altitude, GPS, distance) feed the existing metrics pipeline unchanged. Original FIT files aren't available, which only costs Garmin-specific extras.
- **The real work isn't Strava itself.** It's turning a single-user local app into a small hosted multi-user one: login, per-user data, per-user settings, background ingestion within a shared rate limit, HTTPS hosting, and privacy basics.

## Why Strava rather than Garmin for friends

| Option | Problem |
|---|---|
| Garmin Personal API (what the app uses now) | One key per Garmin account, meant for personal use. Friends would hand over their keys; non-Garmin friends are excluded. |
| Garmin Connect Developer Program | The proper multi-user Garmin route, but needs an application and approval as a business partner. Garmin users only. |
| One copy of the app per friend | Each needs their own Garmin key and hosting; non-Garmin friends are excluded. |
| **Strava API** | Standard OAuth, self-service up to 10 athletes, and works for anyone whose device or app syncs to Strava (Garmin, Wahoo, Coros, Zwift, MyWhoosh, phones). |

## Verified facts (8.11.2026)

### Authentication (OAuth 2.0)
- **Flow:**
  1. Redirect the user to `GET https://www.strava.com/oauth/authorize` with `client_id`, `redirect_uri`, `response_type=code` and `scope`. Optional extras: `state` (use it against CSRF) and `approval_prompt`.
  2. Strava redirects back with a short-lived, single-use `code`.
  3. Exchange it at `POST https://www.strava.com/api/v3/oauth/token` with `client_id`, `client_secret`, `code` and `grant_type=authorization_code`.
  4. The response contains `access_token`, `refresh_token`, `expires_at`, `athlete` (profile, including the athlete id) and the granted `scope`.
- **Scopes this app needs:**
  - `activity:read_all`: activities including "Only You" ones and privacy-zone data. `activity:read` is the minimum, and it's also what activity webhooks require.
  - optionally `profile:read_all` (weight, FTP).

  Users can untick scopes, so always check the `scope` that comes back.
- **Access tokens expire after 6 hours.** Refresh at the same token endpoint with `grant_type=refresh_token`:
  - if the current token has more than an hour left, it's returned unchanged;
  - **the refresh token can rotate on any response, and the old one is invalidated immediately**, so always store the latest one.
- **Revoking access:** use `POST https://www.strava.com/oauth/revoke` (HTTP Basic auth with the client id and secret). It's the recommended endpoint from 1.6.2026, and the legacy `/oauth/deauthorize` stops working on 1.6.2027.

### Athlete capacity
| Stage | Athletes who can connect |
|---|---|
| New app ("Single Player Mode") | 1, the developer only |
| Upgraded from the API Settings Dashboard (self-service) | **10** |
| More than 10 | Submit the app for review (Developer Program form, with screenshots of everywhere Strava data and the "Connect with Strava" button appear; not guaranteed) |

### Rate limits (per application, shared by all users)
| | 15 min | Day |
|---|---|---|
| Read (default) | 100 | 1,000 |
| Overall (default) | 200 | 2,000 |
| Read (after the dashboard upgrade) | 200 | 2,000 |
| Overall (after the dashboard upgrade) | 400 | 4,000 |

- Going over the limit returns `429`. Rejected requests still count toward the daily limit.
- The 15-minute windows reset at :00, :15, :30 and :45, and the daily limit resets at midnight UTC.
- Strava's own advice: use **webhooks instead of polling**, and **throttle backfills**.

### Webhooks
- **Subscribing:** one subscription per app, created with `POST https://www.strava.com/api/v3/push_subscriptions` (`client_id`, `client_secret`, `callback_url`, `verify_token`).
- **Validation:** Strava validates the callback with a GET carrying `hub.challenge`, and the app must echo it back as JSON **within 2 s**.
- **Events** (POST to the callback): `object_type` `activity` | `athlete`, `aspect_type` `create` | `update` | `delete`, `object_id`, `owner_id`, and `updates`:
  - activity updates report changes to the title, type or privacy;
  - **athlete deauthorization arrives as `{"authorized": "false"}`**.
- **Response rules:** answer **200 within 2 s** and do the work asynchronously. Strava makes up to 3 attempts in total, and one save can produce several events.

### Data endpoints
- **Listing activities:** `GET /athlete/activities` with `before` and `after` (epoch seconds), `page` and `per_page` (default 30).
- **One activity's details:** `GET /activities/{id}`. Useful fields include `sport_type`, `trainer`, `device_watts`, `average_watts`, `weighted_average_watts`, `kilojoules` and `device_name`.
- **Streams:** `GET /activities/{id}/streams?keys=…&key_by_type=true`, which returns the data points described below.
- **Original FIT/GPX files aren't available.** There's no download endpoint for activity files (only route exports and uploads).

| Strava stream | Unit | Training Base stream channel |
|---|---|---|
| `time` | s | `time` |
| `watts` | W | `power` |
| `heartrate` | bpm | `hr` |
| `cadence` | rpm | `cadence` |
| `velocity_smooth` | m/s | `speed` |
| `altitude` | m | `altitude` |
| `distance` | m | `distance` |
| `latlng` | [lat, lng] | `lat`, `lng` |
| `moving` | bool | (could replace the stream moving-time heuristic) |
| `grade_smooth`, `temp` | %, °C | not used today |

### API agreement (effective 1.6.2026): what it means here
- **Each user's data may be shown only to that user.** *"Strava Data provided by a specific user can only be displayed or disclosed in your Developer Application to that user."*
  - So there can be **no shared views between friends**: no leaderboards, no group heatmap, no comparing records.
  - Sharing one user's data with others requires that user's explicit consent.
- **Security:** you must maintain appropriate technical and organisational security measures. If the agreement ends, all Strava data must be deleted, Strava must be told in writing, and users must be informed.
- **Scope of apps:** apps must "interact with and enhance the Strava Platform", and may not "compete with or replicate Strava functionality". A personal training-analytics dashboard is the usual kind of API app, but **a heatmap and records come closest to Strava's own features**. Keep this in mind, and read the full agreement before launch.
- **Cost:** free today, but Strava may start charging, change the API, or end access at any time.
- **Branding:** no general right to use the Strava name or marks; follow Strava's Brand Guidelines (the "Connect with Strava" button, "Powered by Strava").
- **Garmin attribution:** since Oct/Nov 2025, apps that **display Garmin-recorded data obtained through Strava must attribute Garmin as Garmin's brand guidelines require**. That means the device model name (e.g. "Edge 1030") near the activity's title, optionally with a Garmin logo. `device_name` on the activity supplies it. *This part comes from news coverage, so confirm it in the current agreement and Garmin's guidelines.*
- *Not legal advice: have someone read the full agreement, the policy and the brand guidelines before inviting friends.*

## Consequences for the design

1. **Data stays per user, no exceptions.** Every view shows only the logged-in user's data. That's already true today, so no current feature has to change. Group features are ruled out unless each friend gives explicit consent.
2. **Streams instead of FIT.**
   - A new Strava ingestion adapter produces the same `ActivitySummary` and `ActivityStream` as the FIT path, so metrics, zones, records, trends, maps and the calendar all work unchanged.
   - Garmin-only fields (training effect, Garmin's own TSS) are missing for Strava users, which is acceptable because the app computes its own metrics.
   - The GPS-glitch filtering stays essential: Strava streams have the same jumps.
3. **One shared rate budget.**
   - **Ongoing use is cheap:** a new ride costs one webhook event plus about 2 reads (details and streams), so 10 users riding daily use well under 100 reads a day.
   - **The backfill is the expensive part.** Five years of history is about 400–800 activities per person. Fetching streams for **rides only** (summaries for everything else) is about 400 stream calls, plus a few list pages.
   - **Throughput:** with about 60–70% of the daily read budget (around 650 of 1,000 reads a day) for backfills and headroom kept for everything else, one friend's 5 years takes about **1 day**, and 5 friends about **4–5 days**. The dashboard upgrade (2,000 reads a day) roughly halves that.
   - **Order:** the newest year first, so each friend sees useful data within minutes.
4. **The app must be reachable from the internet over HTTPS,** for the OAuth redirect URL and the webhook callback. That's no longer a "localhost only" app.
5. **GDPR:** friends' heart rate, GPS tracks and rides are personal data, and arguably health data, in the EU (you're in Finland). That calls for:
   - a short privacy note;
   - a "Delete my data" button;
   - deleting a user's data automatically when they deauthorize the app (the webhook);
   - encrypted secrets and backups.

## Architecture

### What stays as it is
- `@app/metrics`: all formulas.
- The file stores in `packages/shared/src/store/`. **They already take a `dataDir`**, so per-user storage is mostly a matter of giving each user their own directory.
- Rebuild (incremental, with its manifest), the derived files, and the whole web UI.
- Your own Garmin Personal API sync, as one more source for your account.

### What's new
| Piece | Notes |
|---|---|
| **Users** | `data/users/<userId>/`, each a complete data directory (`raw/`, `streams/`, `activities/`, `derived/`, `settings/`). A small `data/users.json` (or SQLite if it grows) maps user id → Strava athlete id, name and source. |
| **Login** | "Log in with Strava" doubles as the login: the athlete id identifies the user. Session: a signed, httpOnly, secure cookie. Your own account can also have a local password or stay "Garmin + Strava". |
| **Token storage** | The refresh token, and the latest access token with its expiry, per user, **encrypted at rest** (AES-GCM, key in `.env`). The rotation rule: always persist the newest refresh token. |
| **Strava client** | `packages/ingest/src/strava/`: token refresh, the list, details and streams calls, reading `X-RateLimit-Usage`/`-Limit` headers, backoff on `429`. Same structure as the Garmin client (pacing, retries, secret-free errors). |
| **Strava → summary/stream mapping** | `sport_type` → sport and `isCycling` (Ride, VirtualRide, GravelRide, MountainBikeRide, EBikeRide…), `trainer` / no GPS → `isIndoor`, streams → channels (table above). Unit-tested on recorded sample responses. |
| **Ingestion queue** | One worker with a **global rate budget** (15-min and daily windows) shared by all users. The webhook enqueues new activities first, then backfills (newest first, round-robin between users), then retries. Each user gets an incremental rebuild of their own directory. |
| **Webhook endpoint** | `GET /strava/webhook` (challenge) and `POST /strava/webhook` (events), answering in under 2 s and doing the work through the queue. Handles `create`, `update` (renamed, type changed, privacy) and `delete` for activities, and athlete deauthorization (delete the user's Strava data). |
| **API scoping** | Every tRPC procedure resolves the session's user, then that user's stores and index cache. No procedure can reach another user's directory. |
| **Settings UI** | Friends can't use the CLI: they need a Settings page for FTP, LTHR, weight and privacy trim (today these are `npm run settings`). Optionally read weight and FTP from the Strava profile (`profile:read_all`). |
| **Production server** | Fastify serves the built web app and the API on one port; it's the "always-on app" slice. It needs HTTPS: a small VPS, or a home machine behind a Cloudflare Tunnel. |
| **Privacy & attribution** | A privacy page, a "Delete my data" button, "Powered by Strava", and the Garmin device attribution on Garmin-recorded activities. |

## Phased plan

Each phase leaves the app working. Effort is relative to the slices built so far.

| # | Phase | Contents | Effort |
|---|---|---|---|
| 0 | **Production server & hosting** | One-port Fastify server, HTTPS, simple deploy and backups. A prerequisite for OAuth and webhooks. | Medium |
| 1 | **Strava login for you (single player)** | Register the Strava app; OAuth flow, sessions and encrypted token store; "Connect with Strava" button per the brand guidelines. | Small–medium |
| 2 | **Strava ingestion for one user** | Strava client, mapping and rate-budgeted backfill into your own directory as a second source. **Check against your Garmin data:** for overlapping rides, NP/TSS, distance and time should match within a few %. Decide how to deduplicate when both sources hold the same ride (match on start time and duration). | Medium–large |
| 3 | **Multi-user core** | Per-user data directories, API scoping by session, per-user index caches, Settings page, "Delete my data". | Large |
| 4 | **Webhooks & queue** | Webhook subscription, event handling including deauthorization, the global rate-budget queue, round-robin backfills, and progress in the sync status ("Importing your history… 2021–2023 left"). | Medium |
| 5 | **Invite friends** | Upgrade to 10 athletes in the Strava dashboard; privacy note, Garmin attribution, onboarding (connect → newest year within minutes → older years over the next days). | Small |

## Open decisions

1. **Your own account:** keep the Garmin Personal API (FIT files: Garmin's extras and exact data) and add Strava only for friends, or move yourself to Strava too, which would simplify the code. Recommendation: **keep Garmin for yourself**, with Strava as an extra source and deduplication.
2. **Hosting:** a small VPS (simple, around €5/month) or a home machine with a Cloudflare Tunnel (free, depends on your machine being on).
3. **Data store:** stay with files per user (fits the current design; fine for 10 users) or move to SQLite. Recommendation: **files plus a tiny users file**, and revisit only past 10 users.
4. **Non-ride activities for friends:** summaries only (cheap), or streams too (costs rate budget, adds little).
5. **Group features:** none by default, because of the agreement. Anything shared (e.g. a group calendar) needs explicit consent from each friend and a careful read of the terms.

## Risks
- **Strava terms change** (charging, limits, new restrictions). Mitigation: the source adapter is isolated, so friends could later switch to another source (an Intervals.icu-style import, or file upload).
- **The "doesn't replicate Strava" clause:** a heatmap and personal records are the closest to Strava's own features. Low risk for a private tool with ≤10 friends, but it's Strava's call.
- **Garmin attribution rules** may change again, after the 2025 dispute between Garmin and Strava.
- **The backfill is slow** because of the shared rate limit. Friends see their latest year quickly, and the full history arrives over days.
- **Responsibility:** you'd hold other people's health and location data. Keep the server patched, secrets encrypted and backups protected.

## Sources (checked 8.11.2026)
- Strava API: Getting started (Single Player Mode, athlete capacity): https://developers.strava.com/docs/getting-started/
- Strava API: Authentication (OAuth, scopes, token lifetimes, revoke): https://developers.strava.com/docs/authentication/
- Strava API: Rate limits: https://developers.strava.com/docs/rate-limits/
- Strava API: Webhook events: https://developers.strava.com/docs/webhooks/
- Strava API: Reference (activities, streams, `device_name`): https://developers.strava.com/docs/reference/
- Strava API Agreement (effective 1.6.2026): https://www.strava.com/legal/api
- Garmin attribution via Strava (news coverage, Oct–Nov 2025): https://www.dcrainmaker.com/2025/10/strava-rolls-out-garmin-attribution-prior-to-deadline.html and https://www.cyclingweekly.com/news/strava-adds-garmin-attribution-to-activities-after-dropping-legal-action
