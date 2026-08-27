<!-- Project-grounded 21st design context. Source of truth: .21st/design.json. -->
# Project Design Context

Current dashboard release: **v0.9.0**

Context verified: **2026-08-21**

## Product

Threadwise is a Telegram-native capture and coordination dashboard. The interface is adaptive, comfortable, and built from the existing Threadwise visual system.

## Sources

- Tokens: `src/app/globals.css`
- Components: `src/components`
- Assets: `public/brand`

## Constraints

- Reuse existing Threadwise tokens, buttons, fields, sheets, cards, and status chips.
- Keep task-import controls usable at 360px width.
- Show import warnings beside the affected row.
- Do not introduce a second design system, decorative gradients, or generic AI dashboard cards.
- Preserve progressive disclosure: one visible decision, no more than three immediate actions across two rows, then an exact dashboard continuation for detailed work.
- Do not add acceptance, decline, blocked, or member-handoff controls. Assignments are immediate; unassigned work may be claimed; creator/admin authority governs assignment changes.
- Keep the private Study shell module-first with Overview, Timetable, Work, Deep Work, Modules, Library, Search, Review, and Settings.

## Decision: TODO review

Use one focused review surface with editable task rows, explicit include/exclude controls, and a sticky Import action. This keeps parser uncertainty visible and correctable before shared tasks are created, without adding chat clutter.

On desktop, each row has three layers: task identity and editable title, operational metadata, then expanded correction fields. Deadline changes stay local until **Done** sends one update, preventing server refreshes from interrupting the native picker. The sheet is opaque and uses the same canvas/surface tokens in light and dark mode.

Telegram review links must select the authorized workspace and open the exact review or record. The dashboard is a continuation of the chat decision, not a generic destination.

## Decision: direct operational copy

Use one direct title on collection and settings pages. Do not add a subtitle that restates an obvious page name. Search names tasks, notes, ideas, and images in the heading itself. Reserve one short, deterministic daily line for the personal Overview greeting, where a small amount of personality supports orientation without competing with work. Personal lines are managed in General settings as a bounded quote-and-optional-author list; use explicit add/remove/save actions and keep the responsive editor within the existing form system.

## Decision: compact Study mobile surfaces

At phone widths, the Study drawer is one contained viewport-height surface with a single close action, one compact workspace/context block, scrollable primary navigation, and synchronization status anchored after the navigation rather than floating across content. Use the book/context mark for academic state; reserve illustrated Ari artwork for deliberate empty or instructional moments, never for tiny context tiles.

Study Work cards prioritize action, identity, and deadline. Do not expose provider URLs in the primary reading flow. Filters occupy the full available width, empty states use a restrained symbol, and destructive archive controls remain recognizable without becoming the visual focal point. Deep Work artwork is centered as a supporting cue, not aligned like form content.

## Decision: reversible Study workspace width

On laptop and desktop widths, expose one persistent sidebar toggle in the Study top bar. Collapsing navigation gives timetable, Library, and review work the full viewport without changing routes or workspace state. Mobile keeps its existing overlay drawer and does not inherit the desktop preference.

Saved Library images open fitted to the available viewer for orientation. A labelled **Full size** action and clicking the image both switch to a full-viewport, natural-resolution scrollable canvas; **Fit**, clicking again, or pressing Escape returns to fit mode. Pressing Escape from fit mode closes the viewer.

Primary Study overflow controls are part of the visual system. On desktop, the sidebar navigation and horizontal timetable use slim rounded thumbs derived from theme tokens, transparent tracks, and a restrained Study-blue hover state. Preserve native scrolling and Firefox/WebKit support; the mobile drawer continues to hide its scrollbar.

## Decision: one cross-mode Today planner

Personal, Group, and Study overviews reuse one Today planner. It presents Today, Carryover, and Deadline watch as three bounded columns on wide screens and one readable stack on mobile. Batch capture exposes one review surface, a secondary Add more action, focused row corrections, and one atomic Save action. Planned days and deadlines remain separate labelled fields; creating planned work never implies a reminder.

## Decision: private daily briefing consent

Morning and evening briefings live in Personal Reminder settings because they privately combine the user's Personal, assigned Group, and Study work. Use two restrained opt-in rows, branded time pickers, explicit descriptions, and one existing Save action. Keep both off by default and explain that quiet hours still apply; do not present these digests as repeating task reminders or shared group settings.
