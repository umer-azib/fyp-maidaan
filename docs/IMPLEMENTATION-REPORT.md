# Current web repair handoff

Checkpoints A-E were implemented in the existing codebase; source, local automated tests and hosted HTTP reads are distinguished in [WEB-REPAIR-CHECKPOINTS.md](WEB-REPAIR-CHECKPOINTS.md). This supersedes the historical environment/placeholder statements below. The database is hosted/migrated/seeded; it was not reset or reseeded here. No SQL migration or hosted administrator grant was performed.

Known blockers: missing backend SUPABASE_SERVICE_ROLE_KEY; no browser/app surface available for actual rendered screenshots, five-width UI acceptance, real UI uploads or hosted signup/admin decisions; no identified approved non-fixture admin account. Local Storage-stub tests do not establish provider success. FEATURES.md remains the master checklist.

# Implementation handoff

The prioritized booking/matchmaking journey is implemented in the existing applications. The entire ten-phase platform is not complete. FEATURES.md records source/API, UI, tested and remaining scope without treating placeholders as working features.

## Implemented

- Preserved purple screenshot-inspired components; repaired responsive frames, sidebars, headers, forms, participant cards and slot controls.
- Express-managed application accounts with bcrypt, unique usernames/emails, opaque hashed sessions, HttpOnly web cookies, native SecureStore, expiry/renewal/logout and account/role checks. New signup does not use Supabase Auth.
- Four-step Player signup, persistent sport/profile/availability preferences and guided owner/venue applications. Server-managed private avatar/media paths; ownership documents scoped to owners/admins.
- Owner courts, schedules, weekday/weekend and peak pricing windows, closures, offline reservations and real booking inventory. Approval/suspension, transactional conflict protection, manual/pay-at-venue booking, history/actions, rescheduling and recorded payment totals.
- Reservation-linked game creation with immutable booked court/time, existing capacity/host procedures, waitlists, private invitations, external weekly series, connections/blocks, verified attendance, eligible reviews/reports and targeted CMS announcements.
- Real scoped owner/admin APIs/dashboard forms; isolated local demo sessions/data remain production-disabled. Broader native social/dashboard coverage is still recorded as incomplete.

## Database / environment

Generated migrations 004-009; validated the complete 001-009 chain only in disposable local PostgreSQL engines. Zero remote migrations applied. Legacy profile UUID/password transition is covered by a test fixture. The exact sequence/cutover caveats are in CUSTOM-ACCOUNTS-AND-BOOKING.md.

Local server DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY are missing. SUPABASE_URL is present but is not an application database connection. Real hosted accounts, venues and Storage are not live-connected until reviewed setup. Public clients need only API URLs; mobile portal handoff also needs EXPO_PUBLIC_WEB_URL. No real venue/price/partnership data was invented.

## Verification

Backend: 16 tests, lint, TypeScript and build passed. Web: lint, TypeScript/Vite build, domain checks and compiled-production demo exclusion passed. Chrome: 3 actual interaction suites passed with 54 screenshots/overflow assertions across 390, 768, 1024 and 1440. Includes Player/owner signup, refresh/logout/role checks, court schedule save, venue approval, real local booking-to-game and admin content propagation. Mobile: lint/types and Android JS/Hermes export passed (1304 modules), not an APK/device test.

SQL/API tests cover duplicate/capacity/host checks, competing booking attempts, schedule/closure conflicts, suspension, waitlist promotion, private invitations, recurring games, verified review eligibility/self/duplicate denial, blocks, sessions and rate limits. PGlite serializes DB connections; deployed multi-connection load is not verified. Representative saved screenshots were visually inspected, without a pixel-baseline equivalence claim.

## Remaining

Hosted deployment/Storage round-trips, trusted administrator provisioning, account recovery/email verification, physical devices, advanced owner calendar/staff/occupancy/reports, native social/calendar completion, notifications/chat, provider Maps/Places/weather, full CMS types/flag enforcement, booking-backed recurrence, cost settlement and APK delivery. Existing mobile dependency advisories remain unresolved.

Automatic approval review rejected combined file-writing commands, including one containing an administrator-provisioning script, reporting blocked by policy. No remote grant was attempted; that script is not delivered. Manual trusted provisioning remains an external setup step.

## Launch

Run separate PowerShell terminals:

```powershell
cd D:\maidaan-umer\Maidaan-V2\backend
npm.cmd run dev
```

```powershell
cd D:\maidaan-umer\Maidaan-V2\web
npm.cmd run dev -- --host 127.0.0.1
```

```powershell
cd D:\maidaan-umer\Maidaan-V2\mobile
npm.cmd start -- --clear
```

For local previews only, first set VITE_ENABLE_DEMO_AUTH=true or EXPO_PUBLIC_ENABLE_DEMO_AUTH=true in the corresponding development terminal. Credentials: player/player, hub/hub, admin/admin. Use a reachable LAN web URL for phone portal handoff. Existing backend .env uses port 5000; fresh templates use 3001. Keep API URLs/CORS consistent.

## Exact files changed or added

The root has no Git repository; this is a task edit manifest. Original migrations 001-003 and ignored local .env values were preserved. Build/cache output is generated separately.

- AGENTS.md
- README.md
- backend/.env.example
- backend/package.json
- backend/package-lock.json
- backend/tsconfig.json
- backend/src/accounts.ts
- backend/src/application.ts
- backend/src/postgres.ts
- backend/src/app.ts
- backend/src/data.ts
- backend/src/index.ts
- backend/src/validation.ts
- backend/test/account-client.test.ts
- backend/test/application.test.ts
- backend/scripts/ui-test-server.ts
- shared/account-client.ts
- shared/api.ts
- shared/contracts.ts
- shared/games.ts
- web/.env.example
- web/.gitignore
- web/package.json
- web/package-lock.json
- web/playwright.config.ts
- web/e2e/journey.spec.ts
- web/src/App.tsx
- web/src/App.css
- web/src/live.tsx
- web/src/services.ts
- web/src/store.tsx
- web/src/ui.tsx
- web/src/signup.tsx
- web/src/bookings.tsx
- web/src/operations.tsx
- web/src/content.tsx
- web/src/social.tsx
- web/src/catalog.tsx
- mobile/.env.example
- mobile/package.json
- mobile/package-lock.json
- mobile/app.json
- mobile/src/services.ts
- mobile/src/store.tsx
- mobile/src/entry.tsx
- mobile/src/live.tsx
- mobile/src/screens.tsx
- mobile/src/components/maidaan-ui.tsx
- mobile/src/signup.tsx
- mobile/src/bookings.tsx
- mobile/src/content.tsx
- mobile/src/app/signup.tsx
- mobile/src/app/bookings.tsx
- design/DESIGN-GUIDE.md
- design/SCREEN-MAPPING.md
- docs/FEATURES.md
- docs/SETUP.md
- docs/API.md
- docs/SCHEMA.md
- docs/VERIFICATION.md
- docs/DEMO-UI-TESTING.md
- docs/CUSTOM-ACCOUNTS-AND-BOOKING.md
- docs/IMPLEMENTATION-REPORT.md
- docs/ui-qa/README.md
- supabase/migrations/202610150004_application_accounts.sql
- supabase/migrations/202610150005_booking_operations.sql
- supabase/migrations/202610150006_content.sql
- supabase/migrations/202610150007_venue_media.sql
- supabase/migrations/202610150008_social.sql
- supabase/migrations/202610150009_recurring_games.sql

## Captured screenshots

- docs/ui-qa/admin-dashboard-1024.png
- docs/ui-qa/admin-dashboard-1440.png
- docs/ui-qa/admin-dashboard-390.png
- docs/ui-qa/admin-dashboard-768.png
- docs/ui-qa/admin-login-1024.png
- docs/ui-qa/admin-login-1440.png
- docs/ui-qa/admin-login-390.png
- docs/ui-qa/admin-login-768.png
- docs/ui-qa/create-1024.png
- docs/ui-qa/create-1440.png
- docs/ui-qa/create-390.png
- docs/ui-qa/create-768.png
- docs/ui-qa/game-detail-1024.png
- docs/ui-qa/game-detail-1440.png
- docs/ui-qa/game-detail-390.png
- docs/ui-qa/game-detail-768.png
- docs/ui-qa/hub-dashboard-1024.png
- docs/ui-qa/hub-dashboard-1440.png
- docs/ui-qa/hub-dashboard-390.png
- docs/ui-qa/hub-dashboard-768.png
- docs/ui-qa/hub-login-1024.png
- docs/ui-qa/hub-login-1440.png
- docs/ui-qa/hub-login-390.png
- docs/ui-qa/hub-login-768.png
- docs/ui-qa/my-games-1024.png
- docs/ui-qa/my-games-1440.png
- docs/ui-qa/my-games-390.png
- docs/ui-qa/my-games-768.png
- docs/ui-qa/open-games-1024.png
- docs/ui-qa/open-games-1440.png
- docs/ui-qa/open-games-390.png
- docs/ui-qa/open-games-768.png
- docs/ui-qa/owner-signup-venue-390.png
- docs/ui-qa/player-login-1024.png
- docs/ui-qa/player-login-1440.png
- docs/ui-qa/player-login-390.png
- docs/ui-qa/player-login-768.png
- docs/ui-qa/profile-1024.png
- docs/ui-qa/profile-1440.png
- docs/ui-qa/profile-390.png
- docs/ui-qa/profile-768.png
- docs/ui-qa/real-booked-game-390.png
- docs/ui-qa/real-cms-1440.png
- docs/ui-qa/real-owner-schedule-768.png
- docs/ui-qa/signup-account-390.png
- docs/ui-qa/signup-sports-768.png
- docs/ui-qa/venues-1024.png
- docs/ui-qa/venues-1440.png
- docs/ui-qa/venues-390.png
- docs/ui-qa/venues-768.png
- docs/ui-qa/welcome-1024.png
- docs/ui-qa/welcome-1440.png
- docs/ui-qa/welcome-390.png
- docs/ui-qa/welcome-768.png
