# Maidaan design guide
## Reference audit
57 PNG screens indexed in contact-sheet.png; Report is a directory. Examined Sign Up or Register, Sliding Person, Date Planner, Interest-3, Profile and Explore Filter Screen at full resolution. No .fig parsing. design/assets was empty.
## Tokens and patterns
Canvas #FAFAFA; ink #161616; muted #787878; violet approximately #7847BA; lavender #E9DDF5; surface #F2F2F2; border #E1E1E1. Platform sans-serif approximates the supplied screenshots (no original font supplied). Headings 30–32px bold, body 14–16px; 24px mobile insets; 8px spacing rhythm. Violet pill actions at least 48px tall. Outlined fields with persistent labels and 8px radius. Gray choice cards with violet selected outline, 12px radius. Photo cards with 24px radius, dark lower overlay and lavender status chips. Rounded profile identity card and outlined grouped rows. Five-item bottom navigation becomes a desktop rail. Rounded light dialogs over scrim.
## Sports adaptation
Replace portraits and dating copy with community sports photography and game availability. Host applies only to a specific game. Time, venue, skill, spots and join mode appear before joining. Hub/admin/map extrapolate these same tokens because no equivalent reference is supplied.
## Honesty and accessibility
Current authentication uses Express-managed PostgreSQL sessions; missing configuration shows explicit errors. Live player flows never fall back to demo fixtures. Real owner/admin workspaces use scoped APIs; local demo previews are gated, labeled and disabled. Map layout is prepared for Google Maps but not connected. Persistent labels, visible keyboard focus, readable text, accessible action names and explicit confirmation for cancel/leave.

## Managed-booking phase UI repair

Keep the original tokens and kit field/card language. Responsive rail uses a sticky full-height desktop frame and a fixed safe-area-aware mobile navigation bar; workspace has no duplicate left offset. Content is bounded to 1320px, native scroll content to 760px. Action rows wrap, fields keep a consistent 48px minimum height, nested mobile location selectors stack, and long dialogs scroll within the viewport. Court slots reuse pale rounded choice cards with actual PKR prices; disabled times are visibly unavailable. Participant rows use aligned avatars/grouped cards. Four-step signup uses the kit progress/outlined-field patterns. Real dashboard records and explicit local previews remain separate. Chrome reference captures at four widths are under docs/ui-qa; physical native screenshots remain pending.

## Current FYP map implementation

Interactive OpenStreetMap/Leaflet now replaces map placeholders on web and native (controlled WebView). Keep the original purple tokens, rounded panels, sports illustration fallback and accessible list alternative. Google is used only as an external directions link. Real directory facts and FYP simulation ownership/inventory must stay visibly distinct; see docs/FINAL-FYP-INTEGRATION.md.
