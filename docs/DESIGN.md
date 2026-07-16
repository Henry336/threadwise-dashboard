# Design direction: the quiet operations desk

Threadwise is used to get thoughts out of the way. Its dashboard should return that information without becoming another source of noise.

## Core hierarchy

1. **Needs attention** — one clear decision, not a wall of alerts.
2. **Threadline** — the next few time-bound moments in chronological order.
3. **Recently captured** — notes and ideas that are still cognitively warm.
4. **Rhythm and context** — small activity, spending, and integration summaries.

The My Day layout is intentionally asymmetric. Cards earn size from relevance and content rather than being forced into equal statistic tiles.

## Visual language

- Warm paper canvas, ink text, hairline borders, and broad quiet shadows
- Editorial serif for personal, reflective moments; utilitarian sans-serif for action
- One user-selected accent, with coral and green reserved for semantic warning/success
- Rounded rectangles rather than glass panels; no shaders, auroras, custom cursors, or decorative analytics
- A small animated-thread motif that explains chronology and connection

## Interaction language

- One capture/search deck is the primary control
- `Ctrl/Cmd + K` opens global search; visible actions remain available to touch users
- `N` focuses capture; `G D`, `G T`, `G N`, and `G I` move between views
- Essential task completion is always visible; secondary actions can be quieter
- Hover and press transitions are 150–220ms, with transform-heavy motion disabled when reduced motion is requested

## Personalization guardrails

Users may change accent, theme, density, timezone, greeting, and default view. They do not receive arbitrary layout controls that would make support, accessibility, or information hierarchy unpredictable.

## Responsive behavior

- Desktop: persistent navigation and a four-column bento canvas
- Tablet: collapsible navigation and two-to-three-column content
- Mobile: compact header, single-column focus content, two-column metrics, and a five-destination bottom bar
- Minimum touch targets are 44px for primary actions; core actions never require hover
