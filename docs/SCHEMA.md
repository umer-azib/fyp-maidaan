# Current schema transition

Migrations 004-009 supersede the legacy Auth dependency below. profiles.id now references app_private.accounts; app_private.sessions holds only session digests/expiry/client metadata. auth.uid() inside preserved game procedures is a transaction-local server-set UUID compatibility bridge, never a client JWT grant. Direct anon/authenticated table/function privileges are revoked. Express connects privately, validates opaque sessions and scopes every request; only backend operations set actor context.

Managed venue approval, schedule exclusion, transactional court slots/reservations/rescheduling, booking-to-game immutability, private media, announcements/events, connections/invitations/blocks, waitlists, verified attendance, eligible reviews/reports and external recurring series are defined in the new reviewed migrations. Six new migrations are generated and validated locally; none were applied remotely. Imported legacy users retain IDs with null application passwords, requiring trusted recovery before cutover. Booking holds remain unused groundwork; no hold expiry/payment processing claim is made.

Deployment sequence and caveats: CUSTOM-ACCOUNTS-AND-BOOKING.md. Feature-level status: FEATURES.md.

---

# Schema and authorization design

Applied source migrations are under supabase/migrations; nothing has been applied to a remote project by this task. Core migrations create new tables and deliberately fail on name collisions. Review an existing schema before applying; do not reset/drop existing remote data.

## Milestone 1 concrete schema

- Identity: auth.users → profiles (one per user, no role column), player_sports (unique player/sport), private player_availability (schema only).
- Location catalog: cities (Pakistan default, Asia/Karachi), areas (composite FK ensures area belongs to chosen city), sports.
- Independently onboarded venues: venues (source, verification/publication and location), venue_managers (many venues per user), courts, court_hours and court_blocks.
- Booking groundwork: bookings with half-open time ranges, allowed lifecycle/payment-method values and a PostgreSQL exclusion constraint against overlapping pending/confirmed/completed reservations. booking_holds are private and not writable. No booking transactions, API, live slots or expiry worker yet.
- Matchmaking: games; game_participants and join_requests have unique (game_id,player_id) primary keys. Game format/capacity is checked in PostgreSQL and Zod. M1 games are always externally arranged/unverified; confirmed-booking conversion is deferred.
- Privileges: admin_memberships can only be assigned privately, not by signup metadata or REST clients. audit_logs records game changes but is not readable/writable by regular clients.
- Profiles omit email/contact secrets. Authenticated players can see profile fields and rosters; pending requests are visible only to the requester/host. Player availability is private. Block/privacy discovery rules must be added before launching social browsing.
- Avatar bucket is private, 5 MB JPEG/PNG/WebP only; authenticated read policy and owner-folder upload/update/delete policies. API issues one-hour signed read URLs. No other media bucket is opened.

RLS is enabled on every core public table. Direct client mutations are revoked; only restricted security-definer functions mutate profile/game tables. Each mutation derives identity from auth.uid(); no function accepts actor/user ID. Host requests contain a target player ID only, checked against actual host and pending request. Join/edit/approve/leave/cancel all lock the same game row. Revoked direct participant/game writes prevent bypassing capacity checks through Supabase REST. SQL function search paths are fixed. Express verifies the bearer token with Supabase Auth and uses a per-request JWT-scoped database client; no service-role key is needed.

The exclusion constraint alone is NOT the future booking engine. M2 must acquire a court-row lock, expire conflicting holds, validate venue verification, opening hours, blocks, slot alignment, currency/price snapshots and ownership, then create/confirm reservations atomically. Online and offline bookings must share that path. Holds and confirmed bookings must not race. Adjacent reservations are allowed; cancelled bookings free their range. No cross-table hold safety is claimed today.

## Concrete deferred schema blueprint (not executable migrations)

These tables/columns are designed here so future work can add reviewed migrations without exposing unfinished workflows. See FEATURES.md for status.

| Table / addition | Proposed columns and constraints | Indexes / RLS / transactional requirements |
|---|---|---|
| venue_claims | id UUID PK; applicant_id FK profiles; venue_id FK nullable; facility details/proof reference; pending/approved/rejected status; reviewed_by FK; timestamps | Applicant owns pending application; admin-only decision; approved claim grants venue_managers atomically; prevent duplicate pending applicant/venue |
| games.booking_id | nullable UNIQUE FK bookings; source external/confirmed | Set confirmed only inside a procedure verifying confirmed booking, court, host ownership and matching time/location; no arbitrary status assertion |
| player_connections | requester_id/addressee_id FKs; pending/accepted/rejected state; timestamps | Unique unordered pair using least/greatest UUID; self prohibited; only addressee accepts; both parties read; respect blocks |
| player_blocks | blocker_id/blocked_id FKs; created_at | Composite PK; no self; blocker owns writes; blocking affects invites/discovery/relationships |
| invitations | id; game_id/inviter_id/invitee_id FKs; pending/accepted/declined/expired; expires_at | Unique active game/invitee; authenticated inviter authorization; acceptance invokes capacity-safe join path |
| game_series | id; host_id; recurrence rule/timezone; start/end; defaults JSON | Host-only writes; generated unique series/occurrence timestamp on games; membership/cancellation per occurrence |
| replacement_requests | id; game_id/player_id; status; fulfilled_by; expiry | Host/participant authorized; atomic replacement under game lock; no duplicated participants |
| game_waitlist | game_id/player_id; queued_at; status; offer_expires_at | Unique game/player; ordered index; game-lock promotion and offer expiry; host/request rules preserved |
| game_attendance | game_id/player_id; verification method/verifier; verified_at; disputed state | Composite PK; FK to participation; authenticated verification cannot be self-asserted; immutable reviewed evidence |
| cost_shares | booking_id/player_id; owed_paisa; settled_paisa; settlement method; status | Composite PK; nonnegative integers; sums against actual booking cost; no claim of processed payment |
| reviews | id; author_id; player_target_id XOR venue_target_id; eligible_game_id XOR eligible_booking_id; sportsmanship/reliability/teamwork/quality scores 1–5; body; moderation status | No self; unique author/target/eligible event; procedure proves verified shared completed game or completed booking/attendance; moderated aggregates only |
| reports | id; reporter_id; target type/id with typed FK targets; reason/details; pending/resolved/dismissed; reviewed_by; timestamps | Reporter owns creation/read; admin-only resolution; rate limits; no target-private-data leakage |
| announcements | id; title/body/image; cta_label/path; display popup/banner/bottom_sheet; platform/audience/city/page; active; starts_at/ends_at; priority; frequency; dismissible | Admin-only writes, active schedule/index; server-filtered targeting; internal/allowlisted HTTPS destinations; image storage policy |
| announcement_events | id; announcement_id; actor_id nullable; impression/click/dismiss type; session key; occurred_at | Rate limits, dedupe by announcement/session/event/frequency window; restricted aggregates; no unrestricted user event reads |
| notifications | id; user_id; type; payload; read_at; created_at; dedupe_key | User-scoped RLS; server writes only; user mark-read; dedupe index; delivery preferences and token revocation |
| push_tokens/preferences | user_id; platform; device token; sports/location/radius and opt-ins | User-only write/read; private coordinates; expiry/revocation; worker does matching without public precise-location exposure |
| feature_flags | key PK; enabled; audience/city/platform; configuration; updated_by | Admin-only writes; API evaluates targeting; never grants privileges or bypasses auth |
| conversations/messages | conversations and membership; messages author/body/time; moderation state | Membership RLS, blocked-user rules, input limits; game chat only appropriate participants; realtime access checked |

Keep FK indexes on referencing columns and explicit lifecycle check constraints. Future admin actions append audit_logs. Never allow clients to write admin_memberships, manager grants, verified attendance, review eligibility, booking confirmation or CMS publication through unrestricted table policies.
