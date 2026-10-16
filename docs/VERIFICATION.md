# Current web/media/admin verification

See [WEB-REPAIR-CHECKPOINTS.md](WEB-REPAIR-CHECKPOINTS.md) for checkpoint evidence and exact unverified acceptance steps. **Final checks passed:** backend 24/24 automated tests; backend lint, TypeScript and build; web lint and build (including TypeScript); shared game-domain self-check.

The backend suite includes real SQL/HTTP tests with an isolated Storage stub, avatar persistence and signed-byte reads, venue/court photo replacement/deletion/permissions, provisioning guards, cancellations/auditing, schedule/analytics and game-state checks. Hosted calendar/review/game/booking/analytics reads returned 200. A hosted PNG upload returned 503 STORAGE_NOT_CONFIGURED (missing server-only key); invalid bytes returned 400 and the existing path remained unchanged. No real provider-success or rendered UI pass is claimed.

No remote migration, seed/reset, business-data edit or administrator grant was performed. Provider/UI acceptance remains blocked. Historical verification follows.

# Current session/navigation verification - 2026-10-15

See [SESSION-NAVIGATION-REPAIR.md](SESSION-NAVIGATION-REPAIR.md) for actual live HTTP status codes, changed files, manual browser steps and remaining admin/visual checks. Player and owner database sessions and read endpoints exercised successfully; logout returns 200 then session 401; wrong password/no-session 401; other-owner/admin access 403. No remote migration, seed or business-record edit performed.

Final checks passed: backend 20/20 tests; web lint/build with TypeScript; backend lint/typecheck/build; shared game-domain checks. CORS preflight returned 204 with the exact origin and credentials=true.

Browser tools returned no available browsers/apps, and Chrome/IAB opening failed. No new rendered screenshots, desktop/mobile visual pass or browser refresh/navigation pass is claimed. Previous visual results below are historical.

# Migration and development-fixture verification ? 2026-10-15

No remote database connection, migration, seed or cleanup was executed for this task. No frontend source changed.

Added `backend/test/seed.test.ts`: disposable local PostgreSQL migration-chain and fixture checks; all 12 areas/24 courts, accounts/profile links, schedule-derived free/booked/blocked inventory, non-overlapping bookings, host/capacity/review eligibility, owner-only management and owner venue-list HTTP response, full-game rejection, suspended-venue rejection, production fixture login/token denial, rerun idempotency, guarded cleanup, unrelated-account preservation and collision rollback.

**Results:** backend test suite 17/17 passed; seed suite passed; backend lint (including scripts), TypeScript and build passed.

Run from backend: `npm.cmd test`, `npm.cmd run test:seed`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`. Provider permissions, real Storage and multi-connection contention remain unverified. See [DEMO-DATA.md](DEMO-DATA.md) and [MIGRATION-REVIEW.md](MIGRATION-REVIEW.md).

Historical verification follows; it does not claim this fixture dataset has been deployed.

# Current verification: custom accounts and managed booking

This evidence supersedes the historical Supabase Auth/browser-unavailable notes below. See IMPLEMENTATION-REPORT.md for exact files and CUSTOM-ACCOUNTS-AND-BOOKING.md for deployment.

| Check | Result | Scope |
|---|---|---|
| Backend tests | PASS | 16 tests; actual local PostgreSQL migration chain 001-009, account/session API, booking/matchmaking/social rules and rate limits |
| Backend lint/types/build | PASS | Test fixture scripts included in TypeScript checks |
| Web lint/types/build/domain | PASS | Existing Vite configuration retained |
| Production demo exclusion | PASS | Compiled Vite auth services, even with the demo flag forced true |
| Chrome rendered interactions | PASS | 3 Playwright journeys using installed headless Chrome and a test-only PostgreSQL/API process |
| Responsive captures | CAPTURED / INSPECTED | 54 screenshots in docs/ui-qa; overflow assertions at 390/768/1024/1440; representative images visually inspected |
| Mobile lint/types | PASS | Native RN components; Expo SDK 57 preserved |
| Android JS/Hermes export | PASS | 1304 modules; production export with demo flag true; not an APK or device test |
| Hosted schema/data/Storage | NOT RUN | DATABASE_URL and server Storage key missing; zero remote migrations applied |
| Physical devices/keychain/photo round-trip | NOT RUN | Configured services and native device build required |
| Production contention/load | NOT RUN | Local competing HTTP requests verified, but PGlite serializes DB connections |

Browser coverage includes role gates, refresh/logout, managed booking-to-game creation, owner schedule access/save, admin content propagation, Player signup/profile persistence and owner signup/venue approval. Fixtures are synthetic isolated test records, never live app fallback data. SQL/API checks cover capacity/duplicate/host rules, overlapping bookings, schedule/closure conflicts, venue suspension, waitlist promotion, invitations/private access, recurring series, blocking, eligible reviews and session/rate-limit isolation. The legacy migration fixture preserves a profile UUID with no migrated password. No hosted integration success is claimed.

Dependencies added for requested functionality/testing: pg, bcryptjs, @types/pg, Expo-compatible SecureStore and Playwright using installed Chrome. Existing mobile dependency advisories below remain unresolved. Current FEATURES.md takes precedence over historical deferred statuses.

---

# Verification — 2026-10-15

Local checks are distinct from external-service integration. Supabase environment files arrived late during implementation. They were used only for read-only connectivity checks; no remote schema changes or APK builds were attempted. Frontend files were corrected to public-only variables without printing secrets.

| Check | Result | Scope |
|---|---|---|
| Backend TypeScript (including tests) and build | PASS | npm run typecheck; npm run build |
| Backend lint | PASS | Existing workspace ESLint reused |
| Backend HTTP/SQL/shared-client tests | PASS | 6 node:test cases, multiple assertions each |
| Web TypeScript/production build | PASS | Vite + tsc |
| Web lint | PASS | npm run lint |
| Legacy demo domain checks | PASS | npm run test:domain; isolated from live app paths |
| Mobile TypeScript/lint | PASS | npm run typecheck; npm run lint |
| Android JS/Hermes export | PASS | Expo export with two workers; 1,331 modules; mobile/dist |
| Browser/app inventory | BLOCKED | No connected browser/native surface; no rendered visual pass claimed |
| Supabase public Auth settings | PASS | Read-only /auth/v1/settings returned 200 with the configured publishable key |
| Backend production startup | PASS | Existing .env port 5000; /health returned 200/configured:true |
| Hosted database discovery | BLOCKED | /locations and /venues return 503; remote PGRST205/PGRST202 show missing tables/functions; migrations not applied |
| Hosted account sign-in/PostgREST/Storage acceptance | NOT RUN | Needs reviewed migration deployment and real test accounts; SETUP.md provides steps |
| Confirmation email, real uploads, GPS/photo device permissions | NOT RUN | Requires configured services and devices |
| Production multi-connection contention/load | NOT RUN | Embedded PostgreSQL verifies rules, not deployed concurrency/load |
| APK/iOS distribution | DEFERRED | No signing/EAS release in M1 |

## Test evidence

- HTTP: health/configuration, missing/invalid tokens, forbidden admin/owner access, identity/role injection, malformed JSON, invalid UUID/pagination/location, CORS denial, structured errors/request IDs, venue DTO/pagination mapping and absence of fake booking endpoints.
- Shared client: bearer propagation, read-only ID/host stripping, location/pagination serialization, conflict errors and missing-configuration failures.
- Shared store: no demo fallback, preservation of unsaved profile drafts, location changes and sign-out clearing.
- Actual PostgreSQL engine in memory (PGlite): committed SQL migrations, RLS/grants, automatic host participation, duplicate/full joins, non-host management denial, direct game/membership/admin writes denied, requester/host request visibility, acceptance/rejection/leave/cancel, format validation, profile/photo-path checks, overlap exclusion (adjacent bookings allowed), distance filtering and private booking access.
- Storage migration policies are checked against a minimal test-only storage schema, including owner-folder upload denial. This does not certify the managed Storage HTTP service, real upload processing or its MIME/size enforcement.

HTTP tests use isolated injected dependencies; application code uses Supabase Auth. Synthetic venue fixtures exist only in the test process, never in app data or seed migrations. No real multi-user acceptance pass is claimed. SETUP.md lists the required post-configuration checks.

## Dependency audit

- Web: existing React Router advisory patched with compatible 7.18.2; installation reports zero vulnerabilities.
- Backend: minimal runtime rate limiter and development compiler/test tools; installation reports zero vulnerabilities.
- Mobile: npm audit --omit=dev reports **29 affected entries: 18 high, 11 moderate** in the Expo/React Native tree. Evidence: mobile-audit-2026-10-15.json. Root advisories include braces, decode-uri-component, node-forge and uuid, with multiple transitive affected entries. npm proposes cross-SDK downgrades/major changes for several; those were not applied because SDK 57 must be preserved. Review supported compatible fixes before release. A passing bundle does not resolve these findings.

The original visual-QA report remains blocked. Compare venue discovery, auth, profiles, games, forms and dialogs against the supplied screenshot style on real mobile/desktop viewports before calling this live-integrated or production ready.

Final configured rebuild: web and Android passed after frontend environment correction. Android was rebuilt with --clear because the prior Metro cache retained old environment substitutions. The final Hermes artifact contains the configured public project/key/API values; a scan of final web/native output found no backend server-secret value. Web emits a non-fatal >500 KB chunk-size warning (about 150 KB gzip); no extra splitting abstraction was introduced for this milestone.

## Development-only role preview update (2026-10-15)

- PASS: web lint and TypeScript/Vite build; mobile TypeScript and lint; backend lint/typecheck and 11 automated tests; shared domain self-check.
- PASS: production-compiled Vite auth services reject demo login even with the demo flag forced true.
- PASS: Android production export with the demo flag set (bundle verification only, not an APK/device test).
- Automated demo checks cover credentials, exact role isolation, restore/logout and races, local sample actions, blocked live transport, and backend rejection of demo bearer strings.
- NOT RUN: rendered browser/device interactions or screenshots. Available automation exposed no browser/device surfaces. The 1440px, 768px and 390px visual/interaction checklist is in DEMO-UI-TESTING.md.
- No remote migrations, real account creation or database writes were performed. Existing live Auth/API/Storage acceptance remains pending the reviewed Supabase migration step. Demo fixtures are now permitted only behind the explicit development-only opt-in; they are never a live-data fallback.
