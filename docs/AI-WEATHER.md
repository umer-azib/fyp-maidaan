# Maidaan AI and weather MVP

## Implemented scope

Gemini extracts a validated intent, sport, area, date, time and part of day. Express produces the answer and result cards from parameterized, read-only queries using the existing `discover_games`, `discover_venues` and `court_slots` PostgreSQL functions and existing profile/participation data. No generated SQL, model-supplied record IDs, generated prices, automatic joins or reservations. Database fixtures are visibly labeled. Relative dates use the current `Asia/Karachi` date; exact times filter exact Pakistan-local start times. Unknown areas and no matches return honest empty results, without broadening the search silently.

The player header has a floating Maidaan AI panel, a once-per-tab/session greeting, suggested prompts, RingLoader/typing feedback, minimize/close/expand controls and shared in-memory conversation state across player pages. `/player/ai` provides the expanded view. Motion uses its smaller DOM animation feature bundle and respects reduced-motion settings. A local Sparkles icon is used instead of downloading a Lottie asset or adding a package without a suitable local animation. Hub/admin do not render the assistant.

Expo has six native tabs: Discover, Map, Create, My Games, AI, Profile. The AI screen uses the same authenticated endpoint and result contracts, native Animated/ActivityIndicator, reduced-motion settings and existing SecureStore-based sessions. No web Motion or RingLoader DOM component is used in React Native. Public player results open a small native profile reader; game/court results open existing flows.

Open-Meteo provides current Lahore conditions and location/start-time-specific game forecasts: temperature, precipitation probability, weather conditions and wind. Cached for ten minutes per coordinate pair, with a bounded 100-entry process cache and eight-second provider timeout. Missing/out-of-range forecasts stay unavailable; current weather never substitutes for a missing future forecast. Outdoor rain/heat warnings are dismissible once per game/hour in browser session storage. Outdoor hints use venue amenities and field sports, not a verified court-specific indoor classification. Forecasts are estimates, not guaranteed playing conditions.

## API contract

- `POST /v1/ai/chat`: existing real web cookie or native bearer authentication, existing origin/header checks, plus 12 assistant requests/minute/account. Body: `{message, cityId?: "lahore", areaId?: string|null, gameId?: UUID}`. Message: 1-1000 trimmed characters. Response: `AssistantReply` in `shared/assistant.ts`: deterministic answer, parsed filters, actual result cards, optional weather and search timestamp.
- Required public spelling `POST /api/ai/chat` returns **307** to `/v1/ai/chat`. This preserves the request body and existing `/v1` HttpOnly cookie scope without changing authentication. Both clients use the canonical `/v1` API through their shared client. Native bearer access through `/api` and redirect was verified live. A request without a valid session cannot obtain results.
- `GET /v1/weather`: authenticated current Lahore weather.
- `GET /v1/weather?gameId=UUID`: existing game visibility/authorization check before reading venue coordinates and start time. Private/inaccessible/nonexistent games return 404 through the existing service.
- Provider failures return 503 with ordinary-language messages; no key, SDK response or internal prompt is returned. Missing Gemini key fails closed. No demo account can call live AI/weather services.

Only the user's current question and location catalogue/context are sent to Gemini. Profiles, passwords, sessions and database search results are not sent to the model. Chat history is memory-only and is cleared when its dashboard session unmounts.

## Navigation and confirmation

Game cards open `/player/games/:id` (native `/game/:id`). Court cards open `/player/venues/:venueId?court=:courtId&date=YYYY-MM-DD&time=:startsAt` (native `/venue/:venueId` with the same parameters). The venue validates the court belongs to its loaded record. BookingPicker uses the date, marks the suggested time, reloads genuine availability, and requires the normal slot selection and confirmation. A suggestion cannot hold/book a slot or bypass transactional conflicts. Courts may become unavailable between chat and confirmation.

“Near me” uses the current selected city/area. This MVP does not add GPS ranking, Google Places, conversational follow-up memory, voice, chat history storage or AI agents. From game details, weather questions include the current game ID. From elsewhere, “my game” asks the user to open its details rather than guessing which game they mean.

## Configuration and start

`backend/.env` (ignored, server only):

```dotenv
GEMINI_API_KEY=your-server-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

The existing configured key was tested successfully with that default Flash-Lite model. The model remains configurable; unsupported/inaccessible models produce 503. Open-Meteo's free forecast endpoint does not require a key for this development MVP. Review provider terms/quotas before commercial deployment.

Run in separate PowerShell terminals:

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
npm.cmd start
```

Web: `http://127.0.0.1:5173/player/ai`; API: port 5000. Native devices need the existing `EXPO_PUBLIC_API_URL` set to the computer's reachable LAN API address. Never copy `GEMINI_API_KEY` or Storage/private database keys into web/native environment variables. Restart Express after changing server environment values.

## Actual verification

See `AI-WEATHER-LIVE-RESULTS.json` for dated hosted/provider evidence. Real fixture login, at least three natural-language searches, correct existing game IDs/player counts, actual free court slots/PKR prices, game/court destination HTTP responses, location-specific game weather, real Open-Meteo response and repeated cached timestamp were checked. No booking, game, notification, profile or seed records were changed; only normal test sessions were opened/logged out. The far-future no-results scenario returns an empty list; no matches are invented.

An isolated process using the real SDK/key and an intentionally invalid model confirmed actual provider failure maps to `503 AI_UNAVAILABLE`. The running server's configuration was not changed. Automated tests additionally cover missing key, simulated provider failure, strict input/filter validation, unauthenticated access, unknown area, no results, card URLs/preselection, forecast caching, failed/invalid weather responses, unavailable forecast dates and rain/heat warnings. Existing auth/booking/notification tests remain part of the full backend suite.

Automated commands:

```powershell
cd D:\maidaan-umer\Maidaan-V2\backend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Repeat read-only live provider verification (requires the existing development fixture password; do not put it in committed files):

```powershell
$env:NODE_ENV='development'
$env:MAIDAAN_AI_TEST_PASSWORD='<documented fixture password>'
npm.cmd run test:ai:live
```

Web: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test:domain`, `npm.cmd run test:demo-production`. Mobile: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd exec -- expo export --platform web`. Expo web export verifies bundling/static routes, not Android/iOS behavior.

## Not visually verified

Browser automation inventory returned no enabled apps or browsers. No browser/device interaction, animation, keyboard, responsive screenshot or tap acceptance is claimed. Source references inspected: design/contact-sheet.png and the full-resolution original Chat Screen.png. Manual acceptance remains: real login; icon on every player page; greeting auto-dismiss; open/minimize/close/expand; state retained on navigation; no icon in hub/admin; both result actions and date/court preselection; forecast warning dismissal; 390/768/1024/1440px layouts; Expo AI tab, keyboard, result taps and reduced-motion on a device. No screenshots were fabricated.

## Files

- Added: `backend/src/assistant.ts`, `backend/src/weather.ts`, `backend/test/assistant.test.ts`, `backend/scripts/verify-assistant.ts`, `shared/assistant.ts`.
- Added: `web/src/assistant.tsx`, `web/src/weather.tsx`, `mobile/src/assistant.tsx`, `mobile/src/app/(tabs)/ai.tsx`, `mobile/src/app/player-profile/[id].tsx`.
- Updated wiring: `backend/src/application.ts`, `backend/src/app.ts`, backend environment example/package files; `web/src/App.tsx`, `App.css`, `navigation.ts`, `ui.tsx`, `feedback-events.ts`, `live.tsx`, `bookings.tsx`, web package files; `mobile/src/components/maidaan-ui.tsx`, `mobile/src/app/(tabs)/_layout.tsx`, `mobile/src/live.tsx`, `mobile/src/bookings.tsx`; navigation regression expectation.
- Documentation: this report, `FEATURES.md`, `SETUP.md`, `AI-WEATHER-LIVE-RESULTS.json`.

No SQL migration, remote schema change or reseed. Dependencies added only where used: official `@google/genai` in Express and `motion` in web.

Provider references: [Google structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [supported models](https://ai.google.dev/gemini-api/docs/models), [Open-Meteo forecast parameters](https://open-meteo.com/en/docs), [Motion reduced motion](https://motion.dev/docs/react-accessibility), [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/).

## Final check results

- Backend lint, TypeScript and build passed; full suite 28/28 passed. After the final AI-only full-game/active-host guard, the three focused assistant/weather tests and complete hosted AI verification passed again.
- Web lint, production build, game-domain checks and production demo-isolation check passed. Motion DOM-only features reduced the main chunk to about 523.5 kB (157.2 kB gzip); Vite emits a non-failing >500 kB warning. Further route-level code splitting is deferred.
- Mobile TypeScript, lint and Expo web/static export passed (30 routes including AI and native player profile). No Android/iOS binary build or device interaction was performed.
- Live authenticated searches: badminton tomorrow 18:00, badminton courts tonight, padel partners in DHA, football openings, badminton player profiles in Gulberg, Lahore weather and an empty 2039 game search. Stored records, counts and slot prices matched their existing APIs. Native bearer /api redirect also returned real venue results.
- Actual Gemini invalid-model failure returned 503; missing configuration and mocked provider outage are covered in automated checks. Open-Meteo returned real data and repeated requests retained the cached fetch timestamp. Inaccessible game weather returned 404 and unauthenticated chat returned 401.

Remaining acceptance is browser/device visual interaction; neither screenshots nor animation responsiveness were tested. The FYP integration is usable with the existing server key, subject to provider quota/network availability. No further setup/migration is required for the tested local web backend.
