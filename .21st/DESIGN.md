<!-- Project-grounded 21st design context. Source of truth: .21st/design.json. -->
# Project Design Context

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

## Decision: TODO review

Use one focused review surface with editable task rows, explicit include/exclude controls, and a sticky Import action. This keeps parser uncertainty visible and correctable before shared tasks are created, without adding chat clutter.

On desktop, each row has three layers: task identity and editable title, operational metadata, then expanded correction fields. Deadline changes stay local until **Done** sends one update, preventing server refreshes from interrupting the native picker. The sheet is opaque and uses the same canvas/surface tokens in light and dark mode.
