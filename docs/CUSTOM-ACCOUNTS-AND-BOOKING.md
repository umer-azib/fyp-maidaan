# Application accounts and managed booking

This supersedes the old Supabase Auth setup. No remote migrations have been applied. Source functionality is connected through Express and validated against isolated PostgreSQL (PGlite); this is not a hosted deployment claim.

## Configuration

Server-only DATABASE_URL must be a Supabase PostgreSQL direct/session-pooler URI with provider TLS certificate verification. Never disable certificate verification or expose database credentials to a client. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are server-only Storage configuration, not application authentication. CORS_ORIGINS contains exact browser origins. Use the same hostname consistently (localhost versus 127.0.0.1). Deploy web/API on the same site with HTTPS and NODE_ENV=production; cross-site third-party cookies are unsupported.

Clients now need only VITE_API_URL or EXPO_PUBLIC_API_URL. Expo portal handoff needs EXPO_PUBLIC_WEB_URL. Old public Supabase variables are unused. Existing ignored .env files were preserved; .env.example files document the new requirements. No credentials are fabricated.

## Reviewed migration sequence

Back up and inspect existing migration history/table collisions first. Never reset a database or re-run an applied migration. For a fresh Supabase project, review and apply through a trusted SQL Editor/migration workflow, in order:

1. supabase/migrations/202610150001_core.sql: original schema, transitional auth.users foreign key.
2. 202610150002_storage.sql: private avatars bucket.
3. 202610150003_discovery.sql: location/discovery procedures.
4. 202610150004_application_accounts.sql: private accounts/sessions; replace profile identity FK; revoke direct client table/function access and old avatar policies.
5. 202610150005_booking_operations.sql: approvals, schedule overlap constraint, atomic booking/actions, booking-game protection and controlled rescheduling.
6. 202610150006_content.sql: targeted announcements/events and feature-flag records.
7. 202610150007_venue_media.sql: private venue/court photos and ownership documents.
8. 202610150008_social.sql: connections, blocking, invitations, automatic waitlists, verified attendance, eligible reviews and reports.
9. 202610150009_recurring_games.sql: external weekly series, replacement flags and private/public creation.

Projects with 001-003 already applied need only the reviewed upgrades. Migration 004 preserves legacy profile UUIDs and relationships, but imports no application passwords. Legacy Supabase Auth passwords/JWTs are not accepted. Existing usernames/emails must satisfy the new unique constraints; collisions stop migration for review. Arrange trusted account recovery before a real cutover. A public password-reset/email-verification process is still incomplete.

Apply the transition during maintenance before exposing the replacement API. Do not leave clients pointing at the transitional 001-003 schema. No application automatically executes SQL. Use a properly scoped backend database login, secret management, provider TLS and backups before deployment.

No venue is seeded. Owners submit actual facilities, configure courts/hours/prices, and await administrator approval. Existing verified venues require explicit booking approval. Places listings cannot acquire bookable inventory through discovery alone.

## Administrator provisioning

First create a real application account. A trusted database operator must privately add that actual UUID to admin_memberships and record an audit_logs action in a reviewed transaction. There is no public admin signup or role-assignment endpoint. Do not add demo identities. No provisioning script was executed or delivered in this change; automatic approval review rejected the combined command containing that script.

## Session and account behavior

Passwords use bcrypt cost 12, random salts, minimum ten characters and a 72-byte UTF-8 maximum. Login accepts email or username. Authentication attempts are IP rate-limited. Sessions use 256-bit random tokens; PostgreSQL stores SHA-256 digests only. Web gets an HttpOnly, SameSite=Lax cookie (Secure in production), never a token in JSON. Expo native stores its bearer in SecureStore, never AsyncStorage. Inactivity expires after seven days, bounded by thirty days absolute. Renewal rotates the token without resetting the absolute maximum. Logout revokes the session. Account suspension is checked on every protected request.

Signup saves the Player profile, sport skills/formats, preferred areas, optional birth date and weekly availability transactionally. Optional photo upload follows account creation. If Storage fails, the account already exists: retry the remaining upload or sign in and edit the profile. Owners keep Player profiles. Their applications start pending; only their own facilities can be managed. Documents are private to authorized owners/admins. Managed Storage HTTP processing and physical SecureStore acceptance still need external verification.

## Booking rules

Times display in Asia/Karachi. Separate operating windows support weekdays/weekends and peak/off-peak prices. Windows cannot overlap; split overnight opening at midnight. Slots derive from approved published schedules, prices, reservations and closures up to ninety days ahead. Pending/confirmed reservations both occupy inventory. Court locks coordinate online/offline reservations, closures and schedule edits; exclusion constraints provide a second defense. No online payment or temporary hold is claimed.

Removing a reserved time from a schedule is rejected. Conflicting closures are rejected. Controlled rescheduling checks new availability in the same transaction, preserves the customer and cancels attached recruitment rather than silently moving players. Paid reservations require payment resolution first. Cancelling a booking cancels its game. Booking games inherit court/sport/time; editing a game cannot extend the court reservation. Estimated per-player costs are informational, not collected or settled payments.

Instant Join waitlists promote the oldest eligible waiting player under the game lock. Approval games promote to a request, preserving host approval. Player reviews need both players' venue-verified attendance in a completed managed game. Venue reviews need an eligible completed booking/attendance. Self and duplicate visit reviews are rejected. External games cannot fabricate verified attendance.

## Start existing apps

Run each in a separate PowerShell terminal:

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

The existing local backend uses port 5000; fresh templates use 3001. Match API URLs/CORS. Physical phones need reachable LAN addresses. A custom native client needs rebuilding for SecureStore; JS export is not a device build.

Optional local previews require VITE_ENABLE_DEMO_AUTH=true or EXPO_PUBLIC_ENABLE_DEMO_AUTH=true plus development mode. Credentials remain player/player, hub/hub, admin/admin. Production ignores the flags. Preview accounts cannot access protected live APIs; booking/social mutations remain disabled. Native owner/admin access opens the web portal without transferring credentials.

## Verification boundary

Playwright uses installed Chrome, test-only PGlite API on 3007 and Vite on 5178, never DATABASE_URL. Screenshots are in docs/ui-qa. Fixtures are synthetic test records, not real venue listings. SQL/API tests include competing booking requests, but PGlite serializes connections: deployed multi-connection contention is still an acceptance gate.

Remaining work is recorded in FEATURES.md: hosted deployment, actual Storage round-trips, physical-device QA, account recovery/verification, advanced owner staff/occupancy/calendar reporting, complete native social coverage, notifications/chat, Maps/Places/weather, full CMS content types and feature-flag enforcement, and production delivery. Do not mark all ten phases complete.
