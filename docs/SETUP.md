# Current FYP integration setup

Read [FINAL-FYP-INTEGRATION.md](FINAL-FYP-INTEGRATION.md) for exact Windows CMD start/EAS commands, admin status and verified limits. Migration 011 is already approved/applied; 19 source-backed real locations and 19 development-only FYP manager accounts are already imported. Do not rerun baseline migrations or the original seed. Read [LAHORE-VENUE-ACCOUNTS.md](LAHORE-VENUE-ACCOUNTS.md) for usernames, stable IDs and simulation status. The approved administrator uses the operator-supplied password; no admin password is committed.

Expo Go currently targets the PC Wi-Fi API at http://192.168.100.14:5000 in ignored mobile/.env. Update if the LAN changes. EAS preview builds require a reachable HTTPS API and reject localhost/HTTP. An Android bundle is verified, but no APK has been built/installed. Leaflet assets are bundled locally and OSM attribution/caching are retained. No Google SDK key is required.

# AI and weather setup addition

Express uses the server-only GEMINI_API_KEY already present in backend/.env, and optional GEMINI_MODEL (default gemini-3.5-flash-lite, live tested). Open-Meteo needs no key for this development MVP. No new database migration. Never expose the Gemini key through VITE_/EXPO_PUBLIC_ values. See [AI-WEATHER.md](AI-WEATHER.md) for routes, native API host setup, exact start/check commands and provider/visual testing limits.

# Web media and administrator setup - current

The hosted private avatars and venue-media buckets exist. Server Storage accepts SUPABASE_SECRET_KEY (preferred and configured) or legacy SUPABASE_SERVICE_ROLE_KEY, with SUPABASE_URL in ignored backend/.env. Never put privileged keys in VITE_/EXPO_PUBLIC_ configuration or make buckets public. Hosted PNG upload, signed-image download and logout/login persistence passed; invalid image returned 400. See docs/BOOKING-NOTIFICATIONS-VERIFICATION.md.

The trusted administrator CLI is now implemented. Register/verify a normal **non-fixture** account first. From backend with NODE_ENV=development, run `npm.cmd run admin:provision -- --email APPROVED_ACCOUNT_EMAIL` for eligibility, then add `--grant` only for the trusted operator's explicit grant. No account/password is created. No hosted grant was executed. Fixture administrators and production CLI use are rejected.

Full checkpoint evidence, precise files/API changes, upload tests and manual browser acceptance: [WEB-REPAIR-CHECKPOINTS.md](WEB-REPAIR-CHECKPOINTS.md). Use the existing running web/API at 127.0.0.1:5173 / 127.0.0.1:5000; no migration/reseed is required for these repairs.

# Current local cookie-session setup

Use **http://127.0.0.1:5173** for web and **http://127.0.0.1:5000** for the API. Do not mix localhost and 127.0.0.1 with SameSite=Lax cookies.

- web/.env: `VITE_API_URL=http://127.0.0.1:5000`, `VITE_ENABLE_DEMO_AUTH=false`.
- backend/.env: retain the private DATABASE_URL, `PORT=5000`, `NODE_ENV=development`; CORS_ORIGINS must include the exact `http://127.0.0.1:5173` origin.
- Start separate terminals in backend and web with `npm.cmd run dev` and `npm.cmd run dev -- --host 127.0.0.1`, respectively. Already-running processes need no duplicate server. Vite restarted automatically when its local environment file changed; the served API URL was verified.
- Use the normal account form for dev_player_01 or dev_owner_01 with MaidaanDev!2026. These are database fixtures, not player/player UI previews.
- Hosted migrations/seeding are already applied according to the user. Do not replay or reseed. Trusted admin provisioning and live HTTP results: [repair report](SESSION-NAVIGATION-REPAIR.md).

Historical setup below is superseded where it refers to Supabase Auth, unexecuted migrations or old local ports.

# Current implementation

Read [CUSTOM-ACCOUNTS-AND-BOOKING.md](CUSTOM-ACCOUNTS-AND-BOOKING.md) first. Express now manages application accounts and sessions with PostgreSQL. New signups do not use Supabase Auth. Review migrations 004-009 before deployment; none were applied remotely. The historical milestone instructions below are superseded by this guide and docs/FEATURES.md.

# Milestone 1 setup

Environment files arrived during implementation; no remote database was modified. The public Auth settings endpoint returned 200, but discovery reads report missing tables/functions (PGRST205/PGRST202). The source integration requires a real Supabase project before live Auth, profiles, venue data or games can be exercised. Missing configuration shows an explicit error; demo fixtures are never used as an automatic fallback.

For the current UI preview task, use DEMO-UI-TESTING.md instead. Do not apply migrations for demo login. The migration instructions below remain the future live-data setup path.

## 1. Supabase project and migrations

Create/select a Supabase project. For an existing project, inspect its schema and review name collisions first. Do not reset, truncate, or drop existing remote data. These migrations create new tables and intentionally stop on collisions.

Run these files **in order**, once, through the Supabase SQL Editor or your existing migration workflow:

1. `supabase/migrations/202610150001_core.sql`
2. `supabase/migrations/202610150002_storage.sql`
3. `supabase/migrations/202610150003_discovery.sql`

The second migration creates the private avatars bucket/policies. Core migration seeds ONLY sports and Lahore/areas, never invented venues, courts, schedules, prices or bookings. `btree_gist` is used for the booking exclusion groundwork. No application code automatically runs migrations.

Enable email/password Auth and keep email confirmation enabled. Configure your site URL/allowed redirect URLs for your web origin. Signup confirmation can be completed in the browser; the mobile user then signs in with the verified email/password. Mobile OAuth, password-reset/deep-link recovery and phone Auth are not implemented. Configure production SMTP and Auth rate-limit/CAPTCHA policy before public launch; local tests do not verify email delivery.

Get the **project URL** and **publishable key** (or legacy anon key). Use the same project for all portals. Never put a service-role/secret key in VITE_ or EXPO_PUBLIC_ environment variables. This backend also uses the publishable key and forwards verified user JWTs; it does not require a service-role secret.

## 2. Environment files

Current local setup: backend port 5000; public frontend variables are now mapped to the configured project and port. Server-only secret variables were removed from frontend .env files, with the backend .env preserved. The fresh examples below default to port 3001. Restart already-running frontends after changes.

PowerShell from the workspace root:

```powershell
foreach ($maidaanApp in @('backend', 'web', 'mobile')) {
  $maidaanEnv = Join-Path $maidaanApp '.env'
  if (-not (Test-Path -LiteralPath $maidaanEnv)) {
    Copy-Item -LiteralPath (Join-Path $maidaanApp '.env.example') -Destination $maidaanEnv
  }
}
```

Only copy if the target does not already exist; preserve existing values. Fill:

| File | Required values |
|---|---|
| backend/.env | SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY; optional PORT (3001) and explicit CORS_ORIGINS |
| web/.env | VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_API_URL |
| mobile/.env | EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, EXPO_PUBLIC_API_URL |

For a physical phone, API_URL must use your computer's reachable LAN IP, such as `http://<your-LAN-IP>:3001`, not localhost. Android emulator can use its host bridge address. Allow the development port in your firewall. For web, API_URL must be reachable from the browser. Add any non-default browser origin to backend CORS_ORIGINS; use HTTPS origins and API endpoints in production. Restart Vite and run npm.cmd start -- --clear in mobile after changing environment values; public variables are bundled at build time. GPS on a browser requires a secure context (HTTPS or localhost).

Google Maps/Places/weather credentials are **not required or used** in M1. The later integration will need restricted server Places credentials, separate web/Android/iOS Maps credentials with origin/package restrictions and a weather provider key. Do not put a server Places key in a public frontend variable. No scraper, external listing cache or provider request runs today.

## 3. Start existing apps

If dependencies are missing, run `npm.cmd install` once in backend, web and mobile. Backend/mobile lint reuse the existing web ESLint dependencies. No root package manager/workspace recreation is needed.

Use three PowerShell terminals:

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

Web: `http://127.0.0.1:5173/` onboarding, `/player` venues, `/player/games` open games, `/player/login`, `/hub/login`, `/admin/login`. Native: scan Expo's QR with a compatible SDK 57 client, or press `a` for an Android emulator; `npm.cmd run web` opens the Expo browser variant. Existing native modules use Expo SDK-compatible versions. Custom binaries need a rebuild for new photo/location permission configuration. No APK/EAS production build is created in M1.

Backend production artifact:

```powershell
cd D:\maidaan-umer\Maidaan-V2\backend
npm.cmd run build
npm.cmd start
```

`GET http://localhost:3001/health` reports configuration presence only, not Supabase readiness. Without configuration, health still works and data endpoints return NOT_CONFIGURED/503.

## 4. Accounts and actual venue data

Register through Player sign up, confirm email and sign in. Complete name, username, bio, location and sport skills. No user can choose an admin or owner role at registration. Venue-manager access must come from a reviewed private assignment; the application/claim workflow is deferred. For a test admin, first create that user's profile by signing in, then privately insert the actual UUID into admin_memberships through trusted SQL—not through browser requests. The same identity retains its Player profile. There is no Captain account.

Venue onboarding/editing UI is deferred. To exercise discovery, a trusted operator must insert actual independently sourced, authorized venue/court records into venues/courts using reviewed SQL or Supabase's private Table Editor. Publish records only with permission and accurate city/area IDs, coordinates, contact details and permitted HTTPS photo URLs. Set verified=true only for genuinely verified onboarded venues. Insert actual court_hours only when the operator supplies a schedule and pricing. Null pricing means unpublished; never default to fabricated prices. Source places is discovery-only, and cannot be marked verified. No paid relationship is implied by a listing.

Even for a verified scheduled venue, M1 displays informational opening hours—not free time slots. Booking remains disabled. M2 must implement the atomic booking engine before exposing a Book button or confirmed-booking-to-game conversion.

## 5. Acceptance checklist after configuration

- Sign up/confirm/sign in on both platforms; verify session restore and sign out. Confirm profile and per-sport settings survive an app restart.
- Upload supported avatar; confirm own-folder writes work and another user's folder cannot be written/deleted. Verify signed photo URLs and the actual managed bucket's size/MIME enforcement.
- Change city/area and GPS radius; verify venue/game filters. Deny GPS permission and confirm manual selection still works.
- Insert a real authorized venue/court/schedule; check public listing/details and published-hours view. Verify booking/slot controls remain disabled and no Google listing is asserted live.
- Create a game with an external/unverified booking and valid format. Join from another real account, request approval in another game, accept/reject only as host, edit/cancel and leave/withdraw.
- Exercise last-spot requests from separate real clients against hosted PostgreSQL; confirm no duplicate or excess participants. Local embedded tests do not certify multi-connection load.
- Verify a regular user gets 403 for hub/admin access; privately assigned memberships work. Dashboard design examples remain disabled and explicitly labeled.
- Run browser/device visual, keyboard, safe-area and touch checks against design references. Validate CORS and deployed HTTPS. Inspect all future API additions for direct-REST/RLS bypasses.

Full roadmap: FEATURES.md. Schema design: SCHEMA.md. API: API.md. Current verification evidence: VERIFICATION.md.

## Vercel backend

Use [VERCEL-BACKEND.md](VERCEL-BACKEND.md) for the backend root/Express settings, private environment variables, transaction pooler, production account restrictions and notification polling. Never copy the development .env to a public deployment.
