# Threadwise Dashboard

Current dashboard release: **v0.10.0**

Documentation verified against the Threadwise stack: **2026-09-04**

Threadwise turns Telegram messages into things people can find, remember, and finish. The dashboard is its calm web surface for scanning, editing, and coordinating captured work.

Dashboard v0.10.0 is live at commit `c7746c5`, paired with backend v0.35.0 at `e4c50a2d7008`. The
additive backend migration/runtime was released and health-checked before this dashboard deployment.

New developers should start with [docs/DEVELOPER_ONBOARDING.md](docs/DEVELOPER_ONBOARDING.md).
The current cross-repository audit is in the backend at
[`docs/POST_RELEASE_CODE_UI_SECURITY_AUDIT_2026-08-31.md`](https://github.com/Henry336/threadwise/blob/main/docs/POST_RELEASE_CODE_UI_SECURITY_AUDIT_2026-08-31.md).

The application is intentionally a separate Next.js frontend and backend-for-frontend. Browsers never receive a Supabase connection string, service-role key, Telegram bot token, or provider refresh token.

## What is here

- A responsive public landing page and personalized dashboard
- An installable PWA shell for desktop taskbars and mobile home screens, with versioned Ari launcher icons and a generic offline recovery page
- A command-first capture/search surface with `Ctrl/Cmd + K`
- Personal Today, Tasks, Notes, Ideas, Images, Search, and Settings views
- On the owner-gated Today stack, one responsive Today/Carryover/Deadline-watch planner is shared across
  Personal, Group, and Study, with an atomic batch editor and exact authorized Telegram draft links
- Private morning-plan and evening-wrap-up consent in Personal Reminder settings, using branded time
  pickers; both controls default off and remain absent from shared Group settings
- Distinct group workspaces with Overview, Work, People, Progress, Activity, Resources, immediate assignments, unassigned claiming, creator/admin reassignment, and a seven-day summary
- A sealed, module-first Study workspace with Overview, Timetable, Work, Deep Work, Modules, Library, Search, Review, and Settings for the one configured owner and actively bound Study group
- A responsive, scrollable 24-hour Study Timetable that combines recurring module blocks, planned work, assignment deadlines, and optional class-travel configuration without pretending every deadline is a scheduled study block
- An explicit one-way Study Timetable mirror to primary Google Calendar, with branded data consent,
  automatic OAuth return/resume, sync health, manual retry, and non-destructive stop; Threadwise remains
  authoritative and travel-private data never enters Calendar
- Accessible amber overlap warnings in every timetable orientation, persistent touch details, and
  side-by-side vertical lanes; overlaps remain saveable and exact adjacency remains conflict-free
- One truthful weekday axis per Timetable orientation: Vertical keeps a week deadline shelf, while Horizontal puts a two-item Due rail beside each day and sends overflow to the day agenda
- Explicit inactive-module review and restore controls; Canvas refreshes never decide which courses belong in the active semester
- A visible ten-minute Telegram capture target plus a same-origin Study image lightbox with caption/search context and graceful retry, expiry, and sign-in states
- Threadwise-native Study notes with a full-screen inline rich Markdown/Mermaid editor, searchable
  Mermaid/UML help, deterministic easy syntax, visible native-SVG labels, per-diagram layout controls,
  Tab-indented lists/diagram source, and selection-safe encrypted
  cross-device draft recovery, `[[wiki links]]` and backlinks, bounded history, and portable `.md`
  import/export
- Personal notes reuse the same full-screen WYSIWYG Markdown/Mermaid/UML writing surface, `.md`
  import/export, and encrypted cross-device draft recovery, with one title-only filing decision and
  no artificial module or tag choice; Group note editing remains unchanged pending a shared-ownership design
- A sender/admin-controlled review sheet for group `TODO:` and `ACTION ITEMS:` batches, with editable tasks, dates, assignees, team owners, status, inclusion, and safe retry
- A chronological "threadline" for today and overdue work
- Real user-scoped creation, editing, completion, conversion, deletion, pagination, and settings updates
- A date-grouped image gallery with caption/OCR search, image-first cards, hidden searchable text, a keyboard-friendly viewer, and note conversion
- A viewport-safe custom workspace switcher with full names, workspace types, selection state, keyboard navigation, and light/dark parity
- Secondary Google Calendar connection management, automatic task sync, provider coverage, and contextual task actions
- Data export, integration disconnect, and confirmed account deletion controls
- Automatic Telegram Mini App login using server-verified signed launch data
- Telegram OIDC Authorization Code + PKCE login for external browsers
- Full-document Telegram login navigation so OAuth redirects are never intercepted by the Next.js client router
- Signed, HTTP-only sessions and a server-only Threadwise API adapter
- A realistic interactive demo at `/dashboard?demo=1`
- Staggered load-in motion, route transitions, skeletons, mobile sheets, light/dark themes, user accents, focus states, and reduced-motion support
- A public, plain-language privacy explanation at `/privacy`

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The demo works without credentials. Real accounts require the variables documented in `.env.example` and the private `/api/v1/dashboard` route in the bot service.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:browser
npm run security:scan-secrets
npm run security:audit
npm run security:audit:all
```

The main interaction paths are also checked in a real Chromium browser at desktop and mobile widths before production releases.

## Trust boundary

```text
Browser → Vercel Next.js BFF → private Render /api/v1 → Threadwise services → Supabase
              │
              └── Telegram Mini App or OIDC session
```

The dashboard identifies a user from Telegram's verified numeric `id` claim. Render derives the canonical Threadwise `userId`; resource requests never accept a browser-supplied `userId`. Group workspaces resolve through opaque workspace ids and require recorded membership plus a live Telegram membership check before any shared data is returned. Assignment takes effect immediately: an active member may claim unassigned work, assignees may complete or snooze their work, and only the task creator or a freshly verified Telegram owner/admin may assign or reassign an existing task. Accept, decline, block, and member handoff are no longer active mutations.

The installable shell does not turn Threadwise into an offline data store. Its service worker caches only versioned application and brand assets plus the generic offline page; authenticated navigation and `/api/*` responses remain network-only.

Study Mode adds a stricter boundary. Its workspace is discoverable only when the signed Telegram principal is the configured Study owner, the selected opaque workspace resolves to the configured chat, the group membership check succeeds, and the active database binding matches that chat. The same gate is repeated by every Study API route and protected resource request; direct links and forged calls receive an opaque not-found response. Canvas and Telegram credentials remain server-only.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DESIGN.md](docs/DESIGN.md), and the canonical [Threadwise product journal](https://github.com/Henry336/threadwise/blob/main/docs/PRODUCT_JOURNAL.md).

## Design provenance

The interface learns from Mobbin's ranked information hierarchy and progressive taxonomy, and from 21st.dev's command surfaces, filter controls, and data-shaped bento layouts. The visual identity, components, copy, and interaction details are original to Threadwise.

- [Mobbin](https://mobbin.com/)
- [21st.dev components](https://21st.dev/community/components)

## Deployment

Vercel is the intended host. Preview deployments can safely run in demo mode. Before enabling real login:

1. Register the production origin and exact `/api/auth/callback` URI in BotFather → Bot Settings → Web Login.
2. Add the Telegram OIDC credentials and `AUTH_SECRET` to Vercel.
3. Add the Ed25519 `DASHBOARD_API_PRIVATE_KEY` described in the architecture document.
4. Add the matching public verification key to the Render bot service and deploy its authenticated `/api/v1/dashboard/*` routes.

Dashboard login also depends on the backend browser-session registry. Deploy the additive backend
migration and routes before the dashboard consumer. A cookie issued before the revocable-session
release intentionally requires one fresh Telegram sign-in; subsequent logout revokes the server record
instead of merely deleting the local cookie. CSP enforcement is the default; use
`THREADWISE_CSP_MODE=report-only` only as a temporary rollback.

Never add database credentials to a `NEXT_PUBLIC_*` variable.
