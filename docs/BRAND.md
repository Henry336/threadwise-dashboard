# Threadwise identity

Reviewed against dashboard v0.9.0: **2026-08-11**

Threadwise uses one strand in two modes.

## Product mark

The faceless threaded-path mark is the corporate symbol. A location-like loop becomes a knot and resolves as a check, expressing capture, connection, and completion without resembling a generic status dot.

Use it for navigation, product lockups, and formal material. The production mark is the optically centered inline vector in `src/components/threadwise-mark.tsx`. Its geometry is identical in light and dark themes; `currentColor` supplies the theme-appropriate teal.

The approved dark Ari app icon is reserved for browser and Telegram avatars. It does not replace the corporate mark inside dark product chrome.

Installed-app icons derive from that approved Ari artwork. Launcher crops stay optically centered, and the maskable variant uses a neutral safe zone so mobile launchers do not clip Ari's face or thread.

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
- `public/brand/ari-untangle-loading.png` — original four-frame Ari loading source
- `public/brand/ari-untangle-registered-v3.webp` — production eight-frame loading sequence; treat as an 8×1 sprite of registered 543×724 frames and play it forward then backward at roughly two seconds per frame
- `public/brand/ari-untangle-contact-v3.webp` and `public/brand/ari-untangle-overlay-v3.png` — registration QA artifacts used to verify scale, center, crop, and baseline consistency
- `public/brand/ari-untangle-registered-v3.json` — frame geometry and anchor metadata used by asset tests
- `public/brand/ari-telegram-512.png` — Telegram-ready dark avatar
- `src/app/icon.png` — browser/app icon
- `public/pwa/` — 192px, 512px, maskable, and Apple-touch launcher exports derived from the approved app icon

Ari variants are deterministic crops from the approved sheet. The loading sequence is the sole approved motion derivative: its frames preserve Ari's visual language and share one fixed registration anchor. Do not independently redraw or regenerate other Ari variants. The faceless product mark is deliberately separate, geometric artwork designed to remain crisp at 16–32px.

The previously shown 3D-esque launcher set is not present in tracked history, recoverable Git objects, the known temporary directories, or preserved attachments as of 11 August 2026. Do not fabricate a lookalike. Keep the current approved icons until the original source is supplied or deliberately replaced through a new brand decision.
