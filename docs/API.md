# Current Express application API

The historical JWT/Supabase Auth contract below is superseded. Clients use the same /v1 JSON API and shared TypeScript contracts. Web requests use credentials:include, X-Maidaan-Client:web, and an allowed Origin on mutations; native uses X-Maidaan-Client:mobile with a SecureStore bearer. Demo values are never valid credentials. Every protected request verifies account/session status before deriving its user ID. Bounded pagination uses page/pageSize (maximum 50). Errors retain code/message/requestId. Reads have an IP limit, auth has a stricter IP limit, and protected changes have a per-account limit.

| Area | Current routes |
|---|---|
| Accounts | POST /auth/register, /auth/login; GET /auth/session; POST /auth/logout, /auth/renew |
| Player | GET/PUT /me/profile; POST /me/avatar; PUT /me/availability |
| Discovery | GET /locations, /venues, /venues/:id, /courts/:id/availability?date=YYYY-MM-DD |
| Bookings | GET /me/bookings; POST /bookings; POST /bookings/:id/actions (cancel/confirm/complete/record_payment, scoped by SQL); POST /bookings/:id/game |
| Games | Existing GET /games, /games/:id, /me/games; POST /games and /games/:id/actions; POST /game-series and /games/:id/replacement |
| Owner | GET /hub/access, /hub/overview, /hub/venues, /hub/bookings; POST /hub/venues; PUT /hub/venues/:id; POST /hub/venues/:id/courts and /hub/venues/:id/media; PUT /hub/courts/:id and /hub/courts/:id/hours; POST /hub/courts/:id/blocks, /hub/bookings/offline, /hub/bookings/:id/reschedule; GET /hub/bookings/:id/game; POST /hub/games/:id/attendance |
| Community | GET /players, /players/:id, /me/connections, /me/invitations; POST /connections/:id (request/accept/remove/block/unblock), /games/:id/invitations and /invitations/:id (accept/decline); GET/POST /reviews; POST /reports |
| Admin | GET /admin/access, /admin/overview, /admin/users, /admin/venues, /admin/bookings, /admin/games; POST /admin/users/:id/status, /admin/venues/:id/status, /admin/games/:id/cancel; GET /admin/reports; POST /admin/reports/:id |
| Content | GET /announcements?platform=web|mobile&page=discover|games|bookings|profile&cityId=lahore; POST /announcements/:id/events; GET/POST /admin/content; PUT /admin/content/:id; GET /feature-flags; PUT /admin/feature-flags/:key |
| Rollout | GET /admin/catalog; PUT /admin/catalog/:type/:id (cities/areas/sports) |

New registration accepts name, username, email, password, confirmation, optional Pakistani phone, profile/sports, dateOfBirth, preferredAreas and weekly availability; kind may be player or owner but never administrator. The owner then submits the business/venue application. Web session responses omit token; native login/register/renew includes the opaque token. No application session is a Supabase JWT. Media is base64 JSON with validated MIME/magic bytes and a 5 MB limit; documents are private. Hosted Storage validation remains pending.

Availability returns concrete slots (startsAt, endsAt, pricePkr, available) in addition to the legacy hours field. Booking requests accept courtId, startsAt and paymentMethod, never a client price/end time/user ID. Confirmed booking recruitment accepts title/description/format/capacity/skill/joinMode/visibility and derives venue/sport/time from PostgreSQL. Game editing cannot modify a reservation. Waitlist/leave_waitlist/complete extend the existing game actions. Private games require participation or an invitation; blocking is checked server-side. Announcements currently accept safe internal /player CTAs only; external allowlisting is not enabled.

See CUSTOM-ACCOUNTS-AND-BOOKING.md and FEATURES.md for setup, production gates and unimplemented UI/provider coverage.

---

# Maidaan API contract — milestone 1

Base: `http://localhost:3001/v1` in development. Runtime/DTO contracts are in `shared/contracts.ts`, `shared/games.ts`, `shared/api.ts` and `backend/src/validation.ts`. Web and native use the same client and state implementation. Snake-case database rows are mapped to camel-case DTOs in the backend.

Protected endpoints require `Authorization: Bearer <Supabase access token>`. Express verifies it with `auth.getUser(token)` on each request and supplies that token to the database client. Identity never comes from `userId`, `hostId`, signup role metadata or request JSON. Requests with extra mutable-role/host fields are rejected. The target `playerId` in accept/reject is not the acting identity.

| Method/path | Access | Request and response |
|---|---|---|
| GET /health (outside /v1) | Public | `{status:'ok',configured:boolean}`; liveness does not certify migrations/Auth/Storage |
| GET /locations | Public | `{cities:City[],areas:Area[]}`; active database rows only |
| GET /venues | Public | LocationFilter + page/pageSize → Page<Venue>; no invented rows |
| GET /venues/:id | Public | VenueDetail incl. courts and published hours; bookingEnabled:false |
| GET /courts/:id/availability?date=YYYY-MM-DD | Public | Availability: Pakistan-time published hours, not free slots; bookingEnabled:false |
| GET /me/access | Authenticated | `{player:true,venueManager:boolean,admin:boolean}` from server-side assignments |
| GET /hub/access | Verified manager | 403 if no venue_managers row for JWT identity |
| GET /admin/access | Admin | 403 if no admin_memberships row for JWT identity |
| GET /me/profile | Authenticated | Ensures one profile, returns Profile with sports/skill and signed avatar URL |
| PUT /me/profile | Authenticated | ProfileInput only; atomic profile/sports update; username uniqueness |
| GET /games | Authenticated | LocationFilter + pagination → future open games with remaining spots, ordered by start |
| GET /me/games | Authenticated | Paginated games hosted/joined/requested by JWT identity, independent of discovery location |
| GET /games/:id | Authenticated | Game, roster and requests visible under RLS; deep links work independently of discovery pagination |
| POST /games | Authenticated | LiveGameInput → 201 Game; creates host membership atomically |
| POST /games/:id/actions | Authenticated | `{type:'join'|'leave'|'cancel'}` or `{type:'approve'|'reject',playerId}` or `{type:'edit',input:LiveGameInput}` → updated Game |

`LocationFilter`: cityId (default lahore), optional areaId, latitude AND longitude together, radiusKm 1–100 (default 20). Country defaults to Pakistan. GPS refines the selected city/area instead of silently changing it. SQL applies geographic filtering before pagination. `page` starts at 1, `pageSize` is 1–50; result `{data,page,pageSize,total}`. Frontends provide load-more controls; search/sport/join-mode controls filter loaded game pages, so load more to search additional pages. My Games has separate pagination and does not lose history when location changes.

`LiveGameInput`: sport, title, description, cityId, areaId (nullable), optional venueId, venue name, location/address, latitude/longitude, startsAt (ISO timestamp including offset), duration minutes, maxPlayers (including host), skill, joinMode instant/request, format and bookingSource:'external'. 1v1 means two players; 2v2 four; football formats require 10/14/22; Cricket uses Custom capacity 2–100. UI strips read-only snapshot fields before edits; backend independently rejects unknown fields. All M1 games have an explicit unverified external-booking label. A selected onboarded venue does not prove that a court was reserved.

No booking, hold, claim approval, social, review, notification, CMS or Google/weather endpoints exist yet. They return 404 rather than simulated success. Hub/admin UI route gates are convenience only: the corresponding server endpoint is authoritative, and future data endpoints must repeat that authorization.

Errors: `{error:{code,message,requestId}}`, with `X-Request-Id`. Codes/statuses: INVALID_INPUT/400, INVALID_JSON/400, UNAUTHORIZED/401, FORBIDDEN/403, NOT_FOUND/404, CONFLICT/409, PAYLOAD_TOO_LARGE/413, RATE_LIMITED/429, NOT_CONFIGURED/503, DATABASE_UNAVAILABLE/503, STORAGE_UNAVAILABLE/503, INTERNAL_ERROR/500. Internal database/service errors are not sent verbatim except known user-safe constraint/procedure messages. Responses use no-store.

Limits: 64 KB JSON; 120 requests/minute/IP and 30 writes/minute/IP, in-memory per server instance. Supabase manages Auth endpoint limits. Distributed limits and proxy trust configuration must be reviewed for production. Avatar upload goes directly to private Supabase Storage using the signed-in user's token, owner-folder policies and bucket MIME/size limits; no service secret is used.

SDK references used: [Supabase native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Expo 57 Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/), [Expo 57 ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/).
