# Web repair checkpoints A–E

Current source handoff, 2026-10-15. Existing Expo/Vite/Express configurations, purple tokens and database records were preserved. No dependency installation, migration, reseed, truncate or hosted administrator grant was performed. This report supersedes older implementation notes where they describe these views as placeholders.

## Reference inspection and screenshots

All **58** PNGs under design/ui-audit (including Report/Block Flow.png) are byte-for-byte copies of corresponding design/screenshots exports. They are original kit screens, not screenshots of current web defects. All were inspected through the generated design/ui-audit-index.jpg contact sheet; representative profile/form/login exports were examined at full resolution. No .fig binary was parsed.

Browser/app inventory returned empty before and after the interruption. Chrome/IAB were unavailable in the connected UI tooling. **No fixed-page screenshots or rendered-browser visual pass are available for this change.** The contact sheet is reference evidence only, not a screenshot of the repaired application.

## Checkpoints and evidence

| Checkpoint | Source implemented | Verified | Still blocked / limited |
|---|---|---|---|
| A: profiles/media | Avatar upload persists its database path before returning. Header/sidebar, directory, reviews and game participants can display signed avatars. Profile save keeps the authoritative response and refreshes related game lists without overwriting saved fields with stale reads. Invalid image/size checks and error feedback retained. Signup refreshes shared profile state after optional uploads. | Local SQL/HTTP Storage-stub test: avatar upload, signed image bytes, profile refetch, logout/login persistence, failed provider preservation. Live PNG attempt: 503; invalid content: 400; existing reference unchanged. | Actual provider success requires missing SUPABASE_SERVICE_ROLE_KEY. No successful real UI upload was performed. |
| B: venues/courts/calendar | Existing venue cards first, real upcoming counts, Add Venue on dedicated /hub/venues/new page, venue management/media controls, separate court cards/edit/disable actions, day/week court timelines with date/venue/court filters and hours/block/offline controls. | Actual hosted schedule/calendar read 200; local authorization and conflict procedures tested. Venue photo upload/replace/delete and cross-owner denial tested using isolated Storage stub. | Provider media success and rendered timeline alignment remain unverified. Block removal and drag-to-reschedule are not implemented; do not infer those controls. |
| C: games/reviews/analytics | Four compact game columns at wide widths, responsive reductions; Full/Started/terminal labels; host/court/count details; review avatars/stars/date/category/eligibility indicator with search/min-rating/sorting/pages; analytics metrics and six charts, daily/weekly trend grouping, date/venue/court/status filters. | Capacity-label tests; local analytics SQL with real fixture records; hosted analytics/review/game/filter reads 200. | Payment series uses booking date, not payment receipt date. Occupancy uses current approved schedules minus closure unions; historical schedule revisions are unavailable. Owner review responses are not supported by the schema. |
| D: onboarding | Sticky split-screen sports panel, step-only slide/fade, reduced-motion support, preserved form state, four-step player/owner flows, Pakistani phone validation and playing-time checks. Optional upload failure can be skipped after account/application creation without repeating account registration. Player success goes to /player/venues; owner to pending application workspace. | Build/typecheck and existing registration/session/API tests. | Actual browser transitions, new hosted signup/redirect and refresh-resumption during incomplete optional setup have not been tested. Created-account retry state is kept during the mounted flow, not a durable onboarding workflow. |
| E: admin | Trusted backend CLI, real owner account list, expanded overview counts, searchable/paged venue/account/booking/review/game/audit/report/content views, status/rating filters where appropriate, venue decisions, game participant detail and cancellation, review moderation, scoped court schedule inspection, shared account editor and existing CMS/catalog editor. | Local non-fixture CLI dry-run/grant/idempotency, production/fixture rejection; role checks, admin list reads, guarded cancellation/recruitment cancellation/audit tests. | No approved non-fixture hosted administrator was identified or granted access. Hosted admin login/decisions/CMS acceptance remains untested. Small location catalogues use in-memory search over the loaded catalogue, not server pagination. |

## Storage findings and setup

Read-only database inspection found:

- avatars: private, 5 MB, JPEG/PNG/WebP.
- venue-media: private, 5 MB, JPEG/PNG/WebP/PDF; PDF is accepted only as an ownership document.
- Legacy avatars_* authenticated-client policies are absent after the custom-account transition.
- No anon/authenticated grants on public.venue_media were found.
- Backend DATABASE_URL and SUPABASE_URL are configured. **SUPABASE_SERVICE_ROLE_KEY is absent.** No credential values were printed or copied to frontend configuration.

Set the correct project's server-only SUPABASE_SERVICE_ROLE_KEY in ignored backend/.env, then restart backend. Do not put it in VITE_ or EXPO_PUBLIC_ variables, expose it in screenshots, or make the buckets public. New application accounts do not use Supabase Auth; uploads and private signing must pass through Express.

Hosted failure test used dev_player_39 and the actual local design/screenshots/Date Planner.png file through the HTTP API (not a browser): 503 STORAGE_NOT_CONFIGURED, naming the missing server key. Invalid image bytes returned 400 INVALID_IMAGE. The before/after avatar path was identical. No replacement photo was persisted remotely.

Storage success tests use a clearly isolated local HTTP stub with disposable PostgreSQL records. They prove the API/storage contract, validation, signed URL reads, replacement/deletion and authorization; they do not prove hosted Storage connectivity. Venue/court replacement swaps the registered image reference before removing the previous private object. A failed old-object cleanup returns a warning; failed new metadata persistence attempts to remove the new object. PostgreSQL and object storage are not a distributed transaction, so failed compensation may require private orphan cleanup.

## Administrator provisioning

Create a normal real application account through signup, then have a trusted operator verify its identity. Never promote dev_player_*, dev_owner_* or any is_development_fixture account. From backend:

```powershell
$env:NODE_ENV='development'
# Eligibility check only; no grant:
npm.cmd run admin:provision -- --email APPROVED_ACCOUNT_EMAIL
# Trusted operator's explicit grant:
npm.cmd run admin:provision -- --email APPROVED_ACCOUNT_EMAIL --grant
```

This CLI requires the existing private DATABASE_URL. It rejects production, missing/inactive/passwordless/profile-less/fixture accounts. It creates no account/password and records admin.provision.trusted_cli in audit_logs when granting membership. Repeating a grant is a no-op. There is no public role assignment endpoint. These commands have **not** been executed against the hosted database. Sign in with the approved account at /admin/login afterward.

## API changes (existing schema only)

- POST /me/avatar now persists avatar_path and returns the updated profile. Missing Storage no longer prevents loading the rest of an existing profile; a mediaWarning and initials fallback are used.
- Existing player/profile/game/review responses can include signed avatar URLs; private raw paths are omitted from public player projections.
- POST /hub/venues/:id/media supports scoped replaceId; DELETE /hub/venues/:id/media/:mediaId removes only authorized venue media.
- GET /hub/courts/:id/calendar supplies actual day/week slots, reservations and blocks after owner checks.
- GET /hub/analytics supplies bounded (at most 93 days), scoped aggregates, current schedule capacity minus overlapping closure unions, review average and chart series.
- Owner/admin lists have bounded pages/search/appropriate status or rating filters. Admin overview adds stored counts. GET /admin/games/:id allows authorized participant inspection, including private games.
- POST /admin/bookings/:id/cancel requires administrator access, locks court/booking rows, cancels attached recruitment and logs the reason. Only future unpaid active bookings are handled; paid bookings require a separate reviewed payment resolution.
- POST /admin/reviews/:id/status requires administrator access and audits visibility changes. Review eligibility rules and records were not replaced.

Existing booking exclusions, court locks, game membership procedures, session/CORS checks and public signup role restrictions remain intact. No SQL migration was generated or applied.

## Live read evidence

Hosted/local-server owner reads returned 200 for venue cards/upcoming counts, week calendar, filtered games/reviews/bookings and analytics. One observed analytics range (2026-10-01 through 2026-11-01) returned 16 bookings, 11 confirmed, 4 completed, 1 cancellation, PKR 4,290 recorded payments, PKR 57,845 outstanding active-booking value and PKR 62,135 booked value. Those amounts were read, not generated or recorded by this task. Values can change through other user activity.

The first analytics exercise exposed PostgreSQL reserved-word alias errors (day/hour), returned 503, and was corrected; subsequent hosted requests returned 200. Existing backend terminal logs were unavailable; a temporary local diagnostic server identified the SQL error without printing credentials. It was closed afterward. No background helper was left running.

## Verification commands and remaining manual acceptance

From backend: npm.cmd test; npm.cmd run typecheck; npm.cmd run lint; npm.cmd run build.
From web: npm.cmd run lint; npm.cmd run build; npm.cmd run test:domain.

The successful 24-test suite includes custom account/session/role/booking/game checks, Storage-stub success/failure/persistence, private venue replacement/deletion and owner denial, admin provisioning guards, cancellation/audit behavior, schedule/analytics fixture reads, game status labels and navigation contracts. **Final results:** backend 24/24 tests; web lint/build with TypeScript; backend lint/typecheck/build; shared domain self-check all passed.

Once Storage and a browser are available, use http://127.0.0.1:5173 with API http://127.0.0.1:5000, VITE_ENABLE_DEMO_AUTH=false. Test widths **390, 768, 1024, 1440, 1920** and capture actual screenshots of profile, My Venues, Courts, Schedule, Games, Reviews, Analytics, signup and admin lists. Verify keyboard/drawer navigation, no horizontal overflow and four desktop game columns.

Use a disposable account/venue for successful avatar and court/venue upload, replacement and deletion. Confirm the returned signed image responds 200, then refresh/logout/login. Also test invalid/oversized images and provider failures. Edit a profile name/sport and confirm header/directory/game participant refresh. Exercise signup Back/Next/value preservation and final redirect, including optional-upload retry/skip. Test owner schedule changes against player availability and competing bookings only on disposable records. With an approved admin account, test venue approval/suspension, participant reads, cancellation, review visibility and CMS publication; validate player-side effects. Do not modify seeded operational records solely for visual inspection.

## Files changed in this pass

- backend/src/application.ts, media.ts (new), admin-provision.ts (new).
- backend/scripts/provision-admin.ts (new), backend/package.json.
- backend/test/application.test.ts, seed.test.ts, navigation.test.ts, media.test.ts (new).
- shared/games.ts, contracts.ts, player-store.ts.
- web/src/App.tsx, App.css, ui.tsx, live.tsx, social.tsx, signup.tsx, operations.tsx, navigation.ts, workspace-records.tsx, catalog.tsx, content.tsx.
- web/src/owner-workspace.tsx, analytics.tsx, review-card.tsx (new).
- design/ui-audit-index.jpg (reference contact sheet only).
- docs/FEATURES.md, SETUP.md, VERIFICATION.md, IMPLEMENTATION-REPORT.md and this report.

Remaining product work stays in FEATURES.md: successful provider/UI acceptance, historical schedule/payment-event reporting, owner review responses, block removal/drag rescheduling, staff/customer CRM/report exports, durable interrupted-onboarding recovery, messaging/notifications, broader native/social/device/APK and deferred external providers. No AI, Maps, weather or mobile redesign was started.
