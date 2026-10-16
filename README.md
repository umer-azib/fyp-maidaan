# Current implementation

Read [docs/CUSTOM-ACCOUNTS-AND-BOOKING.md](docs/CUSTOM-ACCOUNTS-AND-BOOKING.md) first. Express now manages application accounts and sessions with PostgreSQL. New signups do not use Supabase Auth. Review migrations 004-009 before deployment; none were applied remotely. The historical milestone instructions below are superseded by this guide and docs/FEATURES.md.

﻿# Maidaan V2 — milestone 1

Existing Expo SDK 57 and React/Vite apps now have a shared Express/Supabase implementation path. The screenshot-inspired design, components, mobile tabs and web layouts are preserved. This is source implementation plus local verification, not a deployed/live integration: Supabase environment files arrived during implementation. Public Auth settings respond successfully; the remote database is missing the new tables/functions. No remote migrations were run.

## Local UI demo login (explicit opt-in)

Welcome now offers Player, Venue Owner and Admin entry cards. Use [docs/DEMO-UI-TESTING.md](docs/DEMO-UI-TESTING.md) for the exact start commands, player/player, hub/hub and admin/admin credentials, and manual visual checks. Demo auth defaults OFF and requires the matching platform flag plus development mode. Production ignores it even with a true flag. Demo state is separate from Supabase and cannot call the live API or upload to Storage. No migrations are run. Real Supabase sign in remains available on each login page.

## Start here

- [Master feature checklist](docs/FEATURES.md): every requested feature, role, database/API dependency, priority and status. Future sessions must use this list.
- [Setup](docs/SETUP.md): migrations, environment values, real accounts/venue records, acceptance checks and startup commands.
- [API](docs/API.md), [schema/blueprint](docs/SCHEMA.md), [verification](docs/VERIFICATION.md).
- [Design guide](design/DESIGN-GUIDE.md), [screen mapping](design/SCREEN-MAPPING.md) and [project rules](AGENTS.md).

## Implemented source

- Shared Supabase email/password Auth, separate portal login screens, session restore/refresh, sign out, JWT verification and server-checked manager/admin access. Everyone has one Player identity; hosting is per game.
- Persisted profile API/native/web editor: name, username, bio, city/area, individual sport skills/formats/positions, completeness and private avatar uploads/signed URLs.
- Venue-first discovery, separate Find Open Games, real location selectors, optional GPS radius, pagination, venue details, courts, contact/directions, permitted HTTPS photos and published hours. No invented venue/price records are seeded.
- Persistent games: formats/capacity, host participation, instant join, approval requests, accept/reject, edit/cancel, leave/withdraw, rosters and independent My Games history. PostgreSQL row locks, constraints, revoked direct writes and RLS enforce identity/capacity. External bookings are labeled unverified.
- Express TypeScript/Zod API, consistent errors/request IDs, explicit CORS, pagination and rate limits. Caller-scoped Supabase clients; no service-role key needed.
- SQL migrations for identity/location, venue/court/schedule, booking groundwork, game participation, privileges and avatar policies. Booking exclusion groundwork is tested; no booking engine is exposed.
- Existing hub/admin designs are server-gated, labeled disabled previews. No simulated approvals, payments, booking or CMS successes.

Legacy demo fixtures and checks remain in shared/demo.ts, demo-service.ts and games.test.cjs. Live player stores never fall back to them. Explicit local preview mode uses a separately gated demo adapter and store.

## Configure and run

The current backend .env uses port 5000. Frontend public environment variables were mapped to that port; server-only secrets were removed from frontend .env files. Local templates use port 3001 for a fresh setup. Migrations still need applying to the configured Supabase project.

Create ignored .env files from each .env.example only if no target exists. Fill the same Supabase project URL and publishable key in all three apps and set API URLs. See docs/SETUP.md for the three reviewed SQL migrations and exact environment names. A physical phone needs a reachable LAN API address. Google/weather keys are not used in M1.

Use separate PowerShell terminals:

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

Web: http://127.0.0.1:5173/player (venues), /player/games (open games), /player/login, /hub/login, /admin/login. Native: Expo QR/emulator; npm.cmd run web for its browser variant. Install dependencies once in each folder if absent; backend/mobile lint reuse web's ESLint toolchain.

## Checks

```powershell
cd D:\maidaan-umer\Maidaan-V2\backend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
cd ..\web
npm.cmd run build
npm.cmd run lint
npm.cmd run test:domain
cd ..\mobile
npm.cmd run typecheck
npm.cmd run lint
npx.cmd expo export --platform android --max-workers 2
```

See docs/VERIFICATION.md for actual evidence and limits. Native JS/Hermes export is not an APK/device test.

## Files changed or added

- backend/src/{app,data,index,validation}.ts; backend/test/{api,client,database}.test.ts; backend package/config/lock and .env.example.
- supabase/migrations/{202610150001_core,202610150002_storage,202610150003_discovery}.sql.
- shared/{contracts,api,formats,player-store}.ts; optional persisted fields on existing games.ts.
- web/src/{services,live,store}.tsx/ts; App.tsx API/route wiring and minimal App.css additions; Supabase and patched React Router; .env.example.
- mobile/src/{services,live,store}.tsx/ts; existing screens.tsx, protected route wrappers, open-games and venue routes; photo/location SDK modules and config; environment/ignore/lint updates.
- AGENTS.md, README.md, design guide/mapping and docs/FEATURES.md, SETUP.md, API.md, SCHEMA.md, VERIFICATION.md and audit evidence.

## Deferred and limitations

Booking/time-slot transactions and confirmed booking-to-game conversion, owner claims/live venue management, recurring/replacement games, waitlists, attendance, calendars, cost splitting, social/chat/invitations, reviews, notifications, Maps/Places/weather, full admin/CMS/feature flags and APK delivery remain later milestones. FEATURES.md and SCHEMA.md preserve every requested feature; unfinished controls are disabled or absent.

Native date entry is a labeled UTC field; details use device-local display. Discovery location is session state; saved profile location is persisted separately with an explicit action. Game search/sport/join filters apply to loaded pages; load more to search further. Signed avatar URLs expire after an hour and refresh via profile reload. Distributed rate limits, real multi-client contention, hosted Auth/PostgREST/Storage acceptance, browser comparison and physical-device GPS/photo QA remain deployment gates. Mobile SDK dependency advisories are recorded in VERIFICATION.md.

The root has no Git repository; mobile has its own .git. Version shared, backend, web and docs together before deployment. Builds depend on shared sources.

## Latest FYP integration

See [final verification and Android next steps](docs/FINAL-FYP-INTEGRATION.md), [19 real Lahore venue sources](docs/LAHORE-REAL-VENUES.md) and [development venue manager accounts](docs/LAHORE-VENUE-ACCOUNTS.md). Real directory locations are FYP-manageable but not verified businesses/bookable inventory. Do not reset/reseed the deployed dataset.
