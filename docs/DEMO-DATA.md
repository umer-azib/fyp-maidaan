# Lahore development fixtures

Development-only, fictional demonstration data using the real application schema. **Nothing has been applied remotely.** See [migration review](MIGRATION-REVIEW.md) for blockers and the complete order. This is separate from UI-only player/player, hub/hub and admin/admin preview authentication.

## Schema deployment

Use the existing private DATABASE_URL in backend/.env. Never put it in frontend configuration or a command argument. Confirm it targets a dedicated development database. The local environment flag cannot detect a production database mistakenly placed in DATABASE_URL.

```powershell
cd D:\maidaan-umer\Maidaan-V2\backend
npm.cmd run db:migrate:check
# STOP: obtain explicit approval before executing the following remote write.
npm.cmd run db:migrate -- --apply
```

The runner checks an empty application schema, managed Supabase dependencies and checksums; applies 001–009 atomically; and records a private ledger. It does not drop existing schemas. Storage HTTP credentials are unnecessary for seed records: fixtures have no uploaded photos/documents.

## Seed and verify (after schema approval/deployment)

```powershell
$env:NODE_ENV='development'
$env:MAIDAAN_ENABLE_DEV_SEED='true'
npm.cmd run seed:dev
npm.cmd run seed:dev:verify
```

Both flags are mandatory, including for cleanup and verification. Production and unset environments fail before connecting. The operation runs in a transaction under a dataset advisory lock. Stable UUIDs and a private per-record registry identify fixtures; collisions abort rather than overwrite existing records. Same-day reruns verify the dataset without duplicating or changing records. Its Asia/Karachi anchor is retained; on a later day cleanup/reseed explicitly refreshes the 21-day window rather than silently rescheduling reservations.

Court slots are calculated by court_slots from owner hours, blocks, closed weekdays and reservations. Timestamps represent UTC instants; schedules/display use Asia/Karachi. Two padel courts have a fully booked evening. Weekday/weekend windows, slot lengths, peak prices and closures differ. Pending/suspended venues publish no bookable inventory. No fake free-slot table, payments, email, push notifications or external APIs are used. The current migrations have no notifications table, so sample activity is recorded in audit_logs; notification fixtures are deferred until a real notifications schema exists.

## Expected counts

| Record | Count |
|---|---:|
| Accounts / profiles | 52: 40 players, 12 venue owners |
| Venues | 12: 9 approved, 2 pending, 1 suspended |
| Courts | 24: 6 per sport; player discovery exposes 18 approved courts |
| Areas | All 12 requested Lahore neighborhoods |
| Weekly schedule windows / blocks | 432 / 9 |
| Future bookings | 108: 90 confirmed, 12 pending, 6 cancelled; 5 offline included |
| Historical completed bookings | 24 |
| Games | 56: 24 open recruiting, 8 full, 24 completed |
| Pending join requests | 24 |
| Eligible reviews | 36: 24 player and 12 venue |
| Verified attendance / audit activity | 48 / 72 |

Free/booked/blocked slot counts are printed by verification and depend on the anchor weekday. The first tested run returned 3642 / 102 / 36. Capacity and remaining positions are derived from participant records. Reviews are submitted through real eligibility procedures against completed activities, not arbitrary ratings. Account email verification remains false.

Venues cover DHA Phase 6, Gulberg, Johar Town, Model Town, Bahria Town, Wapda Town, Garden Town, Cantt, Valencia, Lake City, Township and Faisal Town. Coordinates are approximate neighborhood test points, not verified business locations. Names, premises and account identities are fictional. No real business partnership is claimed. Missing Township/Faisal Town catalogue entries are inserted without overwriting existing records.

## Local development login

All fixture accounts use password **MaidaanDev!2026**, hashed using the application's bcrypt cost-12 helper. Usernames:

- Players: dev_player_01 through dev_player_40.
- Owners: dev_owner_01 through dev_owner_12; one corresponding venue each.
- Emails: maidaan.dev.player01@example.com (01–40), maidaan.dev.owner01@example.com (01–12).

Use the normal login form against the development backend. Restart backend with NODE_ENV=development. Owners 01–09 have approved venues; 10–11 pending; 12 suspended. Owners cannot manage other venues. Accounts have no admin membership; use a separately trusted real admin for aggregate dashboard inspection. Production backend rejects fixture passwords **and** existing fixture sessions. Database fixtures can exercise development API operations, unlike isolated UI demo accounts; never seed a production database.

## Cleanup only registered fixtures

Log out fixture sessions and stop concurrent fixture interactions first:

```powershell
npm.cmd run seed:dev:cleanup
npm.cmd run seed:dev
# Remove opt-in when finished:
Remove-Item Env:MAIDAAN_ENABLE_DEV_SEED
```

Cleanup locks affected tables and checks all incoming foreign keys. Unregistered sessions, uploads or added activity referencing fixtures cause refusal and complete rollback; review those records explicitly rather than bypassing the guard. Only registry-owned rows are deleted. Unrelated accounts/venues are preserved, shared location catalogue entries remain, and no tables are truncated. This deliberately prioritizes safety over automatic cleanup after arbitrary manual UI edits.

## Automated local verification

```powershell
npm.cmd run test:seed
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Tests use disposable local PGlite PostgreSQL, never DATABASE_URL. They execute all nine migrations and verify actual constraints, counts, 12-area coverage, linked profiles, free/booked/blocked slots, no overlaps, host/capacity consistency, eligible reviews, owner isolation, full-game rejection, suspended-venue rejection, production fixture-auth rejection, same-day idempotency, cleanup refusal for unregistered sessions and preservation of unrelated accounts. This does not establish remote provider privileges or real multi-connection lock behavior; validate those separately after approved deployment.
