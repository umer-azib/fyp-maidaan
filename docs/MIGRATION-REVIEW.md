# Migration review — 001 through 009

Reviewed 2026-10-15. **No remote migrations or seed operations were executed.** The nine-file chain passed against isolated PGlite PostgreSQL with managed Auth/Storage compatibility stubs; provider permissions and actual Storage remain deployment checks.

## Order and compatibility

Apply ascending filenames, 202610150001 through 202610150009, as one transaction using the reviewed runner. Do not expose an intermediate schema to clients.

| Migration | Purpose / review |
|---|---|
| 001 core | Profiles, locations, venues, courts, schedules, bookings, games, social/CMS foundations; foreign keys, checks, unique memberships and GiST booking exclusion |
| 002 storage | Avatar bucket/policies; requires managed Storage schemas and policy privileges |
| 003 discovery | Location/discovery functions and Lahore catalogue |
| 004 application_accounts | Custom accounts and hashed sessions; copies legacy identities, replaces profiles' auth.users FK, scopes server identity, revokes client table/function privileges |
| 005 booking_operations | Owner/admin checks, slot generation, reservations, schedule conflicts, booking actions and booked-game creation |
| 006 content | Validated CMS content, administration and activity aggregates |
| 007 venue_media | Private venue-media bucket and scoped media/document access |
| 008 social | Attendance-eligible reviews, connections, invitations, blocking, moderation and game-action wrapper |
| 009 recurring_games | Recurrence and replacement fields/functions; completes dependencies referenced by 008 |

004 now includes `accounts.is_development_fixture default false`. This is a **fresh baseline change**, appropriate to the reported empty schema. Do not replay this modified baseline over an existing deployed installation; that needs a separately reviewed incremental migration. The runner records checksums and rejects changed/partial histories.

Application login uses bcrypt and private Express sessions, not Supabase Auth. Original Auth foreign keys are transitional and replaced by 004; existing legacy identities retain UUIDs but receive no invented password. `auth.uid()` remains a SQL compatibility accessor for the transaction-local identity set by Express after session validation. Never accept that identity from a request field or expose the private connection to clients. Supabase Auth/Storage managed objects and anon/authenticated roles must still exist even with zero public tables.

## Integrity and permissions

Bookings use a half-open time-range GiST exclusion for active reservations. Reservation functions lock courts, derive actual slots, and check venue approval. Completed reservations also remain protected against historical overlaps. Court blocks and schedule edits use guarded procedures; existing booking conflicts fail rather than overwrite. Capacity is enforced by locked game mutation procedures, with unique game/player memberships. Host permissions are per game; there is no Captain role.

Owner operations verify venue_managers; admin operations verify admin_memberships and active accounts. RLS/client privilege revocations protect direct client access. Express's private connection must have appropriate owner/BYPASSRLS privileges and must enforce request scopes; do not use a public Supabase client key for database calls. Privileged raw SQL can bypass procedure-level capacity/review rules, so keep credentials server-only.

No administrator is seeded or publicly registerable. Provision a real administrator only through the existing trusted backend process, separately from fixture accounts. Storage API uploads additionally need server-only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; database migrations do not prove HTTP uploads work.

## Deployment gates

- Confirm this is the intended empty project and take a backup before deployment. No remote write is approved by this review.
- Managed auth.users, auth.uid(), storage.buckets, storage.objects, storage.foldername(text), anon and authenticated must exist.
- Migration principal needs schema/table/function/Storage-policy ownership privileges and permission to install btree_gist. These privileges have not been checked remotely.
- Broad public table/function revocations assume a dedicated application schema. The runner rejects existing public tables/views, unrelated public functions and unexpected app_private state instead of modifying them.
- Existing Storage bucket IDs/policies must be reviewed for ownership/collisions. Keep both buckets private.
- booking_holds is not a live hold/expiration worker. No payment or notification delivery is introduced by fixtures.

From backend (PowerShell), this checks prerequisites read-only:

```powershell
npm.cmd run db:migrate:check
```

**Only after explicit deployment approval**, apply the whole chain atomically:

```powershell
npm.cmd run db:migrate -- --apply
```

Both commands use DATABASE_URL from backend/.env without printing it. Failure rolls back the application migration transaction. A matching complete checksum ledger is a no-op; partial or mismatched state requires review. Do not mix this runner with an untracked manual partial deployment or blindly run supabase db push.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage schema](https://supabase.com/docs/guides/storage/schema/design), [PostgreSQL extensions](https://www.postgresql.org/docs/current/sql-createextension.html).
