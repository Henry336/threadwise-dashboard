# CLAUDE.md — Threadwise Dashboard (web)

Entry point for any AI or human contributor. Model-agnostic. Read this first, then the
pointers below. **Ground answers in the live code and deployment, not in this file.**

## What this is

The calm web surface for Threadwise — scanning, editing, and coordinating captured work.
Intentionally a **separate Next.js frontend + backend-for-frontend (BFF)** from the bot.
The backend/bot lives in the sibling repo `Henry336/threadwise`
(local path `D:\CodexProjects\Threadwise`, its own `CLAUDE.md`).

- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, `jose`, `zod`.
- Host: Vercel. Live: https://threadwise-dashboard.vercel.app
- The browser **never** receives a DB string, service-role key, bot token, or refresh token.

## Commands

```bash
npm run dev     # next dev (http://localhost:3000)
npm test        # vitest run
npm run lint    # eslint
npm run build   # next build
```

`/dashboard?demo=1` runs a realistic interactive demo with no credentials. Real accounts
need the variables in `.env.example` plus the private `/api/v1/dashboard` route on the bot.

## Layout

- `src/app/` — routes. `api/auth/*` (OIDC + Telegram Mini App login), `api/threadwise/[...path]`
  (server-only proxy to the bot), `api/workspace/select`, `dashboard/`, `privacy/`.
- `src/components/` — `dashboard-app`, `group-workspace`, `study-dashboard`, `study-timetable`,
  `task-import-review`, `group-scheduling`, Telegram auth, etc.
- `src/lib/` — `auth`, `threadwise-api` (server-only adapter), `proxy-allowlist`,
  `study-*` (access, week, timetable, types), `telegram-mini-app`, snapshot schema.
- Docs: `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/BRAND.md`, `README.md`, `PRODUCT.md`.
  Canonical product reasoning lives in the bot repo's `docs/PRODUCT_JOURNAL.md`.

## Trust boundary (do not weaken)

```
Browser → Vercel Next.js BFF → private Render /api/v1 → Threadwise services → Supabase
```

- Identify a user only from Telegram's verified numeric `id`. Render derives the canonical
  `userId`; **never** accept a browser-supplied `userId`.
- Group workspaces resolve via opaque workspace ids and require recorded membership **plus**
  a live Telegram membership check before returning shared data. Privileged mutations re-check
  the current Telegram owner/admin role.
- Study Mode is stricter and fails closed: signed principal must be the configured Study owner,
  the opaque workspace must resolve to the configured chat, membership check must pass, and the
  DB binding must match. Forged calls get an opaque not-found. Canvas/Telegram creds are server-only.
- Shared-work assignments take effect immediately. Members may claim unassigned work; assignees
  may complete or snooze; only the creator or a verified current Telegram owner/admin may assign
  or reassign. Legacy accept/decline/block/handoff records remain readable but are not active mutations.
- Telegram deep links must select the authorized workspace and open the exact record or review.
  Preserve the one-message/one-decision hierarchy instead of rebuilding button walls on the web.
- Never put DB credentials in a `NEXT_PUBLIC_*` variable.

## Continuity

The repository is the durable handoff, but do not assume a worktree is clean or pushed. Verify the
current branch, status, and remote before changing or publishing anything.
Secrets are **not** in git (`.env*` gitignored; `.env.example` documents them). Back these up
in a password manager — they cannot be recovered from the repo:
`AUTH_SECRET`, the Telegram OIDC client credentials, and the Ed25519 `DASHBOARD_API_PRIVATE_KEY`
(its public half is deployed to the Render bot). See `README.md` → Deployment and `docs/ARCHITECTURE.md`.

## Cross-AI handoff (Claude ↔ Codex)

The owner works between Claude Code and Codex interchangeably. Canonical context is this
`CLAUDE.md`; `AGENTS.md` (tracked) points here so Codex auto-loads it. **Whoever does work
updates the Working log below** (newest first: date, who, what, current state).

## Working log

- **2026-08-14 (Codex):** Replaced the Study module review's raw
  Module and Review type selects with the existing Threadwise choice popover, including selected
  checks, outside-click close, Escape, Arrow/Home/End navigation, and focus return. Removed the
  erroneous second-row span that made Review's Top three card stretch into a large empty panel.
  Focused UI regressions pass 4/4; the full dashboard suite passes 83/83; TypeScript, ESLint,
  production build, and diff checks pass. Dashboard code commit `615e38e` is pushed to `main`,
  Vercel reported the exact deployment successful, and the canonical `/dashboard` route is HTTP 200.

- **2026-08-14 (Codex):** Corrected live-reported visual regressions for the next coordinated
  release. Ari keeps all 42 registered/in-between frames but slows from a
  3.5-second/12-FPS loop to a gentler 5.6-second/7.5-FPS loop (2.5 authored anchors per second).
  Study Work search is normalized to the same 46px toolbar height after a later generic
  form rule re-inflated its nested input. Timetable schedule/deadline cards now render the actual
  title before module/time metadata, including narrow horizontal blocks, instead of replacing
  narrow titles with generated initials. The regenerated asset remains 1,661,414 bytes with square
  transparent frames; 81 tests, TypeScript, full ESLint, production build, and `git diff --check`
  pass. Commit `efb709e` is pushed to `origin/main`; Vercel reported a successful production
  deployment, `/dashboard` returns HTTP 200, and the live WebP returns HTTP 200 as `image/webp`
  with the expected 1,661,414-byte body. The live manifest reports 42 frames, 7.5 FPS, 2.5
  authored anchors per second, and a 5.6-second loop.

- **2026-08-13 (Codex):** Implemented the Phase 5 Study review surface locally: explicit
  Connections/Quiz/Both selection, cited Canvas/session/note evidence with provenance, cautious pace,
  misconception clarification, expandable challenge answers, and manually editable apply/dismiss note
  proposals. Nothing edits a note without confirmation. All 76 tests, TypeScript, lint, and production
  build pass. Commit `7c018e1` has a successful Vercel deployment status and the canonical
  production dashboard returns HTTP 200.

- **2026-08-13 (Codex):** Updated Study module-review availability copy for the backend's new
  server-side Gemini provider while preserving cached-result behavior and the protected proxy.
  Dashboard tests remain 74/74; TypeScript, full lint, and production build pass. Commit
  `d215e7f` is Ready on Vercel and the production dashboard returns HTTP 200.

- **2026-08-13 (Codex):** Added exact reminder-time editing and explicit Everyone/Unassigned
  group audiences. Task sheets keep deadline, automatic rhythm, and up to 20 exact times together;
  group assignment retains named members without conflating everyone with unassigned work.
  All 74 tests, TypeScript, full lint, production build, and desktop/mobile browser QA pass.
  Dashboard commit `1377505` is Ready on Vercel and the production alias returns HTTP 200.

- **2026-08-13 (Codex):** Added Canvas sync coverage to Study settings. The latest successful
  backend summary now shows courses, assignments, course modules, and indexed materials, and
  explicitly identifies open assignments waiting for course activation. Dashboard tests remain
  73/73; TypeScript, targeted lint, and production build pass.

- **2026-08-13 (Codex):** Implemented and locally validated the timetable reliability bundle:
  refreshes no longer steal editor focus; timetable sheets use a body portal, uniform scrim,
  and viewport-bounded geometry; absent create destinations no longer send invalid null place
  IDs; location guidance is plain-language; horizontal blocks prioritize their title and size
  per collision group. Tests pass 73/73; TypeScript, changed-file lint, build, detector, and
  bounded desktop/mobile browser QA pass. Full lint retains two unrelated existing findings.

- **2026-08-13 (Codex):** Added future public-Study constraints to the sibling backend's
  `PROJECT_CONTEXT.md`; no dashboard runtime code changed. The current sealed Study dashboard
  remains private, while future work must avoid singleton authorization and prepare separate,
  tenant-scoped Study identity and Canvas OAuth without activating it.

- **2026-08-13 (Codex):** The active cross-repository implementation ledger now lives at
  `D:\CodexProjects\Threadwise\PROJECT_CONTEXT.md`; no dashboard product code changed.
  It records the focus-loss, overlay, location validation, title-density, and
  per-collision-group lane defects plus the broader Study/Group roadmap. Update it before
  implementation, after each material checkpoint, and before an interrupted stop.

- **2026-08-13 (Codex):** Added an opt-in, evidence-backed module review to Deep Work. The UI
  reads cached results on module change, requests analysis only on an explicit action, polls only
  active jobs, and ties every finding to numbered session/resource evidence with honest stale,
  offline, failed, and limitation states. All 71 tests pass serially; changed-file lint, production
  build, and the Impeccable detector are clean.

- **2026-08-12 (Codex):** Made Deep Work a persistent Study-shell companion rather than a
  route-blocking timer. The Deep Work control center now supports structured focus styles and
  techniques, custom topics, module-resource linking, exact editable session history, outcomes,
  and owner-only soft archiving. TypeScript, changed-file lint, 63 tests, production build, and
  the Impeccable detector pass; the paired backend owns all canonical records and authorization.

- **2026-08-11 (Codex):** Added canonical NUS destination autocomplete to Study timetable editing. The protected BFF now permits bounded place search; the accessible combobox debounces and aborts requests, groups venues/stops, persists canonical ids, and marks unresolved labels without enabling reminders. Focused proxy/component tests, TypeScript, production build, and the Impeccable detector pass; repository-wide lint still reports the documented pre-existing `dashboard-app.tsx` effect error and `group-workspace.tsx` warning.

- **2026-08-11 (Codex):** Hardened the installed dashboard and Study surfaces: replaced the
  native workspace select with an accessible custom popover, fixed narrow topbar and Find-a-time
  action hierarchy, versioned PWA icons, registered/slowed the Ari loader, repaired Study filters,
  persisted timetable orientation per workspace, exposed inactive-module restore controls, and
  rebuilt Study image cards/viewer around optional captions and hidden-but-searchable OCR. The
  exact older 3D icon set was not recoverable from Git, unreachable objects, temp files, or known
  attachments, so current approved artwork remains rather than inventing a substitute.

- **2026-08-11 (Codex):** Added the installable PWA shell with approved Ari launcher assets and a
  privacy-safe static-only service worker. Removed redundant explanatory copy across personal,
  group, Study, and demo views; personal Overview now receives one deterministic daily line.

- **2026-08-11 (Codex):** Contained vertical wheel input inside the Horizontal Timetable even at
  the left/right boundaries, preventing page jumps. Frozen day labels are now keyboard-accessible
  controls that open the same day agenda used by Vertical mode.

- **2026-08-11 (Codex):** Removed the per-row edge shadows from the frozen Horizontal Timetable
  Deadlines pane. Its existing 1px divider now carries the boundary without repeated semicircular
  shading artifacts.

- **2026-08-11 (Codex):** Added bounded wheel-to-horizontal panning inside the Horizontal Study
  Timetable. Mouse-wheel and trackpad input move the time axis and remain contained at either
  boundary instead of shifting the surrounding page.

- **2026-08-10 (Codex):** Refined Study Timetable horizontal context: Day and Deadlines now remain
  frozen beneath a pinned time ruler, today has a teal row treatment distinct from the orange NOW
  marker, existing blocks open in read-only details before editing, and duration-accurate cards use
  narrow/compact/full density tiers. Added focused state, width, overlap, and midnight tests plus
  desktop/mobile, light/dark visual verification.

- **2026-08-10 (Codex):** Expanded Study Timetable to a scrollable 24-hour schedule in both desktop orientations, reserved/clamped the live-time indicator, and kept mobile on the day agenda. Replaced raw Study-image navigation with a same-origin lightbox and explicit retry/expiry/session states. Added the visible ten-minute Telegram capture-target status and updated architecture/design/release notes.

- **2026-08-10 (Codex):** Completed the coordinated Study reliability pass. Horizontal Timetable
  now has one weekday axis and a two-item per-row Deadlines rail; vertical mode keeps the week shelf.
  Inactive/Canvas-discovered modules have explicit Restore or Activate controls and remain absent
  from active semester projections supplied by the backend.
- **2026-08-10 (Codex):** Repaired the Study Timetable's structural alignment by giving the
  weekday strip the same 84px time rail as the deadline and clock grids. Added NUSMods-style
  Vertical and Horizontal week orientations over one schedule model; weekday controls now open
  the selected day agenda instead of changing invisible state. Mobile keeps its rail-free,
  touch-friendly day agenda rather than squeezing either desktop grid onto a phone.
- **2026-08-10 (Codex):** Reconciled current product, architecture, interaction, and contributor
  documentation with dashboard v0.9.0 and backend v0.32.0. Documented exact deep-link continuation,
  immediate group assignments, progressive action hierarchy, the private Study Timetable, and
  Beacon's intentional absence from the web product. Historical changelog entries remain historical.
- **2026-08-09 (Codex):** Refactored shared-work interaction hierarchy. Telegram/dashboard links now
  target exact records; assignment acceptance, decline, blocked, and member handoff controls were
  removed from active UI; unassigned claiming and creator/admin reassignment remain.
- **2026-08-06 (Claude):** Created this canonical `CLAUDE.md` + `AGENTS.md` pointer as part of a
  continuity pass across both Threadwise repos. Documented the trust boundary and the secrets to
  back up (`AUTH_SECRET`, Telegram OIDC creds, `DASHBOARD_API_PRIVATE_KEY`). No code changes.
