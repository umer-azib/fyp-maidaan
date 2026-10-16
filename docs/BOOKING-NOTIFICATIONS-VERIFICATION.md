# Booking, live notifications and profile verification

## Implemented
- Guided managed venue/court/slot selection, explicit booking confirmation and recruitment from owned confirmed bookings; separate unverified external-game form.
- Actual owner calendar reservations/customer details, pending/confirmed distinction, blocks, operating hours, manual reservation and cancellation/rescheduling controls.
- Recipient-scoped stored notifications, read/all-read endpoints and authenticated SSE. Two-second database scans, session revalidation every 15 seconds, reconnect/replay and 15-second polling fallback. No tokens in stream URLs.
- Shared mutation/live refresh, notification bell, reusable react-spinners RingLoader and reduced-motion-aware toast feedback; compact game tags.
- Server-only SUPABASE_SECRET_KEY preferred with legacy key fallback; persistent avatars, immediate shared-profile refresh, preview and removal controls.

## Database changes
Only 202610150010_notifications.sql was applied, following explicit user approval. Atomic deployment succeeded and checksum recheck reported already-applied. No seed/reset/backfill or existing migration changes. Adds notification table/indexes/private transactional triggers; existing booking locks/exclusion constraints and membership permissions remain intact. See NOTIFICATIONS-MIGRATION-REVIEW.md.

## Hosted verification actually performed
Two independent real web-cookie HTTP sessions: dev_player_01 and dev_player_02. Booking 201 confirmed; game creation 201; B public discovery succeeded; request/reject/re-request/approve all 200. Actual authenticated SSE delivered host request and guest rejection/approval/cancellation without refreshing. Both lineups became two players. Duplicate join 409, unauthorized approval 403, unauthenticated notification list 401. Guest notification history persisted after logout/login. IDs and exact outcomes: LIVE-NOTIFICATION-RESULTS.json. The test game was canceled; its court booking intentionally remains confirmed, preserving the separation between games and reservations. These are new acceptance records, not replacement seed data.

Profile upload on fixture Player A: actual PNG POST 201, signed URL downloaded successfully with matching SHA256 bytes, profile refetch and logout/login preserved the photo path. Invalid PNG bytes returned 400. Photo intentionally remains on the disposable fixture account. No privileged key, cookie or signed URL is recorded in evidence. Test asset: backend/test/fixtures/avatar-test.png.

## Files changed by this milestone
- backend/src/application.ts, index.ts; new notifications.ts
- backend/scripts/migrate-notifications.ts; backend/package.json; backend/.env.example
- backend/test/notifications.test.ts; backend/test/fixtures/avatar-test.png
- supabase/migrations/202610150010_notifications.sql
- shared/api.ts, contracts.ts
- web/src/App.tsx, App.css, live.tsx, store.tsx, services.ts, ui.tsx, bookings.tsx, owner-workspace.tsx, signup.tsx, operations.tsx, social.tsx, content.tsx
- New web/src/create-game.tsx, court-calendar.tsx, notifications.tsx, loading.tsx, feedback.tsx, feedback-events.ts, use-data-revision.ts
- web/package.json and package-lock.json
- docs/FEATURES.md, NOTIFICATIONS-MIGRATION-REVIEW.md, this report, LIVE-NOTIFICATION-RESULTS.json

## Browser and remaining acceptance
Browser automation inventory returned no enabled apps/browsers. No rendered interaction, screenshot or responsive acceptance is claimed. Hosted checks were API and real SSE checks, not UI end-to-end tests. Isolated PostgreSQL tests cover capacity, duplicate membership, permissions, booking conflicts and notifications.

Manual browser acceptance: use separate browser profiles at http://127.0.0.1:5173. Sign in A/B with documented fixture credentials, book a free instant-confirmation court, recruit from that booking, discover as B, request/reject/re-request/approve, and observe the bell/lineup without reload. Inspect owner calendar for the same booking. Upload the PNG, confirm header/profile after refresh and relogin; try invalid files. Check layouts at 390, 768, 1024, 1440 and 1920px. Verify booking detail/manual reservation/reschedule and unavailable-slot rendering. Do not rerun live acceptance blindly: it creates genuine fixture-account reservations.

## Start commands (separate PowerShell terminals)
```powershell
cd D:\maidaan-umer\Maidaan-V2\backend
npm.cmd run dev
```
```powershell
cd D:\maidaan-umer\Maidaan-V2\web
npm.cmd run dev -- --host 127.0.0.1
```
Backend port 5000; web port 5173. Keep API URL and cookie origins on 127.0.0.1 consistently. Existing backend/.env provides DATABASE_URL, SUPABASE_URL and server-only SUPABASE_SECRET_KEY. Do not copy privileged keys into VITE_/EXPO_PUBLIC_ variables. Demo adapter must remain off for live acceptance.

## Final automated checks
Passed: web lint, production build and test:domain; backend lint, typecheck, build and all 25 tests (zero failures). Tests use isolated PGlite fixtures; the deployed dataset was not reseeded. Migration check reports already-applied. Compilation does not establish rendered UI correctness.
