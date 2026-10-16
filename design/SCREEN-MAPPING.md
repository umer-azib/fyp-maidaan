# Source screen mapping
| Screenshot | Maidaan screen | Preserved patterns |
|---|---|---|
| Sign Up or Register | Welcome, sign in/up | Large photography, violet emphasis, pill CTA |
| Interest-3; 5 things-4 | Sports preferences | Choice cards, chips, progress line |
| Sliding Person; Quick view profiles | Discover, details | Rounded photo, dark overlay, status chips |
| Date Planner | Create and edit | Labeled outlined fields and primary action |
| Explore Filter Screen | Filters, dialogs | Rounded sheet, scrim, violet apply action |
| Inbox | My Games, requests | Compact rows and avatars |
| Profile; Edit Profile | Player profile | Identity card and outlined grouped rows |
| Settings | Host management | Grouped actions and destructive confirmation |
| Set Preference | Map layout | Filters and outlined selection controls |

Mobile uses Expo Router. Web /player uses the same vocabulary in a responsive rail/content layout. /hub and /admin are server-gated dashboard design previews with navigation and disabled management actions. Venue-first discovery and open games are distinct flows using the same visual language.

Baseline: mobile Expo 57 / RN 0.86 / TS; web React 19 / Vite 8 / TS; backend dependencies only and unchanged. React Router is the required new web routing dependency.

| Date Planner | Court/date/slot selection, owner windows/closures | Persistent field labels, rounded choice cards and purple confirmation action |
| Name; Birth Date; Interest-3; Edit Profile | Guided Player signup | Four-step progression, profile fields and per-sport choices |
| Settings; Inbox | Owner schedules/booking actions, admin approvals/moderation | Grouped rows, status chips, restrained destructive actions |

Owner/admin real accounts now use operational scoped APIs. Local demo accounts retain explicitly labeled design previews. See docs/FEATURES.md for remaining dashboard scope.
