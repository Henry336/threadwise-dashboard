# Design direction: the quiet operations desk

Current dashboard release: **v0.9.0**

Design guidance verified: **2026-08-11**

Threadwise is used to get thoughts out of the way. Its dashboard should return that information without becoming another source of noise.

## Core hierarchy

1. **Needs attention** — one clear decision, not a wall of alerts.
2. **Threadline** — the next few time-bound moments in chronological order.
3. **Recently captured** — notes and ideas that are still cognitively warm.
4. **Recall context** — recently captured notes, ideas, and searchable images.

The My Day layout is intentionally asymmetric. Components earn size from relevance and content rather than being forced into equal statistic tiles.

## Visual language

- Warm paper canvas, ink text, hairline borders, and broad quiet shadows
- Editorial serif for personal, reflective moments; utilitarian sans-serif for action
- One user-selected accent, with coral and green reserved for semantic warning/success
- Rounded rectangles rather than glass panels; no shaders, auroras, custom cursors, or decorative analytics
- Thread geometry only when it communicates chronology, connection, or progress
- One clear capture entry point per viewport; repeated controls do not become more discoverable by being duplicated

## Product hierarchy

**Find a time** is a focused Coordinate surface: one compact status card in chat, one full availability grid in the Mini App, and no attempt to become a general calendar.

Group TODO import follows the same rule: one compact Telegram preview opens one task-shaped review sheet. It does not become a permanent navigation section. The sheet uses operational sans-serif type, explicit inclusion controls, row-level warnings, and one sticky import action so dense pasted lists remain understandable on mobile.

Shared-work actions follow **one message, one decision**. Telegram shows no more than three immediate actions across two rows; the dashboard link is the continuation for detailed editing. Assignments take effect immediately, unassigned work may be claimed, assignees complete or snooze, and only the creator or a verified current Telegram administrator may assign or reassign. Do not reintroduce acceptance, decline, blocked, or member-handoff controls as active workflow.

The review distinguishes uncertain data from terminal state. Unmatched people are removable rather than hidden inside an error string; warnings clear when their cause is fixed; Importing, Imported, Canceled, and Expired reviews stop presenting editable fields. Refresh is user-initiated so a live update cannot overwrite a correction still being typed.

The sheet keeps a fixed four-part layout—header, contextual status, scrollable rows, and footer—so optional permission or error notices cannot displace its primary work area. Summary counts describe included rows only, and terminal status is stated once before a single Close action.

On desktop, each task reads in three deliberate layers: identity and editable title, operational metadata, then expanded correction fields. Deadline editing is transactional inside the row: the reviewer may finish navigating the native date and time controls before **Done** sends one update. The sheet uses the same opaque canvas/surface tokens in light and dark mode; the dimmed backdrop must never tint the working surface itself.

- **Capture** — tasks, notes, ideas, and searchable images
- **Coordinate** — reminders, assignees, and shared work
- **Recall** — search, pins, archives, and the dashboard

Calendar remains a secondary task integration. Frozen experiments do not appear in navigation, capture, search, onboarding, or empty states.

The private Study shell is module-first rather than a reskinned personal dashboard. Its navigation is Overview, Timetable, Work, Deep Work, Modules, Library, Search, Review, and Settings. Timetable presents recurring classes and planned study tasks in one responsive schedule, with route context progressively disclosed only where it helps the next journey. Desktop week view can place days in columns with time running downward or place days in rows with time running left-to-right; both orientations edit the same blocks. Mobile keeps the day agenda instead of compressing either weekly grid.

Both desktop timetable orientations cover the complete 00:00–24:00 day inside a fixed-height scroll
viewport. Initial position follows the current time or earliest relevant work; the live-time label owns
a reserved rail and must never overlap an event title. Mobile keeps the day agenda rather than shrinking
the full-day week grid.

Horizontal Timetable uses one weekday axis only: a frozen day-agenda control, a narrow per-day Deadlines
rail, then the hourly track. The Deadlines rail shows at most two deadlines and one explicit overflow
action. Vertical mode retains the week-level Deadlines shelf. This prevents the same weekday from
appearing on both axes and keeps deadlines adjacent to, but semantically separate from, scheduled
time. Module selection is never an implicit capture destination; inactive modules live in one quiet
restore/review section rather than leaking into semester work.

Horizontal Timetable keeps its **Day** and **Deadlines** columns frozen while the 24-hour axis moves.
The time ruler stays pinned above the scrolling schedule, and the frozen pane has an opaque surface
plus a clean divider so blocks never show through it. Selecting a day label opens that date's focused
day agenda, matching Vertical mode. Teal marks the entire current-day row and its `TODAY · DAY DATE` label;
orange is reserved for the live-time line and `NOW` marker.

Selecting an existing timetable block opens a read-only detail sheet before any mutation is offered.
Desktop uses a right-side sheet and mobile uses a bottom sheet. Edit changes that same sheet into a
form; recurring deletion requires explicit confirmation. Horizontal cards adapt to actual rendered
width: narrow blocks become labelled capsules, compact blocks show module plus title, and full blocks
add time and venue. Every density retains the complete accessible label and opens the same details.

Study image capture is intentional: the bot saves no image or OCR result until the owner confirms it.
The Library opens images in a same-origin lightbox rather than navigating to an API response. Loading,
retryable failure, permanent expiry, and expired-session states must each have a direct next action.

## Identity system

- The faceless threaded-path mark represents Threadwise as a product. It is one optically centered vector with identical geometry in light and dark themes; only its theme token changes.
- Ari is the same thread given a face and body. Ari appears in onboarding, empty moments, recovery states, capture entry points, and settings where the illustration provides useful orientation.
- Mascot artwork comes directly from the approved Ari sheet. UI implementations preserve the supplied artwork instead of approximating Ari with new paths.
- Ari's loading motion uses eight registered frames on one fixed 3:4 stage. Playback runs forward and backward so the loop never jumps from its finished state to its opening knot; reduced motion holds on the completed frame.
- Each registered loader pose remains visible for roughly two seconds. Frame geometry, crop, visual center, baseline, and stage aspect ratio do not change during playback.
- Browser icons and Telegram avatars may use the approved dark Ari app icon. Product chrome always uses the faceless vector mark in both themes.

## Anti-slop rules

- Editorial serif is reserved for greetings, collection titles, and genuinely reflective moments. Tasks, controls, counts, metadata, and operational status use the sans-serif system.
- Operational pages state the page name once. Do not add a subtitle that merely rephrases Tasks, Notes, Ideas, Images, Settings, or another self-evident destination.
- Search names the searchable entities in one heading; result counts and loading state carry live status without a decorative `LIVE` badge.
- Personal Overview may carry one short daily line. It must be deterministic for the workspace day, concise, and secondary to the user's actual work.
- A card must group a meaningful object or action. Do not wrap every label, count, or empty state in another rounded container.
- Avoid generic dashboard filler: decorative orbits, disconnected gradient shapes, equal-height statistic towers, invented analytics, and slogans where a direct label is clearer.
- Asymmetry must follow information priority, not decoration. Today gives the active task the most space, then a compact actionable day pulse, then the chronological Threadline.
- Empty space is allowed when it improves focus. Empty cards and unexplained blank grid spans are not.
- Threadline is a working timeline, not a stack of cards. Dividers and time markers carry the structure.
- Light and dark themes share geometry, typography, spacing, and hierarchy. A theme change must not swap the product identity.

## Interaction language

- One capture/search deck is the primary control
- `Ctrl/Cmd + K` opens global search; visible actions remain available to touch users
- `N` focuses capture; `G D`, `G T`, `G N`, and `G I` move between views
- Essential task completion is always visible; secondary actions can be quieter
- Exact Telegram deep links select the authorized workspace and open the intended record or review; never send a user to a generic dashboard home when the context is known
- The shell resolves from soft blur to sharp focus, followed by a 35–50ms content stagger and a restrained 6–8px rise
- Buttons compress to 0.98 on press; route, sheet, skeleton, gallery, and lightbox motion preserve spatial continuity
- Hover and press transitions stay within 150–220ms, with transform-heavy motion disabled when reduced motion is requested

## Personalization guardrails

Users may change accent, theme, density, timezone, greeting, and default view. They do not receive arbitrary layout controls that would make support, accessibility, or information hierarchy unpredictable.

## Responsive behavior

Availability grids preserve 44px cells and horizontal day scrolling on narrow screens instead of shrinking labels below readable size.

- Desktop: persistent navigation and a four-column bento canvas
- Tablet: collapsible navigation and two-to-three-column content
- Mobile: compact header, single-column focus content, a compact three-part day pulse, and a five-destination bottom bar
- Minimum touch targets are 44px for primary actions; core actions never require hover
- Dense import rows retain 44px include, expand, assignee, and removal targets on mobile instead of shrinking controls to fit more rows
- Narrow installed-app headers preserve one readable workspace trigger and icon-sized global actions; breadcrumbs yield before controls collide.
- Workspace switching is a progressive popover, not a native select or full-screen dimmer. It must remain within the viewport, retain full labels, and restore focus after dismissal.
- Study image grids show the image and a genuine optional caption. OCR is recall infrastructure: searchable by default, visible only after the user opens the image and expands searchable text.
