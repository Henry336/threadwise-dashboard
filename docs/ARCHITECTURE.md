# Dashboard architecture

Updated: 2026-08-11

Current dashboard release: v0.9.0; paired backend release: v0.32.0

## Boundary

The dashboard is a separate Next.js application hosted on Vercel. It acts as a backend-for-frontend and talks to a versioned API hosted by the existing Threadwise Render service.

```text
Telegram OIDC ──→ Vercel session
                       │
Browser ──→ Next.js server routes ──→ Render /api/v1 ──→ existing services ──→ Postgres
```

Vercel does not receive the database URL, Telegram bot token, Calendar/Microsoft tokens, or reusable Telegram file identifiers. The bot remains the canonical mutation layer so reminders, recurrence, audit, undo, settings rescheduling, and integration synchronization keep their existing invariants.

## Authentication

Telegram's current OpenID Connect Authorization Code flow is used with PKCE and only `openid profile` scopes.

The callback validates:

- state and PKCE verifier
- Telegram JWKS signature
- issuer `https://oauth.telegram.org`
- audience (the BotFather client ID)
- expiry and nonce

Only the verified numeric `id` claim maps to `User.telegramId`; usernames are display-only. The session cookie is signed, HTTP-only, secure in production, and SameSite=Lax.

## Vercel-to-Render identity

Vercel creates a service JWT that lasts no more than 60 seconds and contains the verified Telegram ID. Render validates its signature, issuer, audience, expiry, and JWT ID, then resolves the canonical personal user. The browser never calls Render directly.

The intended production variant uses an asymmetric keypair: the private signing key lives only in Vercel and Render receives only the public verification key. This avoids duplicating another shared secret across platforms.

## Data rules

- All dates are ISO strings; money is normalized at the API boundary.
- Personalized responses are `no-store` and never enter shared caches.
- Every resource lookup includes the server-derived `userId`.
- Request bodies never accept `userId`.
- User text renders as plain JSX; no untrusted HTML is injected.
- Personal resources resolve from the signed Telegram subject. Group resources additionally resolve through an opaque workspace id, recorded membership, and a live Telegram membership check.
- Assignment is immediate. An active member may claim currently unassigned work and an assignee may complete or snooze their own work; assignment or reassignment requires the task creator or a freshly verified Telegram owner/admin. Accept, decline, block, and member handoff are rejected as obsolete mutations.
- A pending group TODO review may be controlled by its original sender. Any other controller must pass a fresh Telegram owner/admin check; ordinary members receive the review read-only.
- Expenses, the frozen Excel surface, export, and account deletion remain personal-only. Group scheduling may invoke Calendar only as an explicit per-member copy of a finalized meeting; credentials, connection state, and event links remain personal.
- Availability responses are keyed to the verified human Telegram id. Shared snapshots expose aggregates and identities but only return the signed-in viewer's raw selected cells.

The API must never expose embeddings, raw provider payloads, OAuth state, access or refresh tokens, Telegram file IDs, receipt hashes, or assignee Telegram IDs. It may return the user-facing task, note, idea, image caption/OCR, expense, and settings fields needed by the product.

Saved-image bytes follow an owner-scoped server path: Browser → Vercel BFF → Render → Telegram. Render performs the authenticated lookup, enforces raster-only media and a bounded download, then streams bytes with defensive browser headers. When Telegram reports a generic MIME type, the proxy identifies supported raster formats from bounded byte signatures before responding; the browser repeats that defensive check before creating an object URL. Neither the bot token nor Telegram file ID crosses into Vercel or the browser.

Mutations are accepted only through the same-origin Vercel BFF. Each Render route validates a short-lived Ed25519 service token and resolves the user from its verified Telegram subject before performing any database operation.

## Private Study projection

Study Mode is discoverable only when the signed Telegram principal is the configured Study owner, the opaque workspace resolves to the configured Study chat, current Telegram membership succeeds, and the active database binding agrees. Every Study snapshot, search, protected-file request, and mutation repeats the backend gate; unauthorized direct routes receive the same opaque not-found response as a missing workspace.

The Study shell exposes Overview, Timetable, Work, Deep Work, Modules, Library, Search, Review, and Settings. Timetable builds scrollable 00:00–24:00 week/day views from recurring class or study blocks plus planned work, renders assignment deadlines in a distinct lane, and supports module-week ranges and optional class-travel configuration. It positions the initial viewport near the current or earliest relevant block and clamps current-time markers inside a dedicated rail. Travel origins are managed in Settings and class blocks may store a destination, normal origin, and travel buffer. All surfaces mutate the same PostgreSQL records used by Telegram; server-sent events request reconciliation rather than maintaining a second browser-owned copy.

Destination search crosses the trust boundary through the same protected BFF, using `GET /api/threadwise/study/places`. The backend owns aliases, canonical ids, coordinates, type, ambiguity, and nearby-stop ranking; the dashboard owns only the debounced accessible combobox state. Stale browser requests are aborted. Selecting a suggestion stores its canonical id with the schedule block. Unresolved labels remain visible for editing but are not treated as routable and therefore cannot enable a proactive class-travel reminder.

Study images remain behind the same owner/group gate. The browser requests media through the same-origin Vercel proxy and receives an object URL only inside the Library lightbox; object URLs are revoked on close. The backend resolves fresh Telegram metadata, so the dashboard distinguishes missing media, expired authorization, and retryable provider failure without exposing a Telegram file id or bot token.

The snapshot separates active `modules` from `inactiveModules`. Operational arrays contain only
active-module data; the latter exists solely for owner Restore/Activate controls. Horizontal week
mode renders weekdays once as frozen row labels, a bounded frozen Deadlines rail, and then the
independently scrolling time track. Its time ruler is sticky within the schedule viewport. Vertical
mode keeps the shared Deadlines shelf. Both views remain projections over the same schedule and item
rows; orientation, density tier, details, and edit state are browser presentation concerns and do not
change Study API contracts.

Existing block selection enters a reducer-backed details state before entering edit state. Display
density is derived deterministically from the duration-accurate rendered width, while overlap lanes
are assigned client-side for legibility. New blocks may enter create state directly. All states use
the same authenticated Study mutation routes and reconcile from the canonical snapshot afterward.

## Production surface

### Installed app shell

The dashboard exposes a Next.js web app manifest and Ari launcher assets so supported browsers can install it as a standalone window. The service worker is deliberately a shell-only recovery layer: it caches immutable framework assets, brand art, PWA icons, and the generic `/offline` route. It does not cache authenticated navigations, `/dashboard`, `/api/*`, or user records. Losing the network therefore produces an honest recovery screen instead of a stale or shared copy of private work.

PWA icon URLs are versioned in the manifest and document metadata so launcher caches can be invalidated without changing the privacy boundary. At narrow installed-window widths, the topbar compresses its workspace, breadcrumb, search, theme, and profile controls rather than allowing them to overlap. Workspace selection uses a custom in-document popover rather than the platform select: it preserves full names and type context, stays inside the viewport, and supports arrow keys, Home/End, typeahead, Escape, outside click, and focus restoration.

Study Timetable orientation is a browser presentation preference scoped to the opaque workspace id. It is restored before paint where possible and never changes canonical schedule records or the mobile agenda. Canvas-backed module archive state remains canonical in PostgreSQL; the dashboard merely exposes owner-only restore/activate controls for the inactive projection.

The current API includes the initial snapshot plus owner-scoped paginated collections, CRUD operations, task completion and recurrence, group TODO review/edit/import/cancel, idea conversion, image delivery, search, shared settings, group collaboration, group availability polls, privacy export, and confirmed account deletion. Scheduling routes cover poll creation, the viewer's availability, manager finalization/reminders/closure, and the viewer's finalized Calendar event. Personal integration routes cover direct Calendar OAuth initiation, provider status, automatic-sync settings, Calendar backfill and task actions, and retained frozen Excel implementation.

Telegram exact-item and batch-review links first select the opaque authorized workspace, then open the intended task, note, idea, image, or `/dashboard?view=tasks&import=<id>` review instead of a generic landing page. The browser proxy accepts only bounded item/review paths and methods. The TODO sheet edits durable preview rows rather than synthesizing client-only tasks; successful import refreshes the canonical snapshot, so Telegram and the dashboard continue to query the same task records.

Telegram group messages cannot use ordinary `web_app` inline buttons. Find a time therefore uses the bot's Main Mini App and a bounded `startapp` parameter. After Telegram init-data verification, the server parses only the expected poll/create forms, selects the opaque workspace through the existing same-origin route, and falls back to the dashboard for malformed input.

External providers are mirrors rather than authoritative stores. A task or expense is committed in Threadwise first; a failed provider operation is recoverable and cannot erase that record. OAuth completion returns to the Connections view with a bounded result code rather than provider error details.

Deployment gates are:

1. Run lint, production builds, and the core service test suite.
2. Verify desktop and mobile demo flows in a real browser.
3. Configure Telegram OIDC origins/callbacks and Vercel secrets.
4. Verify real-user isolation with at least two Telegram accounts.
5. Verify personal/group workspace separation and owner/admin enforcement with at least two Telegram roles.
