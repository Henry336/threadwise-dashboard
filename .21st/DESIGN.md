<!-- Project-grounded 21st design context. Source of truth: .21st/design.json. -->
# Project Design Context

Current dashboard release: **v0.9.0**

Context verified: **2026-08-10**

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

Use one direct title on collection and settings pages. Do not add a subtitle that restates an obvious page name. Search names tasks, notes, ideas, and images in the heading itself. Reserve one short, deterministic daily line for the personal Overview greeting, where a small amount of personality supports orientation without competing with work.
