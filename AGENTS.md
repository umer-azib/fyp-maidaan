# Maidaan V2
- Preserve existing Expo SDK 57, Vite, TypeScript and Express configurations. Do not recreate apps.
- Main visual source is design/screenshots/*.png; never parse the purchased .fig binary.
- Read design/DESIGN-GUIDE.md and design/SCREEN-MAPPING.md before UI work.
- Regular users have ONE Player account. Host is a per-game relationship; never add a Captain account type.
- Sports: Cricket, Football, Badminton, Padel. No dating behavior or copy.
- Mobile: native React Native + Expo Router. Discover | Map | Create | My Games | AI | Profile.
- Web: React Router; separate /player, /hub, /admin layouts.
- Reuse shared tokens, API contracts, domain validation and components. Keep typed demo fixtures separate from future services.
- Instant Join creates membership; Request to Join creates a pending request. Only the host manages their game. Check capacity, duplicates and permissions.
- Label demo state and integration placeholders honestly. No connected auth, Supabase, Maps, weather or API claims.
- The visual-only phase is complete. Implement backend changes only within the current approved milestone.
- Avoid unnecessary dependencies. Run builds, lint, TypeScript and domain self-checks; report unavailable verification.
- Follow mobile/AGENTS.md for SDK-specific instructions.
- Read docs/FEATURES.md as the master product checklist before every task; preserve every requested feature and update evidence/status accurately.
- Venue-first discovery is central: city/area → venues → venue → courts → date/time → booking → optional open game. Keep Find Venues and Find Open Games distinct.
- Current accounts use Express and private PostgreSQL account/session tables, not Supabase Auth. Never restore Supabase Auth for new signups or fall back to demo data after a live error.
- Express verifies opaque hashed sessions and account status on every protected endpoint. Web uses HttpOnly cookies and origin/header checks; native uses SecureStore. Identity is never a submitted userId. Only Express connects to PostgreSQL/private Storage.
- Only restricted PostgreSQL procedures mutate game membership. Preserve row locks, duplicate/capacity checks, host permissions and RLS.
- No remote destructive migrations. Credentials belong in ignored .env files; maintain .env.example and docs/SETUP.md.
- Booking uses owner schedules, court locks and exclusion constraints. Games never modify reservations. Read current phase evidence in docs/FEATURES.md; keep incomplete provider, staff/reporting, native-social and APK/device work honest.
- Local UI demo auth is an explicitly authorized exception: OFF by default; requires the platform demo flag AND development mode. Keep demo sessions/data separate from Supabase, block live API/storage writes for demo sessions, and never add demo credentials/permissions to the backend. Production must ignore demo sessions even with a true flag.
- Welcome has Player, Venue Owner and Admin entry cards; each has a separate login route. Unauthenticated dashboards and cross-role demo routes must be guarded. Mobile owner/admin access hands off to web login without transferring credentials.

- Read docs/CUSTOM-ACCOUNTS-AND-BOOKING.md before the 004-009 migration transition. Never apply remote migrations automatically. Imported legacy identities retain IDs but have no migrated password. Administrator membership requires a trusted backend/database process, never public signup.

- Use docs/FEATURES.md as the master feature checklist and docs/DEMO-DATA.md for fixtures. No remote migration/seed/cleanup without explicit user approval. Fixture scripts require NODE_ENV=development and MAIDAAN_ENABLE_DEV_SEED=true; never target production or create fixture admin memberships. Review docs/MIGRATION-REVIEW.md before deploying the fresh 001-009 baseline.

- AI/weather MVP: read docs/AI-WEATHER.md. Gemini only extracts validated filters; Express returns actual read-only database results. Never auto-book/join or invent availability/prices/weather. Keep keys server-only, existing cookie/bearer auth, model/provider errors, forecast timestamps and cache limits. AI UI is player-only; mobile uses native animation APIs. No new migration is needed.

- FYP real directory: read docs/LAHORE-REAL-VENUES.md, docs/LAHORE-VENUE-ACCOUNTS.md and docs/FINAL-FYP-INTEGRATION.md. Migration 011 was explicitly approved/applied. Preserve 19 real source-backed locations, their dedicated development-only FYP managers, original 12 fixtures and all bookings/games. Directory manager overrides stay private; researched public facts stay intact. Directory schedules/courts are FYP simulation, never verified ownership or public booking inventory. OSM/Leaflet replaces map placeholders; Google is external directions only. APK builds require reachable HTTPS, EAS setup and device verification; do not claim an Android bundle is an APK.
