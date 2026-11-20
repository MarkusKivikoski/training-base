# Strava integration plan: friends log in with Strava and see their own data

*Written 9.11.2026, from Strava's developer docs, API Agreement (effective 1.6.2026) and API Policy (2026), read that day (see Sources). Replaces the storage assumptions in `stravaPlan.md` (8.11.2026), which predate a careful read of the 2026 API Policy. Not legal advice. Strava changes these terms, so re-check them before each phase.*

## The short answer

- **Is "Log in with Strava" possible? Yes.**
  - Strava's OAuth 2.0 flow returns the athlete's id with the tokens, so it can serve as the app's login.
  - A new app works for you only. One self-service click in Strava's dashboard raises it to **10 connected athletes, you included** (so 9 friends), with no review.
  - **You need a Strava subscription** to create and run an API app (Standard tier; required since 1.6.2026). The requirement is on the developer, so your friends only need ordinary Strava accounts.
- **Can friends then see their own data? Yes, with a big catch.**
  - Strava's 2026 API Policy allows Strava data to be kept **only in a cache of at most 7 days**.
  - Anything derived from it may not go into persistent storage.
  - Location data may not be aggregated or stored.
- **What Training Base does today breaks those rules for Strava data:**
  - years of stored history, CTL/ATL, the power curve, records, the heatmap and climbs.
  - So friends can't get today's full dashboard from Strava data unless Strava agrees.
- **Recommended path:**
  1. **Build the shared foundation:** hosting, a database, accounts, per-user data.
  2. **Add "Log in with Strava" plus a compliant Strava "live" view:** recent rides, ride details on demand, and longer-term views recomputed from data fetched fresh from Strava when the friend uses the app, never kept past 7 days. No heatmap and no climbs for Strava data.
  3. **Give friends a durable data source that isn't Strava data:** they upload their own FIT files (any device), or a Garmin account export zip (the importer already in the backlog). That data unlocks every feature, history included.
  4. **Ask Strava in writing,** in parallel, whether keeping a user's own activity history for that user's own analysis is allowed for a ≤10-athlete app (questions at the end). If yes, Strava becomes a durable source and step 3 becomes optional.
- **A database is needed: SQLite**, two files on the server:
  - the app database: users, sessions, encrypted Strava tokens, jobs, webhook events and a deletion log;
  - a separate Strava cache file with expiry times (≤7 days), never backed up.

  Each friend's durable data stays in the existing per-user file layout.

---

## 1. Verified facts (9.11.2026)

### 1.1 Authentication (OAuth 2.0)
- **Authorize:**
  - `GET https://www.strava.com/oauth/authorize` with `client_id`, `redirect_uri`, `response_type=code` and `scope`.
  - Optional: `state` (use it against CSRF) and `approval_prompt=auto|force`.
- **Token exchange:**
  - `POST https://www.strava.com/oauth/token` with `client_id`, `client_secret`, `code` and `grant_type=authorization_code`. The code is short-lived and single-use.
  - The response: `access_token`, `refresh_token`, `expires_at`, `expires_in`, `athlete` (profile, including the id) and `scope`.
  - The granted `scope` can be narrower than requested, because users can untick boxes, so check it.
- **Scopes for this app:**
  - `read` gives the basic profile.
  - **`activity:read_all`** gives all activities, including "Only You" ones and privacy-zone data.
  - `activity:read` is the minimum, and webhooks need at least it.
  - Not needed: `profile:read_all` (weight, FTP) and any write scopes.
- **Tokens:**
  - Access tokens expire **6 hours** after creation. Refresh at the same token endpoint with `grant_type=refresh_token`.
  - If more than an hour is left, the same token comes back.
  - **Refresh tokens rotate, and the old one is invalidated immediately**, so always store the newest one.
- **Revoking access:**
  - Use `POST https://www.strava.com/oauth/revoke` (HTTP Basic auth with `client_id:client_secret`, body `token`). It's available since 1.6.2026.
  - The legacy `POST /oauth/deauthorize` is the only other option, and it stops working on **1.6.2027**.
  - Revoking either token type revokes both, and revoke returns 200 even when the token is unknown.
- **As a login:** Strava's docs don't have a "sign in" section, but OAuth returns the athlete id, and the brand guidelines' "Connect with Strava" button must link to `oauth/authorize`. Using that flow as the app's login is the usual pattern.

### 1.2 App tiers, capacity and cost
| Stage | Athletes | How |
|---|---|---|
| New app ("Single Player Mode") | 1 (you) | default |
| Self-service upgrade | **10** | a button in the API Settings Dashboard, no review |
| Standard tier, reviewed | up to 9,999 | review form, only once you have 10 athletes |
| Extended Access | 10,000+ | approval; exempt from the subscription rule |

- **The developer's Strava subscription is required:** *"A Strava subscription is a prerequisite for creating an app."* That's around $11.99/month according to secondary sources; check Strava's price in Finland.

### 1.3 Rate limits (per app, shared by all users)
| | 15 min | Day |
|---|---|---|
| Read (default) | 100 | 1,000 |
| Overall (default) | 200 | 2,000 |
| Read (after the 10-athlete upgrade) | 200 | 2,000 |
| Overall (after the 10-athlete upgrade) | 400 | 4,000 |

- **Resets:** the 15-minute windows reset at :00, :15, :30 and :45; the day resets at midnight UTC.
- **Headers:** `X-RateLimit-Limit`/`-Usage` and `X-ReadRateLimit-Limit`/`-Usage`, each "15 min, day".
- **Over the limit:** `429`, and rejected requests still count toward the daily limit.

### 1.4 Endpoints this plan uses
- **Activity list:** `GET /athlete/activities` with `before`/`after` (epoch seconds), `page` and `per_page` (default 30, **max 200**).
  - Summary fields: `distance`, `moving_time`, `elapsed_time`, `total_elevation_gain`, `sport_type`, `start_date_local`, `trainer`, `device_watts`, `average_watts`, `weighted_average_watts`, `kilojoules`, `average_heartrate`, `max_heartrate`, `device_name`, `map.summary_polyline`.
- **One activity:** `GET /activities/{id}`, the detailed activity.
- **Streams:** `GET /activities/{id}/streams?keys=…&key_by_type=true`.
  - Keys this app needs: `time`, `watts`, `heartrate`, `cadence`, `velocity_smooth`, `altitude`, `distance`, `latlng`, `moving`.
  - Each stream reports a `resolution`. Confirm from a real response that full-resolution data comes back by default.
- **Original FIT/GPX files:** there's no API endpoint for them.
- **Base URL:** `https://www.strava.com/api/v3` today.
  - The changelog says `https://api-v3.strava.com` becomes available on **4.1.2027**. Keep the base URL configurable.
  - A secondary source says tokens must be sent in headers from 1.6.2027, so always use `Authorization: Bearer`.
- **Removed or restricted on 1.9.2026:** club endpoints, and Explore Segments. Neither is used here.

### 1.5 Webhooks
- **One subscription per app:** `POST /push_subscriptions` with `client_id`, `client_secret`, `callback_url` (≤255 chars) and `verify_token`.
- **Validation:** Strava sends a GET with `hub.challenge`, and the app must answer within **2 s** with `{"hub.challenge": "…"}`.
- **Events:**
  - Fields: `object_type` (`activity`|`athlete`), `aspect_type` (`create`|`update`|`delete`), `object_id`, `owner_id`, `updates`, `event_time`.
  - Activity updates cover the title, type and privacy.
  - **Deauthorization** arrives as an athlete event with `updates: {"authorized": "false"}`.
- **Response rules:** answer **200 within 2 s** and do the work asynchronously. Strava makes up to 3 attempts.

### 1.6 API Policy (2026): the clauses that shape this design
| § | Rule (short quotes) | Effect here |
|---|---|---|
| 2.3, 6.1 | Data "may be displayed or disclosed … only to that user" | Every view is per user. No leaderboards, group heatmap or comparing friends. |
| **6.2** | "You may not retain Strava Data in your cache for longer than seven (7) days." Beyond that cache, "you may not store Strava Data" | **No stored Strava history.** The cache keeps everything ≤7 days. |
| 6.3 | Deleted data must disappear "within forty-eight (48) hours" | Activity-delete webhooks purge the cache at once. |
| 6.4 | Use and retain data "only so long as necessary for the purpose" | Keep only what a feature needs. |
| **5.5** | No Strava Data "or any data derived from Strava Data, in any Persistent Index" (vector stores, search indexes, knowledge graphs, archives); the 7-day cache is exempt | Derived results (TSS, CTL, records) also live only in the cache. |
| **5.7** | You may not "aggregate, cache, or store geographic location information" except as §6.2 permits | GPS only in the 7-day cache, for showing one ride's map. **No heatmap and no climbs** from Strava data. |
| 5.4 | No processing "for the purposes of analytics, analyses …"; "You may not combine Strava Data with other customer data" | **Unclear for per-user training analysis** (it reads as aimed at aggregate analytics). Don't merge Strava data with other sources. Ask Strava. |
| 5.3, 5.10 | No use with AI applications, "even if a user … consents" | The app has no AI. **Never paste friends' (or your own) Strava API data into AI tools,** including the coding assistant: use synthetic test fixtures. |
| 2.5, 7.4 | On a user's request, revocation or account deletion, delete "within thirty (30) days" and give "written confirmation" | A delete flow with an on-screen confirmation, plus email if the friend gave one. |
| 7.3 | "You must provide a lawful privacy policy" | A privacy page before inviting anyone. |
| 8.1, 8.3 | Security measures; report incidents "no later than twenty-four (24) hours after discovery" | Encrypted tokens, patched server, an incident checklist. |
| Agreement | No apps that "compete with or replicate Strava functionality" | Another reason to keep the heatmap and climbs out of the Strava mode. |

### 1.7 Branding
- **"Connect with Strava" button:** use the official one (48 px high at 1x), linking to `oauth/authorize`.
- **Attribution:** "Powered by Strava" (or "Compatible with Strava") with the official logo; links to the original activity say **"View on Strava"** (bold, underlined or `#FC5200`).
- **Naming:** the app's name must not contain "Strava" or suggest Strava endorses it.
- **Garmin attribution:** news coverage (Oct–Nov 2025) says Garmin-recorded data shown via Strava must credit Garmin, e.g. with `device_name` ("Edge 1030") near the title. Strava's guidelines page doesn't mention it, so confirm before launch.

---

## 2. What friends can and can't get from Strava data

The "live" mode keeps Strava data only in a ≤7-day cache, and recomputes longer views from freshly fetched summaries. **It fetches only when the friend actually uses the app** and the cache is stale (older than a day). Nothing refreshes in the background to keep an inactive friend's data alive, so after a week without visits nothing of theirs from Strava remains. The "own files" mode covers data friends upload themselves (FIT files or an export zip), which isn't Strava data, so the app may store it like your Garmin data.

| Feature | Strava live mode | Own files |
|---|---|---|
| Recent rides, ride page (summary, charts, map, time in zones, intervals, laps from streams) | ✓, fetched on opening, cached ≤7 days | ✓ |
| Compare two rides | ✓, 2 stream calls | ✓ |
| Fitness & form (CTL/ATL/TSB), weekly load, goals | ✓, **approximate**: TSS from summary fields, recomputed from a fresh list when the friend visits and the cache is stale | ✓, exact (TSS from streams) |
| Calendar, Trends volume, year over year, Year in review totals | ✓, from summaries | ✓ |
| Records from summaries (longest, most climbing, avg/max speed, streaks, rides per week, first ride, breaks) | ✓, recomputed in the cache | ✓ |
| Fastest distance efforts, power curve, eFTP, VO₂ max, rider profile, max HR trend | ✗: they need every ride's streams, about 400 calls per friend each time the cache is cold. That's too slow and too much of the shared rate budget, and keeping them warm in the background would amount to storage | ✓ |
| Heatmap, climbs | ✗ (§5.7: aggregating location) | ✓ |
| Activity search and filters | ✓, over the cached summaries | ✓ |

**TSS from summaries:**
- Power rides: `weighted_average_watts` (Strava's normalized-power-style value) × `moving_time` against the friend's FTP.
- Rides without power: a heart-rate estimate from `average_heartrate` against their LTHR, which is cruder than the stream-based heart-rate TSS.
- The UI labels it as an estimate, and it isn't byte-identical to the stream-based numbers.

**Rate-limit check, live mode, 10 athletes (you and 9 friends):**
- **Summaries:** 5 years ≈ 750 activities ≈ 4 list calls of 200 each, at most once a day per active friend, plus 1 call per webhook event for friends with a live cache. That's under 100 reads a day.
- **Ride pages:** 2 calls each (details and streams).
- **Total:** comfortably inside 1,000 reads a day (2,000 after the upgrade).

---

## 3. Architecture

### 3.1 What stays
- **`@app/metrics`:** all formulas, pure, used by both modes.
- **Per-user file stores:** they already take a `dataDir` (all 38 store functions), so each user gets `data/users/<userId>/` with the same `raw/`, `fit/`, `streams/`, `activities/`, `derived/` and `settings/` layout.
- **Rebuild:** incremental, with its manifest, the derived files and the web UI.
- **Your Garmin Personal API sync:** it keeps feeding your own account directory.

### 3.2 What changes
| Piece | Today | After |
|---|---|---|
| **API context** | `server.ts` builds one context for one `dataDir` at startup | `createContext` reads the session cookie and resolves the user to that user's stores and index cache (LRU-cached). A procedure can't reach another user's directory. Unauthenticated requests reach only the login and webhook routes. |
| **Settings** | `settings/*.json` | Unchanged per user. The Settings page already exists, and its writes become per-user. |
| **Sync job** | one child process (`npm run sync`) | A **worker** with a job queue in the database. Kinds: Garmin sync (you), file import, Strava refresh, rebuild. One global Strava rate budget. |
| **Hosting** | localhost, two dev processes | One production Fastify process serving the built web app and the API over HTTPS. |

### 3.3 Database (SQLite)
- **Two files, both in WAL mode:**
  - `data/app.db`: accounts, sessions, tokens, jobs, the deletion log. Backed up.
  - `data/strava-cache.db`: only the `strava_cache` table. **Never backed up**, since a backup older than 7 days would itself be stored Strava data. Losing it only means re-fetching.

  That's enough for one server and 10 users.
- **Library:** `better-sqlite3` (mature; a new dependency to approve) or Node's built-in `node:sqlite`, which works on the installed Node 22.18 but is still marked experimental.
- **Migrations:** schema versions in a `meta` table, applied at startup.

| Table | Columns (main) | Notes |
|---|---|---|
| `users` | `id`, `display_name`, `created_at`, `role` (`owner`/`friend`), `deleted_at` | `owner` is you. |
| `identities` | `user_id`, `provider` (`strava`/`local`), `subject` (Strava athlete id), `created_at` | The athlete id is kept as the account key while the user is connected (§6.4 "necessary for the purpose"; include in the questions to Strava). |
| `sessions` | `id` (random 256-bit, stored hashed), `user_id`, `created_at`, `expires_at`, `last_seen_at` | httpOnly, Secure, SameSite=Lax cookie; 30-day sliding expiry. |
| `strava_tokens` | `user_id`, `access_token_enc`, `refresh_token_enc`, `expires_at`, `scope`, `updated_at` | AES-256-GCM. The key is in `.env` (`TOKEN_ENC_KEY`), never in the DB. Always write the newest refresh token. |
| `strava_cache` (in `strava-cache.db`) | `user_id`, `kind` (`summaries`/`activity`/`streams`/`derived:*`), `key`, `json`, `fetched_at`, `expires_at` | `expires_at` ≤ `fetched_at` + 6 days (a day's margin under the 7-day rule). An hourly purge deletes expired rows. Derived results expire with their source. |
| `jobs` | `id`, `user_id`, `kind`, `payload`, `state`, `attempts`, `run_after`, `created_at` | The worker queue: webhook-triggered refreshes, imports, rebuilds. |
| `webhook_events` | `id`, `received_at`, `object_type`, `aspect_type`, `object_id`, `owner_id`, `processed_at` | Dedupes Strava's retries. Pruned after 30 days. |
| `deletions` | `user_id`, `requested_at`, `completed_at`, `reason` (`request`/`revoked`/`account`) | Evidence for §7.4 and the written confirmation. |
| `invites` | `code_hash`, `created_by`, `expires_at`, `used_by` | So only invited friends can create an account. |

### 3.4 Login and onboarding flow
1. **Invite:** you create an invite link in your admin view, and the friend opens it.
2. **Connect:** "Connect with Strava" sends the friend to `oauth/authorize` with `scope=read,activity:read_all` and a random `state` tied to the invite (stored server-side, 10-minute expiry).
3. **Callback:** `GET /auth/strava/callback` checks `state`, exchanges the code, checks that the granted `scope` includes `activity:read` or `activity:read_all`, then creates the user, identity, encrypted tokens and a session.
4. **First fetch:** the worker fetches the summaries (newest year first) into the cache. The Overview shows the latest rides within seconds; the full summary history takes a few more calls.
5. **Settings:** the friend sets FTP, LTHR and weight (needed for TSS), with a hint to upload files for full features.
6. **Returning:** usually the session cookie is still valid. Otherwise "Connect with Strava" with `approval_prompt=auto` skips Strava's consent screen if they're logged in to Strava; if not, they log in to Strava first.
7. **Your login:** you also need a way in that doesn't depend on Strava (a local password or passkey for `owner`), so the Garmin data stays reachable if Strava access ends.

### 3.5 Strava ingestion (live mode)
- **Client:** `packages/ingest/src/strava/`, with the same shape as the Garmin client:
  - a token provider that refreshes 5 minutes before expiry and persists the rotated refresh token in one transaction;
  - paced requests that read the rate-limit headers, back off on `429`, and keep errors secret-free.
- **Mapping:** Strava summaries map to `ActivitySummary`-like objects.
  - `sport_type` gives sport and `isCycling` (Ride, VirtualRide, GravelRide, MountainBikeRide, EBikeRide, …).
  - `trainer`, or having no GPS, gives `isIndoor`.
  - Streams map to `ActivityStream`: `watts`→`power`, `heartrate`→`hr`, `velocity_smooth`→`speed`, `latlng`→`lat`/`lng`, and so on.
  - Tests use **synthetic fixtures** written from the docs, not real API responses (§5.3).
- **Derived views:** computed by the worker with `@app/metrics` from the cached summaries, then written back to `strava_cache` as `derived:*` rows with the same expiry. The API only reads them, keeping today's rule that the API computes nothing.
- **Webhooks:** `GET`/`POST /webhooks/strava`, answering in under 2 s (insert the event, enqueue a job).
  - `create`/`update` refetch that summary and invalidate the derived rows, but only if the friend has a live cache. Otherwise nothing is fetched until their next visit.
  - `delete` removes the activity's rows immediately (§6.3).
  - `authorized: false` deletes the user's Strava data and tokens, and records it in `deletions`.
- **Purge:** an hourly job deletes expired cache rows, and a check at startup does the same. A test asserts that nothing older than 7 days can be returned.
- **No mixing:** a friend's Strava view and their uploaded-file data are **separate sources** with a source switch in the header ("Strava" / "My files"). That avoids §5.4's "combine" until Strava confirms that merging one user's own data is fine.

### 3.6 Friends' own files (durable mode)
- **Upload:** FIT files from any device, or a Garmin account export zip (the backlog's "export-zip importer"; other vendors' export formats need checking first), into `data/users/<id>/fit/`.
- **Processing:** the existing parse → rebuild pipeline, unchanged; all features work.
- **Duplicates:** match by start time, ±60 s, plus duration.
- **Limits:** a size limit per upload, and safe zip handling (no path traversal; extract only `.fit` files). Uploads count as untrusted data.

### 3.7 Hosting and security
- **Where:**
  - a small VPS in the EU (GDPR; e.g. ~€5/month), with Caddy for automatic HTTPS;
  - or a home machine behind a Cloudflare Tunnel (free; depends on the machine being on).
- **Requirements:** HTTPS is needed for the OAuth redirect, the cookies and the webhook. Set the Strava app's "Authorization Callback Domain" to the real domain (localhost works for development).
- **Secrets:** `STRAVA_CLIENT_SECRET`, `TOKEN_ENC_KEY`, `SESSION_SECRET` and the Garmin key live in `.env` on the server only.
- **Backups:** encrypted backups of `data/app.db` (tokens are encrypted in it too) and the durable user directories. **Leave `data/strava-cache.db` out of every backup.**
- **Hardening:** keep the server patched, rate-limit the login and webhook routes, set CSP headers. Write down an incident checklist (Strava needs notice within 24 h).
- **Privacy page:** what is collected, why, where it's stored, how long (Strava data ≤7 days), how to delete, and who to contact.
- **Account page:** "Delete my data" (all sources, revokes the Strava token, then shows a confirmation) and "Disconnect Strava" (revoke and purge the Strava data only).

---

## 4. Phases

Each phase leaves the app working. Effort is relative to the slices built so far.

| # | Phase | Contents | Done when | Effort |
|---|---|---|---|---|
| 0 | **Production server and database** | One-port Fastify serving the built web app; SQLite with migrations; a `users` table holding only you; a local owner login (session cookie); per-user context in the API with your existing data moved to `data/users/<you>/`; deploy script; HTTPS; backups | You log in on the real domain over HTTPS; every page works as today; tests cover "no session → 401" | M |
| 1 | **Strava app and login (single player)** | Register the app (needs your subscription); OAuth with `state`; encrypted token store with rotation; "Connect with Strava" button; Strava linked as a second identity on your account | You can log out and log back in with Strava; the token refreshes after 6 h; revoke works | S–M |
| 2 | **Strava live mode (you as the test user)** | Strava client, mapping, `strava_cache` with TTL and purge, derived views in the worker, a separate "Strava" source in the UI | For the same rides, Strava-derived totals match your Garmin numbers within a few %; nothing older than 6 days in the cache; rate headers logged | M–L |
| 3 | **Webhooks and deletion** | Subscription, event handling, the 48-hour and 30-day deletion paths, "Delete my data", "Disconnect Strava", privacy page | Deleting a ride on Strava removes it here within minutes; revoking access in Strava's settings deletes your Strava cache | M |
| 4 | **Friends' own files** | FIT and zip upload, duplicate detection, per-user rebuild through the worker queue | A friend uploads a Garmin export and sees full features, including the heatmap and power curve | M |
| 5 | **Invite friends** | Upgrade to 10 athletes in Strava's dashboard; invites; onboarding; Garmin attribution; "Powered by Strava"; "View on Strava" links | Up to 9 friends (10 athletes including you) log in with Strava and see only their own data; brand and attribution checks pass | S |
| (6) | **If Strava permits stored history** | Strava as a durable source: write into the user's file stores like Garmin data, behind the same webhook and deletion rules | Only after written confirmation from Strava | M |

---

## 5. Questions to send to Strava (developers@strava.com) before phase 2

1. **Stored history:** for a Standard-tier app with ≤10 athletes, may we store a user's own activity summaries and streams beyond 7 days, shown only to that user, to provide training-history features (fitness/form, records, power curve)? If not, is recomputing them from freshly fetched data within the 7-day cache acceptable?
2. **Derived numbers:** do per-activity numbers we compute (TSS, normalized power, best efforts) count as "data derived from Strava Data" under §5.5/§6.2 when they're stored only for that user?
3. **§5.4:** does "analytics, analyses" cover features that analyse a single user's training for that user only?
4. **Combining sources:** may one user's Strava data be shown alongside that user's own uploaded FIT data (§5.4, "combine … with other customer data")?
5. **The athlete id:** may we keep it as the account identifier for as long as the user stays connected?
6. **Garmin:** what Garmin attribution is currently required for Garmin-recorded activities?

---

## 6. Open decisions for you

1. **Go ahead with the live-mode compromise,** or wait for Strava's answer before building phases 2–5 (phases 0–1 are useful either way).
2. **Hosting:** an EU VPS (recommended for always-on and webhooks) or a home machine with a Cloudflare Tunnel.
3. **SQLite library:** `better-sqlite3` (new dependency, mature) or built-in `node:sqlite` (no dependency, experimental).
4. **File uploads for friends:** include them from the start (phase 4), since they're the only full-featured path today.
5. **Your own data:** keep Garmin as your source (recommended); Strava on your account then serves only for login and testing.

## 7. Risks

- **Terms keep changing:** the 2026 overhaul added the subscription requirement, retired endpoints and tightened storage. The Strava adapter stays isolated, and the durable mode doesn't depend on Strava.
- **The ambiguous clauses (§5.4, §5.5):** a strict reading could also limit the live mode's derived views. That's why the questions in section 5 go to Strava first.
- **Cost:** your Strava subscription is ongoing, and Strava can start charging for API access or end it.
- **Responsibility for friends' health and location data:** GDPR (you're in Finland), plus Strava's 24-hour incident rule. Keep the data minimal, encrypted where it's sensitive, and deletable.
- **The "replicate Strava" clause:** the heatmap and climbs are the closest to Strava's features, which is one more reason they're off for Strava data.

## Sources (read 9.11.2026)
- Strava API, Getting started (Single Player Mode, the 10-athlete upgrade, the subscription prerequisite): https://developers.strava.com/docs/getting-started/
- Strava API, Authentication (OAuth, scopes, token rotation, revoke): https://developers.strava.com/docs/authentication/
- Strava API, Rate limits: https://developers.strava.com/docs/rate-limits/
- Strava API, Webhook events: https://developers.strava.com/docs/webhooks/
- Strava API, Reference and pagination (per_page up to 200): https://developers.strava.com/docs/reference/ and https://developers.strava.com/docs/
- Strava API, Changelog (new base URL 4.1.2027, endpoint removals 1.9.2026, revoke endpoint): https://developers.strava.com/docs/changelog/
- Strava Brand Guidelines: https://developers.strava.com/guidelines/
- Strava API Agreement (effective 1.6.2026): https://www.strava.com/legal/api
- Strava API Policy (2026; §2.3, 2.5, 5.3–5.7, 5.10, 6.1–6.4, 7.3–7.4, 8.1–8.3): https://www.strava.com/legal/api_policy
- Tiers and subscription (secondary): https://tryterra.co/blog/strava-api-changes-2026 and https://forum.intervals.icu/t/strava-api-update-new-terms-subs-required-for-api-access/130240
- Garmin attribution via Strava (news, Oct–Nov 2025): https://www.dcrainmaker.com/2025/10/strava-rolls-out-garmin-attribution-prior-to-deadline.html
