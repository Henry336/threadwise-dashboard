# Dashboard architecture

Updated: 2026-08-31

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

Optional content encryption is owned entirely by the Render backend's Prisma boundary. Vercel and the browser receive already decrypted, authorization-scoped response data and never receive `CONTENT_ENCRYPTION_KEY`, ciphertext search keys, or blind-token internals. Consequently, enabling backend encryption does not change dashboard routes, cookies, synchronization, or client-side rendering contracts.

Saved-image bytes follow an owner-scoped server path: Browser → Vercel BFF → Render → Telegram. Render performs the authenticated lookup, enforces raster-only media and a bounded download, then streams bytes with defensive browser headers. When Telegram reports a generic MIME type, the proxy identifies supported raster formats from bounded byte signatures before responding; the browser repeats that defensive check before creating an object URL. Neither the bot token nor Telegram file ID crosses into Vercel or the browser.

Mutations are accepted only through the same-origin Vercel BFF. Each Render route validates a short-lived Ed25519 service token and resolves the user from its verified Telegram subject before performing any database operation.

## Owner-gated Today projection

The deployed Phase 1–3 stack exposes one `TodayPlanner` across Personal, Group, and Study. The browser
does not create a second to-do store: it projects existing personal tasks, assigned group tasks, and
Study work into Today, derived Carryover, and Deadline watch. Planned day remains independent from
deadline and reminder state. Batch edits stay inside one durable server draft and commit atomically;
exact Telegram links select the authorized workspace and draft before opening the editor.

Morning-plan and evening-wrap-up consent belongs only to Personal Reminder settings because the
digest privately combines the signed-in user's work across modes. Both switches default off, use the
branded accessible time picker, and retain quiet-hours copy. Group settings deliberately omit these
fields. The corresponding backend routes remain fail-closed behind
`TODAY_FOUNDATION_OWNER_TELEGRAM_ID`; this live projection remains fail-closed and owner-only.

Personal Today ordering is a private projection layered over that cross-mode agenda. The browser sends
the complete current Today ID order, the one moved entry, and its observed revision through the narrow
`PATCH today/order` proxy path. Optimistic movement rolls back on conflict. Dedicated handles support
pointer, delayed touch, and keyboard sorting, while compact Move to top/up/down controls provide an
explicit alternative across five-item page boundaries. Group and Study views receive
`reorderable=false`, so this pilot cannot imply or mutate shared priority.

## Private Study projection

Active Deep Work is shell-level state rather than a separate browser-owned timer. The dashboard derives the current session from the canonical Study snapshot and renders one compact companion across Study routes, so navigation never stops timing or hides module material. Start, finish, correction, resource-linking, and archive actions pass through the protected same-origin proxy to the backend. Structured focus styles and techniques are presentation choices stored on the session record; the browser neither infers mastery nor performs AI analysis. Reconciliation replaces optimistic state with the next canonical snapshot after each mutation.

Module review is an optional read-mostly projection layered beside Deep Work, not inside its timing or completion state. The allowlisted same-origin proxy forwards protected `GET` and `POST /api/threadwise/study/modules/:moduleId/analysis` requests: `GET` reads the latest cached response, and only an explicit `POST` asks the backend to analyze current evidence. `src/lib/study-analysis.ts` centralizes eligibility, reason copy, and Analyze/Update/Retry decisions. The component polls only queued or running jobs, keys responses to the selected module, and renders backend-issued evidence references rather than attempting browser-side inference. No Gemini credential or raw worker capability reaches the dashboard.

Study Mode is discoverable only when the signed Telegram principal is the configured Study owner, the opaque workspace resolves to the configured Study chat, current Telegram membership succeeds, and the active database binding agrees. Every Study snapshot, search, protected-file request, and mutation repeats the backend gate; unauthorized direct routes receive the same opaque not-found response as a missing workspace.

The Study shell exposes Overview, Timetable, Work, Deep Work, Modules, Library, Search, Review, and Settings. Timetable builds scrollable 00:00–24:00 week/day views from recurring class or study blocks plus planned work, renders assignment deadlines in a distinct lane, and supports module-week ranges and optional class-travel configuration. It positions the initial viewport near the current or earliest relevant block and clamps current-time markers inside a dedicated rail. Travel origins are managed in Settings and class blocks may store a destination, normal origin, and travel buffer. All surfaces mutate the same PostgreSQL records used by Telegram; server-sent events request reconciliation rather than maintaining a second browser-owned copy.

Timetable can also import a canonical NUSMods semester share link through the same-origin Study proxy. The browser submits only the URL; the protected backend parses the selected lesson types and class numbers, retrieves the public module data, and owns source-scoped reconciliation. The dashboard does not duplicate NUSMods parsing or receive provider credentials. Imported blocks then appear through the normal snapshot and realtime reconciliation path alongside untouched manual blocks.

Destination search crosses the trust boundary through the same protected BFF, using `GET /api/threadwise/study/places`. The backend owns aliases, canonical ids, coordinates, type, ambiguity, and nearby-stop ranking; the dashboard owns only the debounced accessible combobox state. Stale browser requests are aborted. Selecting a suggestion stores its canonical id with the schedule block. Unresolved labels remain visible for editing but are not treated as routable and therefore cannot enable a proactive class-travel reminder.

Study images remain behind the same owner/group gate. The browser requests media through the same-origin Vercel proxy and receives an object URL only inside the Library lightbox; object URLs are revoked on close. The backend resolves fresh Telegram metadata, so the dashboard distinguishes missing media, expired authorization, and retryable provider failure without exposing a Telegram file id or bot token.

Study notes remain canonical backend `StudyResource` records rather than becoming browser-owned documents. The Library detail request returns one authorization-scoped note plus bounded revisions and workspace-local link metadata. The Study writing space keeps portable Markdown as its canonical body while Tiptap renders headings, emphasis, underline, lists, checklists, links, tables, code, and Mermaid inline; there is no separate preview mode. The controlled editor tracks the last locally emitted Markdown body, so normal parent/autosave renders do not call `setContent` or reset the current selection; only a body that differs from both the local emission and current editor state is treated as an external replacement. Tab/Shift+Tab uses Tiptap list commands or edits selected code-block lines with a two-space portable indent, while returning `false` in ordinary prose so browser focus traversal remains available. New and existing note drafts autosave through the same-origin BFF into encrypted, owner/workspace-scoped backend rows that expire after seven days and reject stale device revisions. Existing-note drafts retain the filed note revision they started from, so recovery cannot silently overwrite a newer canonical note. The browser never stores the cross-device body in a second searchable collection. Final Save asks only for title and module, writes the existing `StudyResource`, and clears the scratch draft after success. Weekly review continues using its separate versioned local envelope. Import accepts at most one bounded `.md` file and parses only conservative frontmatter; export writes portable Markdown metadata. Rendering uses GFM with raw HTML disabled. Same-origin images load normally, remote HTTPS images require explicit one-time consent with an origin disclosure, and insecure, protocol-relative, or embedded-data image payloads are blocked. Mermaid rendering is deferred until near the viewport, serialized, time-bounded, and rejected before import when source size, line, statement, or configuration-directive budgets fail; accepted diagrams still run in strict mode and their SVG is sanitized before insertion. The local syntax guide inserts examples for Mermaid flowcharts and data/planning diagrams plus Mermaid-native UML class, sequence, and state grammars. It does not add PlantUML, remote rendering, configuration directives, or a second trust boundary. `[[wiki links]]` are converted only outside code fences and inline code, and unresolved targets stay visibly inert instead of navigating to guessed records. Visible note/idea tags are retired in every mode; legacy API fields remain type-compatible while current UI sends no tags.

Browser responses stage a request-nonce Content Security Policy in report-only mode by default. The policy carries no `unsafe-inline` or `unsafe-eval`, supplies the nonce to Next.js and the Telegram bootstrap script, and keeps object embedding and framing disabled. Operators must inspect report-only violations and complete browser validation before setting `THREADWISE_CSP_MODE=enforce`; that explicit switch is separate from deployment. Static-only service-worker caching remains unchanged and never caches authenticated API or navigation responses.

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
