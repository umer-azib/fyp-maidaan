# Vercel backend deployment preparation - 2026-10-16

| Feature | Role | Dependencies / API | Priority | Actual status |
| --- | --- | --- | --- | --- |
| Express serverless entry and shared contracts | Deployment operator | Root Express wrapper, src/index default app export, production tsconfig, Node 24 | P0 | Compiled entry/health HTTP smoke test passed; shared runtime imports resolve. No deployment performed. |
| Production account isolation | All accounts / trusted operator | Existing private accounts/sessions; runtime deployment guard | P0 | Fixture and temporary-admin login AND old web/mobile sessions blocked on Vercel; regular account login/session/logout tested. Local development records retained. Hosted provisioning/import/seed disabled. |
| Serverless DB lifecycle and notification fallback | Authenticated users | Small pg pool, verified TLS, Vercel pool lifecycle; existing notification API | P0 | Verified TLS required, 3 connections/instance, authenticated polling advertised; web uses 15-second fallback without SSE attempts. Isolated recipient/unauthenticated/polling tests passed; local SSE regressions passed. Hosted pooler/TLS and actual production cookies remain operator checks. |

Verification: backend production build, TypeScript and lint passed; 35/35 backend tests passed, including isolated production-auth and compiled health/shared-import checks. Web lint and production build passed (existing bundle-size warning).

Deployment instructions and limits: [VERCEL-BACKEND.md](VERCEL-BACKEND.md). No remote database writes or provisioning in this pass; no public deployment or browser visual verification claimed.

# Final FYP directory / OSM / admin / Android checkpoint - 2026-10-16

Latest evidence supersedes earlier map placeholders and unprovisioned-admin statements; all historical requested features remain below. [Final report](FINAL-FYP-INTEGRATION.md), [19 venue sources](LAHORE-REAL-VENUES.md), [FYP owner accounts](LAHORE-VENUE-ACCOUNTS.md).

| Feature | Role | Database dependencies / API | Priority | Actual status |
| --- | --- | --- | --- | --- |
| 19 real Lahore sports locations with reusable evidence | Player, admin, FYP manager | Existing venues + approved/applied migration 011 provenance/source field; existing public venue APIs | P0 | 19 imported, unique stable source IDs and coordinates verified against manifest. Original 12 fixtures preserved. Repeated imports keep 19 records/accounts. No prices/ratings/real availability invented. |
| Dedicated demo management for all 19 locations | Development Hub accounts only | Existing custom accounts/profiles/venue_managers; guarded importer | P0 | dev_venue_owner_01..19 linked one each, no admin grants, production login forbidden. Three real login/isolation checks returned own venues 200 and foreign schedules 403. |
| Permitted venue edit/court/schedule simulation | FYP Hub manager | Existing protected edit/court/hour APIs; private directory override metadata | P0 | Owners 01-03 actual private edit, explicitly simulated court creation, schedule save and calendar reads passed. Public facts unchanged, overrides hidden, public slots disabled. Three simulation courts; no fabricated business inventory. Media APIs retained; new-owner upload UI not exercised. |
| Interactive OpenStreetMap/Leaflet | Web player, owner picker | Same venue directory; existing GPS filter/coordinates; no Google SDK | P0 | Map/list, sport/area, markers/popups, selected venue, directions, distance sorting, game-marker support, coordinate picker for owner signup/edit. Source/lint/build checked; rendered tiles/clicks/responsiveness NOT visually verified. |
| Directory connected to Gemini | Player web/native | Existing authenticated AI intent service and shared venue source | P0 | Live badminton search returned Saddar/LDA/Safari; DHA padel returned Casa de Padel. Directory-only labels/View on Map; full games excluded; model phase narrowing guarded/tested. Court search still managed inventory only. |
| Real administrator provisioning/access | Approved non-fixture administrator | Existing trusted CLI/admin_memberships/audit_logs | P0 | User-approved maidaan_admin provisioned; API login/access/overview/users/owners/venues/bookings/games/reviews/reports/CMS/catalog/audit reads 200. No hardcoded/public registration privilege. Source/status/search/pagination retained. Browser admin actions unverified. |
| Native OSM and shared data | Expo player | react-native-webview, bundled Leaflet, controlled bridge, existing bearer API | P0 | Map/list/location/details/directions, native AI, weather, notification inbox and 15-second active-game polling. Source/TypeScript/lint/web and Android bundle checks; no physical phone test. |
| Android preview APK readiness | Player / trusted build operator | eas.json, app.config.ts, reachable HTTPS API, EAS account/project/signing | P0 | Package com.maidaan.fyp, branded icon/splash, location plugin, compatible WebView, no localhost cloud build (guard tested). Android Hermes export passed, NOT an APK. EAS login/project and real HTTPS deployment remain required; no cloud build submitted. |
| Shared booking/matchmaking/SSE regression | Player, owner | Existing booking exclusion/locks, participation procedures, notifications | P0 | New hosted two-player booking/game/request/approval with actual SSE and 2/2 lineup passed; owner sees booking. Canceled test game, retained reservation; no resets/deletes. Evidence in FINAL-MATCHMAKING-RESULTS.json. |

Final automated verification: backend lint/typecheck/build and 33/33 tests; web lint/build/domain/production-demo tests; mobile typecheck/lint/SDK compatibility and Android/web exports passed. No APK was produced.

UI and physical-device acceptance remain pending because the computer-use inventory has no enabled browsers/apps. No screenshots or APK success are claimed. Google Maps SDK/Places billing remain intentionally absent; Google is external directions only. Real ownership claiming/onboarding of imported businesses, real commercial inventory, advanced staff/reporting and remaining master-checklist features are deferred. Public directory research verification is distinct from business ownership verification.

# Gemini / Open-Meteo MVP - latest evidence (2026-10-15)

This section supersedes earlier AI/weather deferrals below; all other requested features remain on the master checklist. Details, files and exact commands: [AI-WEATHER.md](AI-WEATHER.md).

| Feature | Role | Database dependencies | API requirements | Priority | Implementation / evidence |
| --- | --- | --- | --- | --- | --- |
| Natural-language game, court, venue and player search | Authenticated player | Existing profiles/sports/areas, discover_games, discover_venues, court_slots, participants; no new tables | POST /v1/ai/chat, /api/ai/chat 307 alias; server-only Gemini key; strict schema and account rate limit | P1 | Implemented; real Gemini Flash-Lite extracted sport/area/Pakistan-local date/time; hosted game/count/slot/price and empty-result checks passed. No automatic bookings or mutations. |
| Floating animated assistant and expanded page | Web player only | None; session-only memory | Same authenticated chat API | P1 | Header icon, once-per-session greeting, Motion scale/fade, prompts, RingLoader, cards, minimize/close/expand; state retained across player pages. Source/build/lint checked; browser animation/responsive acceptance NOT performed. |
| Native AI tab and clickable results | Expo player | Same existing records | Same API, existing SecureStore bearer session | P1 | Six tabs, native Animated/avatar, ActivityIndicator, chat/results/weather, existing booking/game destinations and native public profile reader. TypeScript/lint and Expo web export passed; physical-device testing pending. |
| Court result preselection with explicit booking confirmation | Player web/native | Existing courts/schedules/bookings | Existing venue and slot APIs | P0 | Links carry venue/court/date/time; existing picker reloads genuine inventory and highlights suggestion. Route/preselection contracts and hosted destination/slot HTTP checked; rendered click/tap acceptance pending. |
| Current Lahore weather and location-specific game forecast | Player | Existing authorized game coordinates/start time and venue amenities | Authenticated GET /v1/weather; real Open-Meteo, bounded ten-minute cache | P1 | Live current and game forecasts 200, cached timestamp verified. Temperature/rain/conditions/wind; out-of-range forecasts remain unavailable, not fabricated. |
| Outdoor rain/heat warning | Web player | Existing venue amenities/game sport; no verified court indoor classification | Same game forecast API | P1 | Dismissible game/hour warning at >=38 C, rain probability >=50% or rainy conditions; simulated weather tests passed. Actual popup rendering pending. |
| Auth/provider/no-results regression | All applicable clients | Existing opaque sessions and account status | Existing CSRF/auth; assistant limit 12/min/account | P0 | Unauthenticated chat 401; missing/inaccessible game weather 404; native bearer through alias 200. Real invalid-model provider failure mapped to 503; missing-key and invalid-provider tests pass. |

Verification: backend full suite 28/28 plus focused assistant rerun; web lint/build/domain/demo-production; mobile TypeScript/lint/Expo web export passed. Vite has a non-failing 523.5 kB main-chunk warning. Browser/device interaction remains unverified.

No migrations, resets, reseeding or business-record edits were performed. Deferred: voice, agent actions, persistent chat history, advanced conversational follow-ups, Google Maps/Places, AI in owner/admin, GPS-based AI ranking and browser/device visual acceptance. Existing booking, SSE, photo and authorization behavior remains covered by regression tests. See dated live response evidence in docs/AI-WEATHER-LIVE-RESULTS.json.

# Latest booking and notification evidence (2026-10-15)

This section supersedes older Storage/migration blockers below. Master feature checklist remains intact.

| Feature | Status and evidence |
| --- | --- |
| Persistent recipient-scoped notifications and SSE | Implemented; migration 010 explicitly approved and applied atomically. Hosted separate A/B cookie sessions received request/rejection/approval/cancellation without reload; HTTP results in LIVE-NOTIFICATION-RESULTS.json. |
| Guided managed-court game creation | Source implemented: sport, genuine venue/court, real slots, explicit booking, confirmed-owned-booking recruitment; external booking remains separate/unverified. Hosted booking/public discovery/approval/lineup verified through API. Rendered form testing pending. |
| Profile image persistence | SUPABASE_SECRET_KEY supported server-side. Hosted PNG upload 201, signed-image bytes verified, profile refetch and logout/login persistence passed; invalid image 400. Shared profile automatically saved after upload. UI preview interaction unverified. |
| Owner schedule readability/actions | Actual booking/customer overlays, available/manual-reservation actions, cancellation/reschedule, configured hours and auto-scroll implemented. Existing schedule/booking authorization retained; rendered day/week acceptance pending. |
| Loading and feedback | Reusable RingLoader, toast feedback, notification bell, mutation/live invalidation implemented; build/lint verification below in latest report. |
| Browser/responsive/screenshots | Not performed this pass: no available browser automation surface. API/SSE tests do not substitute for visual acceptance. |

See BOOKING-NOTIFICATIONS-VERIFICATION.md for scope and remaining checks.

# Web UI, media and administrator checkpoints A-E - current evidence

See [WEB-REPAIR-CHECKPOINTS.md](WEB-REPAIR-CHECKPOINTS.md) for exact files, API changes, Storage findings, tests, provisioning commands and unverified UI acceptance. Hosted data was not reset/reseeded; no migration or hosted administrator grant was performed. This section supersedes older placeholder/undeployed statements below without removing deferred features.

| Feature | Role | Database dependencies | Implementation / verification status | Priority |
|---|---|---|---|---|
| A: persisted avatar upload and synchronized account/profile/game names/photos | Player/owner/admin | Existing profiles, accounts, sports, private avatars | Source/API implemented; local Storage-stub success, signed-image bytes, reload/logout/login and failure preservation tested. Hosted success blocked: SUPABASE_SERVICE_ROLE_KEY missing; real PNG 503, invalid bytes 400, old path unchanged | P0 |
| Private venue/court photo upload, replace, delete and display | Owner; player/admin readers | Existing venue_media, private venue-media bucket | Scoped API/UI controls; isolated HTTP/SQL success/replacement/deletion and other-owner rejection tested. Hosted upload and rendered-photo acceptance blocked by Storage key/browser | P0 |
| B: venue-first owner listing and dedicated Add Venue page | Owner | Existing venues/managers/courts/bookings | Cards precede add action; real counts and venue/court edit links; /hub/venues/new. Source/build checked; rendered visual acceptance pending | P0 |
| Separate Courts management and day/week schedule timeline | Owner; admin oversight | Existing court_hours/blocks/bookings; no new inventory table | Native browser grid source, venue/court/date selectors, actual slots/blocks/bookings and protected hours/block controls. Hosted calendar read 200, SQL permission/conflict tests; visual QA pending | P0 |
| C: compact four-column wide-screen venue games, truthful Full/Started status | Owner/admin/player | games/participants/bookings/profiles | Shared capacity/time status helper and compact responsive cards; deterministic tests. Admin private-game participant inspection is role-gated | P0 |
| Review cards: avatars/stars/date/category/eligibility; rating/search/sort/pages | Owner/admin; public player/venue views | Existing eligible reviews/attendance/bookings | Source/API implemented; actual eligibility indicator computed from records; development reviews labeled sample. Hosted filtered read 200; SQL tests. Owner response schema/workflow remains unimplemented | P1 |
| Real venue analytics with period/venue/court/status filters and six charts | Owner | Existing bookings, paid_pkr, hours/blocks, reviews | Hosted aggregates 200; local SQL tests. Daily/weekly trends; payment series grouped by booking date, not missing receipt-event dates. Occupancy uses current approved hours minus closure unions; historical schedules unavailable | P1 |
| D: sticky split-screen signup, step-only transition, preserved values and optional-upload skip | Player/owner | Existing custom registration/profile/application tables | Source/build/API checks; no repeated registration during mounted retry. Real browser/new-hosted-signup acceptance pending; durable interrupted setup recovery not implemented | P0 |
| Shared account editor for settings, immediate profile-dependent refresh | All | Existing profile/account APIs | Shared store and editor reused; saved response retained while related games refresh. Player Settings aliases profile; account security/notification preferences remain deferred | P0 |
| E: backend-only development administrator CLI | Trusted operator | admin_memberships/audit_logs/accounts/profiles | admin:provision dry-run by default; --grant explicit; production/fixture/inactive/passwordless/profile-less rejection. Local positive/negative/idempotency tested. No hosted grant/account invented | P0 |
| Admin owners, counts, searchable/paged operational lists, decisions and audited actions | Admin | Existing operational schema and role checks | Source/API implemented; booking cancellation has court/row locks and unpaid/future guard; local auth/action/audit tests. Real admin browser access remains blocked pending approved account/browser | P0 |
| Editable paged CMS, report filters and catalogue search | Admin/player | Existing announcements/events/reports/catalogue | Existing editors retained, list controls added; source/API tests. Small catalogue uses client search, no server paging. Hosted publication/moderation decisions not executed in this pass | P1 |
| Current design audit and responsive screenshot acceptance | All | None | All 58 audit PNGs match original kit exports; contact sheet and representative full-resolution references inspected. No current bug screenshots in that folder. Browser inventory empty; 390/768/1024/1440/1920 rendered acceptance and fixed-page screenshots NOT completed | P0 |

Still deferred: successful provider/UI acceptance; receipt-date financial reporting and historical schedule revisions; owner review responses; block removal/drag rescheduling; granular staff/customer CRM/report exports; durable partial-onboarding recovery; chat/notifications; native-social/device/APK acceptance; Maps/Places/weather/AI integrations. Retain every historical feature below.

# Live session and workspace navigation repair - 2026-10-15

User reports hosted migrations 001-009 and Lahore fixtures are now applied/verified. Current repair exercised the real running Express API over HTTP; it did not apply migrations, reseed or edit business records. This section supersedes historical undeployed wording below. See [session/navigation evidence](SESSION-NAVIGATION-REPAIR.md).

| Feature | Role | Database dependencies | API/UI status and evidence | Priority |
|---|---|---|---|---|
| Consistent 127.0.0.1 web/API cookie host, login session confirmation, 401 invalidation | All | Existing private accounts/sessions | Local configuration repaired; real login/session/profile HTTP 200; cookie retention failure regression test; no fake auth fallback | P0 |
| All requested sidebar destinations, active links, collapse/scroll/mobile drawer | All | Existing permission checks | Source implemented; route-contract/build checks; rendered browser/responsive checks pending (no browser available) | P0 |
| Player profile, venues/courts, games, bookings, directory, connections | Player | Existing seeded schema | Real authenticated HTTP 200. Directory partial errors/loading/empty states repaired; own Connections/Reviews routes | P0 |
| Owner venue/court schedules and reservations; scoped games/reviews | Owner | venue_managers, games, reviews, bookings | Live owner 01: one venue/two courts, schedules/16 bookings/8 games/2 reviews; owner 02 restricted booking access returns 403 | P0 |
| Admin review/audit list routes | Admin | admin_memberships, reviews, audit_logs | Backend role-gated source; owner denied 403. No real admin fixture or bypass; admin success/browser acceptance pending trusted provisioning | P0 |
| Messages, promotions, account settings | Respective portals | Future messaging/settings/promotion workflows | Dedicated Coming Soon pages, no mock live feature | P1/P2 |
| Full court calendar, dedicated customer CRM, period analytics | Owner | Existing schedules/reservations plus future workflows | Weekly editor and actual reservation/statistic views preserved; advanced workflows incomplete | P1 |
| Browser interactions, refresh, responsive widths and screenshots | All | Running web/backend | Not performed: Chrome/IAB unavailable. Exact manual steps in repair report; no visual-pass claim | P0 |

# Development data and migration readiness ? 2026-10-15

Master feature checklist remains this file. Remote schema/seed writes are **not approved and were not executed**. See [migration review](MIGRATION-REVIEW.md) and [fixture instructions](DEMO-DATA.md).

| Feature | Role | Database dependencies | API requirements / status | Priority |
|---|---|---|---|---|
| Reviewed atomic 001?009 deployment, read-only preflight/checksum ledger | Operator | managed Auth/Storage compatibility objects, btree_gist, private migration ledger | Local PostgreSQL chain tested; provider privileges and explicit deployment approval pending | P0 |
| Deterministic Lahore dataset: 12 venues, 24 courts, 40 players, 12 owners | Developer | private fixture registry, accounts/profiles, location/catalogue, venues/managers | Development-only seed/verify/cleanup scripts; production fixture login/session rejection; no seeded admin | P0 |
| Real scheduled fixture availability, reservations and matchmaking history | Player/owner UI testing | court_hours/blocks, bookings, games/participants/requests | 132 bookings, 56 games, 36 eligible reviews generated locally; no hosted data claim | P0 |
| Fixture safety / idempotency / isolation regression checks | Developer | all nine migrations and real SQL procedures | Automated local PGlite checks; remote multi-connection contention and Storage HTTP remain unverified | P0 |

# Current implementation status ? custom accounts and managed booking

This is the authoritative phase status as of 2026-10-15 and supersedes the historical milestone statuses retained below. None of the new migrations have been deployed remotely. **Source/API implemented** means code connected to the Express/PostgreSQL path, not a hosted integration. Tests use isolated PostgreSQL and Chrome; actual Storage/provider/device checks remain separate.

| Phase / feature | Role | Database dependencies | API / UI requirements and current status | Priority |
|---|---|---|---|---|
| 1: responsive frame, sidebar, header, cards, fields, badges, action rows | All | None | Shared CSS/native spacing repaired. Chrome screenshots and overflow assertions at 390, 768, 1024, 1440; native source checked, device QA pending | P0 |
| Role welcome, separate login, back, password visibility, loading/errors/logout | All | Sessions or isolated demo key | /player/login, /hub/login, /admin/login; browser role/refresh/logout tests | P0 |
| 2: application registration, username/email uniqueness, bcrypt password verification | Player/owner | app_private.accounts, profiles | /auth/register, /auth/login; no new Supabase Auth users; API/SQL tests | P0 |
| Cookie/native session restore, renewal, expiry, revocation, account suspension, CSRF/rate limits | All | app_private.sessions/accounts | HttpOnly cookie; native SecureStore; /auth/session, /auth/renew, /auth/logout; API tests; hardware/keychain pending | P0 |
| Four-step account/profile/sports/review onboarding | Player | profiles, player_sports, player_availability, accounts | Web /player/signup; native /signup. Optional Pakistani phone, DOB, areas, days/times, sport skills/formats/football positions saved | P0 |
| Persistent profile edit, photos, completeness | Player | profiles, sports, private avatars bucket | Express /me/profile, /me/avatar; configured Storage required; signed URLs. Storage HTTP/device round-trip not verified | P0 |
| Real email verification/recovery | All | accounts, future verification/recovery tokens | Accounts remain unverified. No verified badges; public recovery/email verification incomplete | P1 |
| 3: business/venue guided registration | Owner | venues, venue_managers, venue_applications, profiles | /hub/signup; actual application starts pending. One Player identity can apply/manage multiple venues | P0 |
| Venue/court photos and ownership documents | Owner/admin | venue_media, private venue-media bucket | Scoped server uploads, admin/owner private document reads; configured Storage acceptance pending | P0 |
| Venue address/location, amenities, contacts, rules, cancellation policy | Owner | venues | Scoped create/edit APIs and dashboard forms; editing returns venue to pending review | P0 |
| Approve/reject/suspend facility | Admin | venues, applications, audit_logs | Admin review route/UI; only approved verified published facilities offer inventory; API tested | P0 |
| 4: court management, formats, sport, active state | Owner | courts, venue_managers | Manager-only create/edit; reject disabling/changing sport with upcoming reservations | P0 |
| Weekday/weekend windows, slot durations, PKR peak/off-peak pricing | Owner | court_hours | Owner schedule editor; PostgreSQL no-overlap constraint; informational pricing is never invented | P0 |
| Maintenance/closures/holidays | Owner | court_blocks, bookings | Closure API/form with reservation conflict checks; unblocking/history UX remains incomplete | P0 |
| Managed venue/court/date/slot discovery and booking | Player | approved venues/courts/hours/blocks/bookings | Native/web real slot picker; /courts/:id/availability, /bookings; pay-at-venue/manual confirmation only | P0 |
| Atomic online/offline double-booking prevention | Player/owner | bookings exclusion, court locks | Competing HTTP attempts tested locally: one success, one conflict. Hosted multi-connection contention still pending | P0 |
| Pending/confirmed/completed/cancelled/expired model | Player/owner | bookings | Core transitions/actions implemented. Expired status exists; no temporary holds or expiry worker implemented/claimed | P0 |
| Booking history and owner actions | Player/owner | bookings, manager memberships | My Bookings; scoped owner lists, confirm/cancel/complete/payment recording; native Player source connected | P0 |
| Controlled reschedule preserving customer | Owner | same court lock/bookings/games | New time checked atomically; attached recruitment cancelled explicitly; paid bookings require resolution | P0 |
| Booking calendar and extensive cancellation policy automation | Owner | schedules/bookings | Reservation list is operational; full calendar/day-week UI and policy/refund automation incomplete | P1 |
| 5: confirmed reservation to public/private game | Player host | games.booking_id, bookings | Native/web recruitment forms; derive venue/sport/time; database trigger prevents reservation edits | P0 |
| External unverified games, formats, skill, capacity, lineup, host controls | Player | games/participants/requests | Preserved native/web forms and APIs; external games clearly unverified | P0 |
| Instant join / host approval / leave / cancel / complete | Player/host | locked game procedures | Server/SQL enforces duplicate/capacity/host rules. UI for legacy core actions retained; newer complete action API available | P0 |
| Automatic ordered waitlist | Player | game_waitlist, participants, accounts | Waitlist actions/native/web detail controls. Instant games promote eligible waiter; approval games promote request. SQL tests | P1 |
| Private invitations / connections / blocking | Player | invitations, connections, blocks | Secure APIs and web directory/public profile/invitation UI; native social UI incomplete | P1 |
| Recurring games | Player host | game_series, games.series_id | Transactional weekly external series API + web create toggle. Every occurrence stays externally booked/unverified. Booking-backed recurrence/native controls incomplete | P1 |
| Replacement player requests | Player/host | games.needs_replacement | Permission-checked API releases participant position or advertises existing vacancy. Dedicated UI/notifications incomplete | P1 |
| Estimated court cost splitting | Player | booked price, game capacity | Estimated per-player amount uses actual court price. Collection, settlement and reimbursements not implemented | P1 |
| 6: player discovery/public profiles/statistics | Player | profiles/sports/participants/attendance | Filtered web directory and public profile APIs/UI; native directory pending; no private email/phone/DOB exposed publicly | P1 |
| Verified game attendance | Venue manager | completed managed booking/game, participants, attendance | Manager-only verification API and owner action; host completion alone never verifies attendance | P1 |
| Eligible player and venue reviews | Eligible participant | reviews/attendance/completed booking | SQL eligibility, duplicate/self/unauthorized guards; web read/submission forms. Independent rating dimensions stored; broader native UX incomplete | P1 |
| Reports/blocking/moderation | Player/admin | reports, blocks, reviews, audit_logs | Secure APIs, web report/block controls and admin queue; appeal workflow incomplete | P1 |
| Player availability calendar | Player | player_availability | Weekly preferences persisted on signup and API edit available; graphical calendar/editor UX incomplete | P1 |
| Nearby-game notifications/chat | Player | Future delivery/subscriptions/messages | Not implemented; no notification delivery or chat claim | P2 |
| 7: operational owner venue/court/booking dashboard | Owner | managed venue data | Real APIs replace previews for real accounts; demo accounts retain labeled disabled examples | P0 |
| Owner revenue/customer/occupancy reports | Owner | actual bookings/paid amounts | Real scoped counts/reservation customers and recorded payments; full occupancy, exports and report period controls incomplete | P1 |
| Owner staff roles/permissions/settings and review responses | Owner/staff | Future scoped staff grants/responses | Not complete; current membership provides whole-venue management, not granular staff capabilities | P1 |
| 8: admin users/search/status, venue approvals, games/bookings, moderation | Admin | accounts, venue/game/booking/report tables, audit_logs | Operational server-gated lists/actions; no public administrator self-assignment | P0 |
| Admin sports/cities/areas | Admin | sports/cities/areas/audit_logs | Catalog API/editor supports active records and new rollout locations; four sports retained | P1 |
| Targeted announcements/banner/popup/bottom sheet | Admin/player | announcements/events | Admin content editor + web/native retrieval/rendering; image, CTA, platform/audience/city/page/dates/priority/frequency/dismissibility; safe internal /player CTAs | P1 |
| CMS impressions/clicks and preview/enable/disable | Admin/player | announcement_events | Event API and editor preview/state implemented; analytics/reporting and distributed event deduplication incomplete | P1 |
| FAQ/promotional cards/homepage/onboarding content types | Admin | announcements + future typed content | Generic announcement content only; dedicated types/editors incomplete | P1 |
| Feature flags | Admin | feature_flags/audit_logs | Secure record API and existing-record toggles; feature-specific enforcement/editor creation incomplete. Flags never confer permissions | P1 |
| Admin detailed aggregates/role management/disputes/claims | Admin | accounts/bookings/games/audit + future claim/dispute workflow | Basic real counts, account/venue suspension and audited actions; full role/claim/dispute/reporting workflow incomplete. Initial admins require trusted provisioning | P1 |
| 9: Lahore city/area selection, GPS, distance-filtered discovery | Player | cities/areas/coordinates | Existing real filters retained. UI rollout locations are database-driven; exact available-slot filters/map sorting UX incomplete | P0 |
| Google Maps/Places and location-specific weather | Player/admin | Provider credentials/managed availability | Not implemented live. No scraping, fabricated forecasts, prices or Places availability. Managed venue data is the sole booking inventory | P2 |
| 10: isolated local demo access | Developer | Separate client key/in-memory fixtures | player/player, hub/hub, admin/admin; development+flag only; production exclusion and backend rejection tested | P0 |
| Hosted rollout, actual Storage, physical devices, APK | Developer | Reviewed migrations/configuration/providers | Not deployed. No remote data changed. No APK built. See current setup/verification handoff | P0/P2 |

Every historical requested feature remains in the checklist below. Supabase Auth/JWT identity descriptions there are historical and superseded by Express-managed accounts and the 004 transition. Do not mark the entire platform complete from passing local tests.

---

# Maidaan master feature checklist

Future Codex sessions MUST read this file before planning or implementation and update statuses with evidence. Do not remove a feature because it is deferred. The purchased screenshot design remains the UI source.

## Product rules and rollout

Pakistan is the default country; Lahore is the initial active city. Venue-first journey: **city/area â†’ venues â†’ venue details â†’ individual court â†’ date/time â†’ available slot â†’ booking â†’ optionally recruit players with an open game**. Find Venues and Find Open Games are distinct flows. Milestone 1 stops at published court hours; time-slot selection and booking stay disabled.

Every regular user has one Player identity. Hosting is a relationship to a game, never a permanent Captain role. Verified venue-management assignments and private admin memberships add permissions to that same identity. A Google Places listing is discovery-only until independently onboarded and verified; never invent availability, pricing, reviews, partnerships or successful payments.

Priorities: **P0/M1** identity, real data and permissions; **P1/M2** booking and venue operations; **P1/M3** discovery integrations; **P2/M4** social/retention; **P2/M5** administration/CMS; **P2/M6** distribution.

Status vocabulary: **Source implemented / setup required** means API/UI/migrations are written and locally checked, but hosted Supabase Auth/PostgREST/Storage integration is NOT certified without credentials. **Schema only** has no workflow/API. **Deferred** is specification only. **Disabled preview** is the existing visual shell with actions disabled; it is never operational data.

## Explicit local UI preview exception

The development preview is opt-in, never an automatic fallback. See [DEMO-UI-TESTING.md](DEMO-UI-TESTING.md) for exact credentials, flags, persistence, regression evidence and the required visual matrix. Migrations are NOT applied by this preview work.

| Feature | Role | Database dependencies | API / client requirements | Priority | Status |
|---|---|---|---|---|---|
| Three Figma-styled welcome entry cards and distinct login pages, exact updated headline/subtitle | Player/owner/admin | None | /player/login, /hub/login, /admin/login; native equivalents | UI preview | Implemented source; rendered visual check unavailable |
| Development-only demo login, password visibility/errors/loading, restore/logout and strict role gates | Local previews only | None; separate local session storage | Explicit platform flag AND development mode; no JWT or live API access | UI preview | Policy/data regressions and compiled production-disable test pass |
| Player One sample profile, avatar, Lahore/DHA, Intermediate Badminton/Padel, sample history | Player preview | In-memory fixtures only | Separate mock adapter; local create/join/profile flows | UI preview | Implemented; labeled samples |
| Mobile owner/admin handoff to web login | Owner/admin preview | None | EXPO_PUBLIC_WEB_URL; no password/session transfer | UI preview | Implemented; physical-device handoff test pending |
| Responsive screenshot/interaction checks at 1440/768/390 | All preview portals | None | Browser/device connection or manual checklist | UI preview | Manual checks required; no browser/device available |

## Identity, profiles and location

| Feature | Role | Database dependencies | API / client requirements | Priority | Status |
|---|---|---|---|---|---|
| Shared email/password sign up and sign in; email confirmation; session restore/refresh; sign out | Player, owner, admin | Supabase auth.users | Supabase Auth SDK; verified JWT on protected Express routes | P0/M1 | Source implemented / setup required |
| Separate Player, /hub/login and /admin/login experiences | All | profiles, venue_managers, admin_memberships | /me/access, /hub/access, /admin/access; fail closed | P0/M1 | Source implemented / setup required |
| One Player account; host only per game; owners also have Player profiles | All | profiles, games.host_id, venue_managers | JWT identity only; no signup role input | P0/M1 | Source implemented; SQL/API permission tests |
| Private, non-self-assignable admin access | Admin | admin_memberships | Server membership check; private SQL assignment | P0/M1 | Source implemented; SQL/API denial tests |
| Full name, unique username and bio | Player | profiles | GET/PUT /me/profile | P0/M1 | Source implemented / setup required |
| Profile photos and authenticated photo visibility | Player | profiles.avatar_path, private avatars Storage bucket | Scoped uploads; signed read URLs; 5 MB MIME limits | P0/M1 | Source implemented / managed Storage E2E pending |
| City/area and sport preferences | Player | profiles, player_sports, cities, areas | /locations, /me/profile; shared native/web store | P0/M1 | Source implemented / setup required |
| Separate skill per sport, preferred formats, football positions | Player | player_sports | Validated profile update; native/web controls | P0/M1 | Source implemented / setup required |
| Completeness indicator | Player | profiles, player_sports | Shared completeness calculation | P0/M1 | Source implemented |
| Preferred playing times and player availability calendars | Player | player_availability | Private CRUD, calendar and timezone handling | P2/M4 | Schema only; calendar UI/API deferred |
| Pakistan/Lahore default, city changes and Lahore neighborhoods | Player | cities, areas | /locations; database-backed selectors | P0/M1 | Source implemented; Lahore seed only |
| DHA phases 1â€“9, Gulberg, Johar Town, Model Town, Bahria Town, Wapda Town, Garden Town, Valencia, Cantt, Lake City, other Lahore areas | Player | areas | Filter city/area by IDs | P0/M1 | Seed migration implemented; not venue data |
| GPS consent and radius filtering inside selected city/area | Player | venue/game coordinates | Browser geolocation / expo-location; SQL distance filter | P0/M1 | Source implemented; hardware permission test pending |
| Future Pakistan city rollouts and managed Lahore areas | Admin | cities, areas | Admin CRUD, rollout activation and audit | P2/M5 | Read models implemented; management deferred |

## Venue-first discovery and booking

| Feature | Role | Database dependencies | API / client requirements | Priority | Status |
|---|---|---|---|---|---|
| Find Venues distinct from Find Open Games | Player | venues, games | Separate native screens and web routes | P0/M1 | Source implemented |
| City/area/GPS venue discovery with pagination | Player/guest | venues, cities, areas, courts | GET /venues, discover_venues SQL RPC | P0/M1 | Source implemented; zero fabricated venues seeded |
| Venue details, facilities, sports, precise coordinates, permitted photos, contact and directions | Player/guest | venues, courts | GET /venues/:id; validated photo URLs; external directions link | P0/M1 | Source implemented / real records required |
| Individual courts and operating-hour models | Player/guest | courts, court_hours, court_blocks | Venue detail API and /courts/:id/availability | P0/M1 | Source implemented; blocks remain private |
| Distinguish published hours from real slot availability | Player | court_hours, venue verification | API always bookingEnabled:false in M1 | P0/M1 | Source implemented; booking disabled |
| Choose date/time, see available slots and book | Player | courts, court_hours, court_blocks, bookings, booking_holds | Future slot API and transactional reservation RPC | P1/M2 | Deferred; controls disabled |
| Onboarded venue with actual schedule required for booking | Player, owner, admin | venues.source/verified, courts, court_hours | Eligibility check under court lock | P1/M2 | Source/verification schema and discovery labels implemented; booking deferred |
| Pending, confirmed, completed and cancelled bookings | Player, owner | bookings | Booking lifecycle API with authorization | P1/M2 | Schema only |
| Database overlap prevention | Player, owner | bookings exclusion constraint | Half-open ranges; coordinate holds/blocks under one court lock | P1/M2 | Booking exclusion schema locally tested; full transaction workflow deferred |
| Expiring holds, holidays and maintenance safety | Player, owner | booking_holds, court_blocks, court_hours | Court-locked transaction, expiry worker, timezone rules | P1/M2 | Schema only; no hold writes/API |
| Pay-at-venue and manual confirmation; no claimed collected payment | Player, owner | bookings.payment_method | Confirmation UI/API; no gateway in initial scope | P1/M2 | Schema only; no payment processing |
| Confirmed booking â†’ optional public game | Player/host | bookings, games (future booking_id) | Ownership/status check inside create-game transaction | P1/M2 | Deferred; M1 accepts external unverified games only |
| Court cost splitting | Participants/host | Future cost_shares, bookings | Clear owed/paid ledger and settlement rules | P2/M4 | Deferred; no charge collection |
| Google Places public listings, discovery-only until claimed | Player | Place IDs, permitted transient content; venues provenance | Restricted Places API, attribution, allowed retention | P1/M3 | Deferred; no scraping or fake listings |
| Google Maps, photos and directions integrations | Player | coordinates, Place IDs | Restricted platform-specific keys; permitted photos/attribution | P1/M3 | External directions links only; embedded Maps/Places deferred |
| Weather at venue/game time | Player | coordinates, time, cache | Weather provider adapter and attribution | P1/M3 | Deferred |
| Independently onboarded venue record management | Admin | venues, courts, audit_logs | Protected admin CRUD | P1/M2 | Read models only; privileged setup SQL, UI writes deferred |

## Open games and participation

| Feature | Role | Database dependencies | API / client requirements | Priority | Status |
|---|---|---|---|---|---|
| Find games needing players, search/filter by sport and join mode | Player | games, participants, locations | GET /games with location/radius and pagination; sport/search UI | P0/M1 | Source implemented / setup required |
| Padel, Badminton, Football and Cricket | Player | sports, games, player_sports | Shared contracts; sport FK/constraints | P0/M1 | Source implemented |
| 1v1/2v2; football 5v5/7v7/11v11; Cricket custom team capacity | Host | games.format/max_players | Matching format/capacity validation in UI, API, SQL | P0/M1 | Source implemented; validation tests |
| Create game at an externally arranged venue | Player/host | games | POST /games; mandatory unverified external-booking label | P0/M1 | Source implemented / setup required |
| Game title, description, venue/location/coordinates, start, duration, skill and status | Host | games | Validated shared GameInput | P0/M1 | Source implemented / setup required |
| Host joins automatically when creating a game | Host | games, game_participants | Atomic create_game RPC | P0/M1 | Implemented; SQL tested |
| Instant Join | Player | game_participants | game_action RPC; parent row lock | P0/M1 | Implemented; SQL tested |
| Request Approval; creator-only acceptance/rejection | Player/host | join_requests, games.host_id | /games/:id/actions; RLS request visibility | P0/M1 | Implemented; SQL/API permission tests |
| Atomic capacity and duplicate prevention, even via direct REST | Player | participant/request PKs; locked RPC; revoked direct writes | JWT/RLS and transactional SQL checks | P0/M1 | Implemented; SQL tested; multi-connection load test pending |
| Capacity, confirmed players and remaining positions | Player | games, game_participants, profiles | Consistent API roster; spots derived from capacity | P0/M1 | Source implemented |
| My Games: joined, created, requested; persisted history | Player | games, participants, requests | GET /me/games with independent pagination | P0/M1 | Source implemented / setup required |
| Edit/cancel own game; leave; withdraw request | Host/player | games, participants, requests, audit_logs | Same row lock and identity checks; confirmations | P0/M1 | Source implemented; SQL tests |
| Completed game history | Player | games.status, participants | Future verified completion/attendance workflow | P2/M4 | Read model only; verified completion deferred |
| Recurring games | Host | Future game_series and generated game occurrences | Recurrence/timezone rules; per-occurrence membership/cancellation | P2/M4 | Deferred |
| Replacement-player requests | Host/participant | Future replacement_requests, participants | Authorized replacement request/fulfillment API | P2/M4 | Deferred |
| Automatic waitlists and promotion | Player/host | Future game_waitlist, participants | Atomic ordered promotion, expiry/notification rules | P2/M4 | Deferred; no fake waitlist action |
| Verified attendance | Participants/host/admin | Future game_attendance, verified bookings | Anti-fraud confirmation and dispute flow | P2/M4 | Deferred |
| Nearby-game notifications | Player | Future notifications, opt-ins, location prefs | Push tokens, matching worker and notification permissions | P2/M4 | Deferred |

## Social, reviews and moderation

| Feature | Role | Database dependencies | API / client requirements | Priority | Status |
|---|---|---|---|---|---|
| Browse players by city, sport and skill; appropriate photo/profile visibility | Player | profiles, player_sports, future blocks | Paginated player discovery, block/privacy enforcement | P2/M4 | Profile model only; browse API/UI deferred |
| Connections/friends: send, accept and reject requests | Player | Future player_connections | Pair uniqueness, self/block checks, state transitions | P2/M4 | Deferred |
| Game invitations and invite friends | Player/host | Future invitations, connections, games | Expiring authorized invites; capacity on acceptance | P2/M4 | Deferred |
| Block players and report accounts/games/venues/reviews | Player | Future player_blocks, reports | Block graph enforcement and report rate limits | P2/M4 | Deferred |
| Direct messages and game chat | Player | Future conversations/messages/memberships | Membership checks, realtime/push, moderation | P2/M4 | Deferred later-stage work |
| Player reviews only after shared verified completed games | Eligible players | Future reviews, game_attendance; games/participants | Eligibility transaction; unique author/target/game; no self reviews | P2/M4 | Deferred |
| Sportsmanship, reliability and teamwork ratings | Eligible players | Future reviews/rating dimensions | Validated 1â€“5 values, eligible aggregation | P2/M4 | Deferred |
| Venue-quality reviews after completed booking/eligible attendance | Eligible players | Future reviews; bookings, attendance | Verified eligibility and duplicate prevention | P2/M4 | Deferred |
| Comprehensive review visibility, appeals and moderation | Player/admin | Future reviews, reports, audit_logs | Moderation queue; audit and aggregation rules | P2/M5 | Deferred |

## Venue owner operations

| Feature | Role | Database dependencies | API / client requirements | Priority | Status |
|---|---|---|---|---|---|
| Apply to manage/claim a facility | Player/owner | Future venue_claims; venues, profiles | Application/proof upload; status API | P1/M2 | Deferred; no self-assignment |
| Admin verifies claims and approves/rejects access | Admin | Future venue_claims; venue_managers, audit_logs | Server-only transactional grant/rejection | P1/M2 | Membership foundation only; workflow deferred |
| Manage multiple venues under one identity | Owner | venue_managers, venues | Scoped venue queries/mutations | P1/M2 | Schema only; gated disabled dashboard preview |
| Add/edit venue descriptions, photos, facilities, sports, contact and location | Owner | venues, courts, venue_managers, future venue-media bucket | Manager-authorized CRUD and uploads | P1/M2 | Schema only; writes deferred |
| Manage multiple individual courts | Owner | courts, venue_managers | Court CRUD with historical-reference safety | P1/M2 | Schema/read API only |
| Opening hours, schedules, slot duration, PKR prices | Owner | court_hours | Validated timezone-aware schedule CRUD | P1/M2 | Schema/read API only |
| Maintenance, holidays, closures and offline reservations | Owner | court_blocks, bookings | Same conflict-safe reservation path as online bookings | P1/M2 | Schema only |
| Bookings, customers, cancellations and confirmations | Owner | bookings, profiles | Scoped management with privacy-safe customer data | P1/M2 | Deferred |
| Venue games, verified reviews, occupancy and reports | Owner | games, bookings, future reviews | Aggregated reporting API with scoped permissions | P1/M2, P2/M4 | Deferred |

## Administration and dynamic content

| Feature | Role | Database dependencies | API / client requirements | Priority | Status |
|---|---|---|---|---|---|
| Dashboard counts: users, venues, games, bookings, pending claims | Admin | core tables + future venue_claims | Admin-only aggregated read API | P2/M5 | Disabled design preview, no live reports |
| Manage players, venues, sports, cities, areas and games | Admin | core tables, audit_logs | Permission-checked CRUD, disabling instead of destructive removal | P2/M5 | Authorization foundation only |
| Moderate reports, accounts and reviews | Admin | Future reports, reviews, moderation records | Admin moderation API and appeals/audit | P2/M5 | Deferred |
| Banners, promotional cards and homepage content without app releases | Admin/player | Future announcements | Admin CRUD + active-content retrieval | P2/M5 | Deferred |
| Popup/banner/bottom-sheet title, body, image, CTA label/link | Admin/player | Future announcements | CMS editing + native/web rendering | P2/M5 | Deferred |
| Platform, audience, city and page targeting | Admin/player | Future announcements targeting | Server eligibility filtering | P2/M5 | Deferred |
| Active state, start/end, priority, frequency and dismissibility | Admin/player | Future announcements, dismissal/impression state | Frequency caps and schedule evaluation | P2/M5 | Deferred |
| Preview, edit, enable/disable content | Admin | Future announcements, audit_logs | Protected CMS endpoints and preview mode | P2/M5 | Deferred |
| Safe internal or allowlisted external CTAs | Admin/player | Future announcement links/allowlist | URL validation server + native/web navigation guards | P2/M5 | Deferred; no CMS links accepted today |
| Content impressions/clicks where practical | Player/admin | Future announcement_events | Deduplicated, rate-limited analytics events | P2/M5 | Deferred |
| Admin-controlled feature flags | Admin/all | Future feature_flags | Server-evaluated flags; flags never replace authorization | P2/M5 | Deferred; bookings/social remain hard disabled |

## Engineering and delivery

| Feature | Role | Database dependencies | API / client requirements | Priority | Status |
|---|---|---|---|---|---|
| Native Expo Router and responsive React Router player UI; original design tokens | Player | None | Existing components preserved; shared API/state | P0/M1 | Source implemented |
| One Express TypeScript API with Zod, consistent errors, pagination and rate limits | All | core/RLS | /v1 routes; request IDs; bounded payloads | P0/M1 | Implemented; local HTTP tests |
| No client secrets/service-role exposure; JWT-derived identity | All | Supabase Auth/RLS | Publishable keys only; verified auth.getUser | P0/M1 | Source implemented; managed Auth E2E pending |
| Essential SQL/API/domain checks; no destructive remote migration execution | Developers | Test-only embedded PostgreSQL | Build, lint, typechecks, SQL and HTTP tests | P0/M1 | See docs/VERIFICATION.md for actual results |
| Shared contracts and future provider service boundaries | Developers | None | shared/contracts.ts, api.ts; future Maps/Places/weather adapters | P0/M1, P1/M3 | Core implemented; provider integrations deferred |
| Android preview/production APK and device distribution | Developers/player | Auth/API deployment | EAS profiles, signing and physical-device QA | P2/M6 | Deferred; bundle checks are not APK builds |

## Next implementation order

1. Review/deploy migrations 001-009, configure private PostgreSQL/Storage and verify hosted accounts/media. No remote deployment has been performed.
2. Finish owner calendar, staff permissions, customer/occupancy/report periods, closure management and review responses.
3. Finish native social/review/calendar coverage, replacement notifications, booking-backed recurrence and cost settlement.
4. Integrate Maps/Places and actual weather without inferring booking inventory from listings.
5. Finish CMS content types, feature-specific flag enforcement, appeals, notifications/chat and advanced admin reporting.
6. Complete recovery/verification, hosted contention, physical-device/Storage acceptance and APK/signing/distribution.
