# Current preview and testing update

Real sign-in now uses Express-managed PostgreSQL accounts, not Supabase Auth. Use CUSTOM-ACCOUNTS-AND-BOOKING.md for deployment. Local demo credentials/flags remain unchanged and production-disabled. Browser testing is now available through installed Chrome and npm.cmd run test:e2e in web; the suite uses an isolated PGlite database/API and records actual screenshots in docs/ui-qa. Historical statements below saying browser automation was unavailable describe the prior task only. No remote migration has been applied.

# Local demo login and UI regression checklist

No remote migrations, Google/weather integration, real admin grants or new Supabase users are part of this change. Backend JWT/membership verification remains unchanged. Demo accounts are local UI previews, not security principals.

## Start the preview explicitly

Flags default to false in the committed .env.example files. Set them only for a local development process. An absent/false flag keeps the existing Supabase path. Do not commit real .env values.

Stop a prior frontend instance first so port 5173 is available. Web, PowerShell:

```powershell
cd D:\maidaan-umer\Maidaan-V2\web
$env:VITE_ENABLE_DEMO_AUTH = 'true'
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Mobile, separate PowerShell:

```powershell
cd D:\maidaan-umer\Maidaan-V2\mobile
$env:EXPO_PUBLIC_ENABLE_DEMO_AUTH = 'true'
$env:EXPO_PUBLIC_WEB_URL = 'http://localhost:5173'
npm.cmd start -- --clear
```

For a physical phone, use your computer's reachable LAN web URL (and start Vite with --host 0.0.0.0). localhost on a phone means the phone, not your computer. No session, username, password or JWT is attached to the handoff URL; sign in separately on the web portal. Mobile owner/admin logins open the web login and retain an honest handoff screen; they do not simulate mobile dashboards.

The backend is not required for demo data. To test the unchanged real API separately:

```powershell
cd D:\maidaan-umer\Maidaan-V2\backend
npm.cmd run dev
```

The existing backend .env sets port 5000; fresh examples default to 3001. Stop a prior instance before starting another on the same port.

| Portal | Login route | Local username | Local password | Destination |
|---|---|---|---|---|
| Player | /player/login | player | player | /player |
| Venue owner | /hub/login | hub | hub | /hub |
| Admin | /admin/login | admin | admin | /admin |

Welcome routes: / and /welcome. Expo has matching role login paths plus the existing /auth alias for Player. Native Player opens /discover with its existing tabs. In a demo-enabled login page, choose **Use account sign in** for the preserved live email/password path; real registration remains Player-only. Switching to real sign in clears the demo session first.

## Isolation and persistence

- Enabled only by Vite DEV + VITE_ENABLE_DEMO_AUTH=true, or Expo __DEV__ + EXPO_PUBLIC_ENABLE_DEMO_AUTH=true. Production/release ignores a true flag and ignores stored demo sessions.
- shared/demo-auth.ts stores only a typed local role/ID, no password or token. Web sessions use sessionStorage (per tab, survives refresh); Expo uses its separate AsyncStorage key. It never calls Supabase Auth.
- shared/demo-api.ts owns sample data and local mutations. shared/player-store.ts is reused with a separate local instance. Profile, game creation/join/request/management actions in demo never reach Express/PostgreSQL.
- The live API transport rejects active demo sessions before retrieving a real token, including when an unrelated real Supabase session exists. Storage uploads and GPS lookup are disabled for demo profiles; sample coordinates are not a live nearby search. Real Supabase sessions remain a separate identity; demo logout does not revoke a pre-existing real account's Supabase session.
- Role guards allow each demo account only its own portal. Cross-role access displays Access required, with an account-selection exit rather than redirecting between protected dashboards. Real owner/admin access still requires backend membership checks.
- Sample game/profile mutations are in memory and reset on a full app/page reload. The demo login survives reload. Logout removes the local session; subsequent refresh/back/deep links cannot use that demo access.
- The Player profile is Player One, initials avatar, Lahore / DHA Lahore, Badminton and Padel at Intermediate skill. History/statistics are labeled samples. Mock venues are explicitly named samples. Booking and unfinished owner/admin operations stay disabled design previews.

## Automated results

Run the regression suite:

```powershell
cd D:\maidaan-umer\Maidaan-V2\backend
npm.cmd run typecheck
npm.cmd test
cd ..\web
npm.cmd run lint
npm.cmd run build
npm.cmd run test:demo-production
cd ..\mobile
npm.cmd run typecheck
npm.cmd run lint
```

backend/test/demo.test.ts covers opt-in flags, production exclusion, all three credential/role combinations, invalid passwords, refresh/restore, malformed persisted sessions, logout races, local Player sample data/actions, no live fetches despite a real token being available, and safe mobile handoff URLs. Existing API tests also reject demo/password strings as bearer credentials. A second check compiles the actual Vite services module in production with the demo flag forced true, imports that artifact, and verifies demo restore/login stay disabled. These are automated policy/data regressions, not browser click tests.

## Manual rendered tests — required at 1440, 768 and 390 px

Browser/device automation is **unavailable**: the connected surface inventory has no browsers or native apps. No rendered interaction, screenshot, pixel comparison or visual pass is claimed. Screenshots in design/screenshots were inspected as style references; no .fig parsing. Complete the following in a browser using developer tools' responsive viewport, height about 900px (844px for 390px width). Save screenshots for each row at all three widths and inspect the console/network panel.

| Screen | Exact checks |
|---|---|
| Welcome /welcome | Three-line headline; exact new subtitle; three account cards and distinct login routes. No Browse venues first/footer/payment disclaimer. Preserve purple, white/gray surfaces, rounded cards, typography and photo. Check no horizontal scrolling and keyboard focus. |
| Player login /player/login | Back returns to welcome. Empty fields validate. Show/Hide toggles password. player/wrong shows Incorrect username or password. player/player opens Player. Logout is available from the dashboard. |
| Venue owner login /hub/login | Back, username/password, Show/Hide and loading/error state. player/player and hub/wrong fail. hub/hub opens hub preview only. |
| Admin login /admin/login | Same states. hub/hub and admin/wrong fail. admin/admin opens admin preview only. |
| Player dashboard /player | Sample-data badge, location selectors, sample venue cards, tabs and Logout. Confirm no /v1 requests while using demo. |
| Venue owner /hub | Local preview badge, coherent overview/courts/venues navigation; unavailable management buttons disabled, no fake successful bookings. Logout accessible at all widths. |
| Admin /admin | Local preview badge; users/venues/games/approvals navigation works; unfinished actions disabled; Logout accessible. |
| Player profile /player/profile | Player One/avatar, Lahore/DHA Lahore, Intermediate Badminton/Padel, explicitly sample stats/history. Local profile edit/save works; upload disabled. |
| Venue discovery and /player/venues/demo-rally | Two sample venues; court cards and date controls; local detail API; no real availability, phone calls or booking claims. |
| Open games /player/games | Sport/search filters, detail links; join football, request cricket, manage your badminton requests. My Games updates. No remote API writes. |
| Create /player/create | Empty validation; choose sport/format/capacity, venue/location, future time. Create opens local details. Edit/cancel and leave/request withdrawal affect local data only. |
| Responsive navigation | At 1440px rail/content layout; at 768px no field/card clipping; around 390px five-item player navigation, readable labels, cards and scrollable forms. Check dialogs, touch targets, focus and reduced-motion preference. |

Route/security sequence (repeat independently for each account; use Logout between them):

1. Fresh tab, no session: directly open /player, /hub and /admin → respective login pages.
2. Player demo: /hub and /admin → Access required. Back to /player still works.
3. Hub demo: /admin and /player → Access required. Hub navigation remains available.
4. Admin demo: /player and /hub → Access required. Admin-only preview paths remain navigable.
5. Refresh each valid dashboard and detail route. Back to login/welcome must not loop or claim a new login automatically.
6. Logout, then refresh and use browser Back to protected routes → login/denied, never restored demo access.
7. Network panel: no Express or Supabase mutation requests during demo actions; try Authorization: Bearer demo-admin against the real backend → rejected, never admin data.
8. Stop the dev server. Run npm.cmd run build with the flag still true, then npm.cmd run preview. Demo forms must be absent; saved preview sessions ignored. Real Supabase login must remain available (hosted data still needs the migration step).
9. Expo: exercise the same Player flow; test three login screens, logout and hardware back. Owner/Admin must open the configured web login, not a fabricated native dashboard.

Before the Supabase migration step: finish this manual visual/device checklist; keep demo flags off for live acceptance and release; review the existing SQL migrations and real-account Auth/Storage acceptance steps in SETUP.md. Do not apply migrations as part of demo testing.
