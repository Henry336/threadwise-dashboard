# Design direction: the quiet operations desk

Threadwise is used to get thoughts out of the way. Its dashboard should return that information without becoming another source of noise.

## Core hierarchy

1. **Needs attention** — one clear decision, not a wall of alerts.
2. **Threadline** — the next few time-bound moments in chronological order.
3. **Recently captured** — notes and ideas that are still cognitively warm.
4. **Recall context** — recently captured notes, ideas, and searchable images.

The My Day layout is intentionally asymmetric. Cards earn size from relevance and content rather than being forced into equal statistic tiles.

## Visual language

- Warm paper canvas, ink text, hairline borders, and broad quiet shadows
- Editorial serif for personal, reflective moments; utilitarian sans-serif for action
- One user-selected accent, with coral and green reserved for semantic warning/success
- Rounded rectangles rather than glass panels; no shaders, auroras, custom cursors, or decorative analytics
- A small animated-thread motif that explains chronology and connection

## Product hierarchy

- **Capture** — tasks, notes, ideas, and searchable images
- **Coordinate** — reminders, assignees, and shared work
- **Recall** — search, pins, archives, and the dashboard

Calendar remains a secondary task integration. Frozen experiments do not appear in navigation, capture, search, onboarding, or empty states.

## Identity system

- The faceless threaded-path mark represents Threadwise as a product. It belongs in navigation, favicons, and compact system chrome.
- Ari is the same thread given a face and body. Ari appears only in onboarding, genuinely empty moments, and friendly recovery states.
- Both marks use flat geometry, teal thread, warm paper, and deep navy. They avoid gradients, raster artifacts, and a permanently dark circular badge.
- Dark surfaces use Ari's dark avatar; light surfaces use the light avatar or transparent full figure. The product mark uses teal plus the current text color so it adapts with the theme.

## Interaction language

- One capture/search deck is the primary control
- `Ctrl/Cmd + K` opens global search; visible actions remain available to touch users
- `N` focuses capture; `G D`, `G T`, `G N`, and `G I` move between views
- Essential task completion is always visible; secondary actions can be quieter
- The shell resolves from soft blur to sharp focus, followed by a 35–50ms content stagger and a restrained 6–8px rise
- Buttons compress to 0.98 on press; route, sheet, skeleton, gallery, and lightbox motion preserve spatial continuity
- Hover and press transitions stay within 150–220ms, with transform-heavy motion disabled when reduced motion is requested

## Personalization guardrails

Users may change accent, theme, density, timezone, greeting, and default view. They do not receive arbitrary layout controls that would make support, accessibility, or information hierarchy unpredictable.

## Responsive behavior

- Desktop: persistent navigation and a four-column bento canvas
- Tablet: collapsible navigation and two-to-three-column content
- Mobile: compact header, single-column focus content, two-column metrics, and a five-destination bottom bar
- Minimum touch targets are 44px for primary actions; core actions never require hover
