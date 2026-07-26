# Threadwise identity

Threadwise uses one strand in two modes.

## Product mark

The faceless threaded-path mark is the corporate symbol. A location-like loop becomes a knot and resolves as a check, expressing capture, connection, and completion without resembling a generic status dot.

Use it for navigation, product lockups, and formal material. The production mark is the optically centered inline vector in `src/components/threadwise-mark.tsx`. Its geometry is identical in light and dark themes; `currentColor` supplies the theme-appropriate teal.

The approved dark Ari app icon is reserved for browser and Telegram avatars. It does not replace the corporate mark inside dark product chrome.

## Ari

Ari is the same strand made friendly: the loop becomes a head, the knot becomes a small body, and the tail still resolves as a check. Ari is not a chatty assistant persona. Ari is a quiet sign that Threadwise is ready, empty, or helping someone recover.

Use Ari for:

- onboarding and welcome moments;
- calm empty states;
- recoverable failures;
- capture entry points and relevant settings guidance;
- meaningful waiting states, using the approved knot-to-finished-thread sequence;
- the empty Find a time experience, where Ari is literally arranging threads;
- release or educational artwork.

Do not use Ari beside every card, navigation item, save, or routine status.

## Palette

- Thread teal: `#20B8AD`
- Product teal: `#139B92`
- Deep navy: `#101922`
- Warm paper: `#FBF7EE`
- Warm white: `#FFF4DF`

## Source assets

- `src/components/threadwise-mark.tsx` — production corporate mark and lockup
- `public/brand/ari-approved-sheet.png` — the approved Ari source sheet and visual master
- `public/brand/ari-avatar-light-sheet.png` — exact light avatar crop
- `public/brand/ari-avatar-dark-sheet.png` — exact dark app-icon crop
- `public/brand/ari-full-sheet.png` — exact full Ari crop
- `public/brand/ari-threading-sheet.png` — exact thread-arranging illustration crop
- `public/brand/ari-untangle-loading.png` — exact four-frame loading sequence; treat as a 4×1 sprite of 543×724 frames
- `public/brand/ari-telegram-512.png` — Telegram-ready dark avatar
- `src/app/icon.png` — browser/app icon

Ari variants are deterministic crops from the approved sheet. Do not redraw, trace, or regenerate Ari: that would subtly change the mascot's proportions and expression. The faceless product mark is deliberately separate, geometric artwork designed to remain crisp at 16–32px.
