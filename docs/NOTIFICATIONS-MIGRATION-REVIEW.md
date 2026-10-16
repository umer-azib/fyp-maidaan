# Migration 010 review and notification deployment

File: supabase/migrations/202610150010_notifications.sql.

The additive migration has passed an isolated PostgreSQL test applying 001-010. Two separate cookie sessions exercise booking, public discovery, join/reject/re-request/approve, authorization, actual SSE delivery to the host and guest, recipient isolation, mark-read and persistence across login. Hosted read-only preflight returned ready-additive. Explicit user approval ("Approve migration 010") was received; migration 010 was applied atomically to the configured hosted development database. A subsequent check returned already-applied. Checksum: 4fa468421d013022c05675e5448b178201137eefc1fc885b196d817ad309d304.

## Scope and safety

- Adds notifications, indexes, private trigger functions and triggers on future booking/game/request/participant/invitation mutations.
- Does not alter existing columns, replace membership/booking procedures, backfill notifications, modify seeded records, reset data or grant client database access.
- Foreign keys retain game/booking/profile relationships. RLS enabled; PUBLIC/anon/authenticated table and function privileges revoked. Only the trusted private Express connection accesses records.
- API identity always comes from the authenticated opaque session. List/read/SSE queries are recipient-scoped; clients cannot submit a recipient ID.
- Trigger inserts share the booking/game transaction: rollback/unauthorized/capacity failures do not create successful-action notifications.
- Existing authenticated server-side game mutations retain their row locks/capacity/host checks. Booking exclusion constraints and owner scheduling authority are unchanged.
- Applies atomically under an advisory lock, with a separate incremental checksum ledger. Refuses an existing untracked notifications table or a checksum mismatch. Does not rerun 001-009.
- New foreign keys intentionally make unsafe fixture cleanup refuse deletion if notification history references fixtures. Do not disable that guard or reseed/reset this deployed dataset.

## Commands (backend directory)

Read-only check:

```powershell
npm.cmd run db:notifications:check
```

After explicit user approval only:

```powershell
npm.cmd run db:notifications:apply
```

AGENTS.md requires explicit approval for remote migrations. No destructive migration or cleanup is proposed. Confirm a backup/target project through the normal operator workflow before applying; credentials remain in backend/.env and are never printed. If application fails, the transaction rolls back. Rolling back an already deployed notification history is not automatic: disable the new feature/review a forward fix rather than dropping records.

## Live mechanism

GET /v1/notifications/stream uses authenticated Server-Sent Events with Last-Event-ID/after replay. It scans persisted recipient records every two seconds, sends unread-count heartbeats, revalidates session/account status every 15 seconds and reconnects after 30 minutes. Maximum four streams per account per server process. Browser EventSource uses HttpOnly cookies; native-compatible requests may use the existing mobile bearer authentication. No privileged key/token is passed in the stream URL.

Browser fallback polls notification records every 15 seconds while SSE is unhealthy. Live arrivals refresh games, pending requests, active detail and dependent views. Stored notifications survive refresh/logout. No email/push/browser-local fake notifications are generated. This is low-latency database scanning over SSE, not PostgreSQL LISTEN/NOTIFY; scale tuning is a future operational step.

Hosted two-player HTTP/SSE acceptance passed after deployment; see LIVE-NOTIFICATION-RESULTS.json. Real browser rendering remains unverified because browser automation surfaces were unavailable.
