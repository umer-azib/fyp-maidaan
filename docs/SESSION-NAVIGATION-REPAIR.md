# Session and navigation repair — 2026-10-15

## Root cause and repair

The ignored web/.env used VITE_API_URL=http://localhost:5000 while the requested web origin is http://127.0.0.1:5173. Different hosts are different cookie sites; HttpOnly SameSite=Lax cookies cannot be relied on for cross-site fetches. The API correctly enforced authentication. Its shared fetch client already used credentials:include and CORS already accepted the 127.0.0.1 origin. No authorization bypass or weaker cookie policy was needed.

The local web configuration now uses http://127.0.0.1:5000. Vite's served services module was checked and contains this URL. Login now verifies /auth/session before exposing a signed-in identity, so a password response alone cannot produce a misleading authenticated navbar. Protected-request 401 responses invalidate real account state; a 403 does not log out a valid account. Route readiness also waits for matching account/store identities. Real account login is the initial mode even if UI demo previews are enabled.

The original profile error UI mixed failed profile loading with a Sign in link; it now shows data status/retry without pretending loading is authentication. Player directory requests settle independently, with real loading/errors/empty states. Review failures no longer silently appear as zero reviews.

## Routes

All items have their own route and active NavLink. Desktop navigation collapses; the mobile drawer opens from the header and scrolls. Workspace switching links are removed; owner/admin layouts remain server-permission gated. Backend scopes owner records independently of frontend navigation.

- Player: /player overview; /player/venues; /player/games; /player/map; /player/bookings; /player/my-games; /player/players; /player/connections; /player/messages; /player/reviews; /player/profile; /player/settings.
- Owner: /hub overview; /hub/venues; /hub/courts; /hub/schedule; /hub/bookings; /hub/games; /hub/customers; /hub/reviews; /hub/analytics; /hub/promotions; /hub/settings.
- Admin: /admin overview; /admin/players; /admin/venues; /admin/approvals; /admin/courts; /admin/bookings; /admin/games; /admin/reviews; /admin/reports; /admin/content; /admin/catalog; /admin/audit-logs; /admin/settings.

Messages, promotions and dedicated account settings are explicitly Coming Soon. Maps remains the existing unconnected layout, not a real map. Analytics/customers retain the existing actual-record summaries/reservation lists; period-based analytics, a dedicated customer CRM and full scheduling calendar remain incomplete. Court Schedule exposes the working weekly schedule editor. No invented metrics or sales are introduced. Legacy admin/users, admin/moderation and hub/reports URLs redirect to their current destinations.

New read endpoints: GET /hub/games and /hub/reviews scoped by venue_managers; GET /admin/reviews and /admin/audit-logs gated by require_admin. No schema migration was needed.

## Actual live HTTP checks

Against the running local Express server and hosted seeded database, using web-client headers, an exact allowed Origin and a real cookie jar:

| Check | Result |
|---|---|
| Database player login; subsequent session lookup | 200 / 200 |
| Player profile, games, players, My Games, bookings, connections, permissions | All 200; connections genuinely empty |
| Owner login, profile, hub access, venues, bookings, overview, games, reviews | All 200 |
| Owner records | 1 venue, 2 courts, 18 weekly windows per court, 16 bookings, 8 games, 2 reviews |
| Owner 01 reading Owner 02's restricted booking/game | 403 FORBIDDEN: Venue manager required |
| Owner accessing admin access/audit endpoints | 403 FORBIDDEN: Administrator required |
| Wrong password | 401 INVALID_CREDENTIALS |
| No-session profile lookup | 401 UNAUTHORIZED |
| Logout, then session lookup | 200, then 401 UNAUTHORIZED |
| CORS preflight | 204; exact 127.0.0.1:5173 origin and credentials=true |
| Served Vite services module | Uses 127.0.0.1:5000 |

These are HTTP integration checks, not browser-cookie or rendered-layout tests. No schema, seed or business data was changed. Only authorized login/session/logout activity was performed remotely. Existing backend terminal logs were not accessible through these tools; response codes/messages and request IDs were inspected. No 500 occurred in the exercised live requests.

## Automated results

Final backend suite: **20/20 passed**. Web lint/build (including TypeScript), backend lint/typecheck/build, and shared game-domain self-check all passed. Tests include real admin-list success against disposable local PostgreSQL, not a hosted fixture admin.

## Browser/device verification still required

Computer Use inventory returned zero browsers/apps; opening Chrome and the in-app browser both returned Browser is not available. No browser screenshots or rendered interactions were captured during this repair. No Playwright/browser success is claimed.

Manual acceptance:

1. Open **http://127.0.0.1:5173/player/login** (do not mix localhost). Sign in with dev_player_01 / MaidaanDev!2026 using normal account login. In browser Network verify login and /auth/session are 200, then profile/games/players requests are 200. Cookie must remain HttpOnly/SameSite=Lax. Use the existing backend on port 5000; restart Vite if its configuration is cached.
2. Visit every Player sidebar item listed above. Refresh /player/profile and /player/my-games; verify Ali Raza and saved sports load, then open a game and a venue/court/date. Do not submit bookings or edits merely to test navigation.
3. Check Connections' genuine empty state, Reviews, and clearly labeled Messages/Settings placeholders. Confirm no cross-workspace links remain.
4. Logout; revisit protected URLs and use Back/Refresh. They must require login. Test a wrong password and verify the displayed error. Removing/invalidating the session then loading a protected API page must clear client access without loops.
5. Sign in at /hub/login with dev_owner_01 / MaidaanDev!2026. Visit all owner links. Court Schedule must show saved weekly windows; Bookings only the managed venue. Do not save changes as part of this read-only verification.
6. At viewport widths 390, 768, 1024 and 1440, check no overflow, drawer open/close, sidebar scrolling to Settings, desktop collapse and selected-link styling. Browser keyboard/visual verification is pending.
7. /admin must require real admin membership. No fixture admin exists. Do not use UI-only admin/admin to claim live admin verification.

## Trusted administrator provisioning (instructions only)

Register a real non-fixture account through the application. A trusted database operator verifies its identity and grants membership privately, with an audit record. There is no public role-assignment endpoint. The following is a reviewable template, **not executed**:

```sql
begin;
do $$
declare target uuid;
begin
 select id into strict target from app_private.accounts
 where email='REPLACE_WITH_APPROVED_ADMIN_EMAIL'
   and status='active' and not is_development_fixture and password_hash is not null;
 insert into public.admin_memberships(user_id) values(target) on conflict do nothing;
 insert into public.audit_logs(action,entity_id)
 values('admin.provision.trusted_operator',target);
end $$;
commit;
```

Use the resulting account at /admin/login. Never give fixture accounts administrator membership or create a shared admin password. Actual admin-browser acceptance remains blocked until an authorized account and browser are available.

## Changed source/configuration

- shared/account-client.ts, shared/api.ts, shared/player-store.ts: persisted-cookie validation, invalidation handling.
- web/src/services.ts, store.tsx, live.tsx: real auth synchronization, correct login mode/statuses and discovery links.
- web/src/App.tsx, App.css, navigation.ts: complete responsive navigation/routes, overview and explicit deferred pages.
- web/src/social.tsx, operations.tsx, workspace-records.tsx: independent community data states, own connections/reviews, schedule/admin court sections, scoped workspace lists.
- backend/src/application.ts: authorized read endpoints only.
- backend/test/account-client.test.ts, application.test.ts, navigation.test.ts, seed.test.ts: regression checks.
- web/.env (ignored, API host only), web/.env.example, backend/.env.example: consistent local host/port examples.
- docs/FEATURES.md, SETUP.md, VERIFICATION.md and this report: current deployment evidence and remaining checks.

No migrations or seed implementation changed. No Google Maps, weather or AI work started.
