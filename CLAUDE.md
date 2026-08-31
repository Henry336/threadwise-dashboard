# CLAUDE.md — Threadwise Dashboard (web)

Entry point for any AI or human contributor. Model-agnostic. Read this first, then the
pointers below. **Ground answers in the live code and deployment, not in this file.**

## Latest implementation checkpoint

- **2026-08-31 (Codex, deployed):** Hardened the Study rich editor against selection loss by
  separating locally emitted Markdown from genuine external replacements. Added Tab/Shift+Tab nesting
  for lists and indentation for Mermaid/code lines, plus a searchable responsive Mermaid/UML guide with
  insertable examples. UML remains Mermaid-native and local; no PlantUML service or trust-boundary
  expansion was added. Runtime `e9e21b192f15` passed GitHub CI run `33353462062` and completed its
  Vercel production deployment; the canonical dashboard returns HTTP 200. All 162 unit/regression tests,
  72 security checks, typecheck, lint, production build, secret/dependency scans, and browser checks
  (8 passed, 2 intentional skips) are green.

- **2026-08-31 (Codex, deployed and audited):** Released dashboard runtime `b81f57fc3594` after
  backend runtime `0adbf0be688f`: one Study Overview writing entry point, a near/full-screen inline
  Markdown/Mermaid editor, encrypted cross-device autosave/conflicts, title/module filing, and
  compatibility-safe visible tag retirement. Added `docs/DEVELOPER_ONBOARDING.md` and linked the
  backend cross-repository post-release audit. No critical issue or confirmed regression was found;
  current CSP, session-revocation, mobile accessible-name, filing-focus, abrupt-close, long-note
  performance, behavioral-test, native-selector, and large-component findings remain documented and
  intentionally unfixed in this audit pass.

- **2026-08-28 (Codex, deployed):** Corrected cross-mode Today typography after the shared planner referenced
  an undefined display-font token and fell back to body sans. Planner and agenda headings now use the
  established serif token in Personal, Group, and Study; the Study variant also inherits Study blue
  rather than Personal purple. Runtime commit `c8c55c4` completed its Vercel production deployment.

- **2026-08-28 (Codex, deployed):** The expanded Phase 1–3 dashboard acceptance gate now
  passes: 139 unit/regression tests, typecheck, lint, optimized production build, secret scan, and
  release-artifact Playwright coverage with 7 passes and 1 intentional mobile command-palette skip.
  Personal briefing consent is covered at laptop/mobile widths with branded keyboard-accessible time
  pickers and exact draft routing. Dashboard `eac5844` is successful on Vercel with hosted validate
  and browser checks green; paired backend `0ab4c9cffced` is live on Render after additive migrations.

- **2026-08-28 (Codex, guarded):** Reconciled README, product, architecture, changelog, contributor
  handoff, and tracked `.21st` decisions with the paired Phase 1–3 Today stack. Documentation now
  distinguishes implemented/tested guarded behavior from production and treats the expanded
  acceptance matrix as a pre-merge gate. No runtime, merge, or deployment changed in this pass.

- **2026-08-21 (Codex, deployed):** Added an accessible Overview quote manager to personal
  Settings → General. Personal lines with optional attribution join the built-in deterministic
  daily rotation; the UI supports explicit add/remove/save, responsive desktop/mobile layouts, and
  a 40-entry limit. All 125 tests, typecheck, lint, production build, 52 security checks, secret
  scan, dependency audits, and real-browser desktop/mobile QA pass. Dashboard runtime `fc2cf64`
  completed its Vercel production deployment after paired backend runtime `3860db8` became live.
- **2026-08-18 (Codex, deployed):** Dashboard PR #2 merged as
  `b00a3d15660a5714852a7a4096387f6995127845` after the paired backend and all 60 production
  migrations were healthy. Vercel reported the production deployment complete and the canonical
  `/dashboard?demo=1` route returned HTTP 200. The released stack includes the guarded Phase 3-7
  work plus the branded Work picker, desktop sidebar/image-viewer improvements, theme-aware Study
  scrollbars, and the release test-discovery correction. Paired backend production commit is
  `0699835d8ffe2132e8ce29dd03496d8fada71538`. Historical Canvas-token rotation remains an operator
  follow-up; CSP intentionally remains report-only and destructive privacy backfill/retention did
  not run.
- **2026-08-18 (Codex):** Full guarded-stack release is authorized and dashboard PR #2 is open.
  GitHub's Linux validate job revealed that Vitest's default discovery included the Playwright
  `e2e` spec even though browser checks have a separate job. The unit-test command now explicitly
  excludes `e2e/**`; locally all 122 Vitest tests and the independent Playwright suite (5 passed,
  one intentional mobile skip) pass. Hosted CI rerun and the paired backend Gate 3A recovery proof
  remain required before merge/deployment.
- **2026-08-18 (Codex):** Replaced the browser-default Study sidebar and horizontal-timetable
  scrollbars with scoped, theme-adaptive Threadwise styling on guarded branch
  `codex/study-image-sidebar-coursemology`. The native overflow model remains intact; Firefox and
  WebKit receive rounded token-derived thumbs and transparent tracks, while the mobile drawer still
  hides its scrollbar. Validation passes 122 tests, typecheck, lint, build, secret scan, and
  Playwright (5 passed, one intentional mobile skip). The Impeccable detector reported only two
  unrelated pre-existing side-border warnings. Nothing was deployed or merged.
- **2026-08-17 (Codex):** Added an accessible, persisted laptop/desktop Study sidebar toggle and a
  two-stage Library image viewer on guarded branch `codex/study-image-sidebar-coursemology`. Images
  open fitted for orientation, then click or **Full size** reveals natural pixels in a full-viewport
  scrollable canvas; Escape returns to fit before closing. Mobile keeps its independent drawer.
  Validation passes 121 tests, typecheck, lint, build, secret/dependency scans, and Playwright
  (5 passed, one intentional mobile skip). Nothing was deployed or merged.
- **2026-08-17 (Codex):** Replaced the Study Work module filter's browser-native menu with the
  existing accessible branded `StudyChoicePicker` on guarded branch
  `codex/post-phase7-work-filter-audit`, preserving the internal `all` value and responsive layout.
  Dashboard validation passes 119 tests, 52 focused security checks, 5 Playwright checks with one
  intentional skip, typecheck/lint/build, secret scan, and both zero-finding dependency audits. The
  paired backend report is `docs/POST_PHASE7_CODEBASE_AUDIT.md`; nothing was deployed.
- **2026-08-17 (Codex):** Completed the Phase 7 public Study dashboard architecture boundary on
  guarded branch `codex/phase7-public-study-architecture` in commit `16687b3`, paired with backend
  architecture `77739bd`. It preserves the BFF as the credential-free browser boundary, treats the
  selected workspace as a candidate only, defines capability-driven public Study UX, OAuth-only
  Canvas connection handling, tenant-scoped drafts/caches, multi-tenant validation, and founder
  exclusion from cohort discovery. Documentation only; no runtime, deployment, or production state
  changed.
- **2026-08-17 (Codex):** Completed the guarded Phase 5 browser-hardening implementation:
  report-only nonce CSP with a documented enforcement gate, seven-day owner/workspace-scoped drafts
  and logout cleanup, explicit consent before loading remote Markdown images, bounded/deferred safe
  Mermaid rendering, CI secret/dependency scans, and production Chromium desktop/mobile smoke tests.
  Final validation passed all 99 tests, TypeScript, ESLint, build, five browser checks with one
  intentional mobile skip, and zero-finding full/production audits. Nothing was deployed.

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
npm run typecheck
npm run lint    # eslint
npm run build   # next build
npm run test:browser
npm run security:scan-secrets
npm run security:audit
npm run security:audit:all
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

- **2026-08-31 (Codex, deployed):** Fixed intermittent Study editor selection resets, stabilized the parent body
  callback, added accessible diagram-help disclosure/Escape behavior, portable list/code indentation,
  and 12 browser-validated Mermaid/UML templates with a 38-entry quick reference. Runtime `e9e21b1`
  is live after complete local and hosted gates; only this documentation checkpoint follows it.

- **2026-08-31 (Codex):** Completed a post-release static, dependency, test, and live responsive
  audit across both repos. Added the dashboard developer map; reconciled README, architecture, CSP
  evidence, changelog, and handoff. Runtime behavior was deliberately unchanged. All 153 unit tests,
  typecheck, lint, independent production build, 7 browser passes plus 1 intentional mobile skip,
  secret scan, and both dependency audits pass.

- **2026-08-31 (Codex):** Implemented and released the approved Study-first note-writing trial
  without 21st.dev: one Overview entry point, a near/full-screen inline rich Markdown/Mermaid editor,
  encrypted cross-device autosave with conflict status, a title/module filing sheet, and
  compatibility-safe retirement of visible note/idea tags across modes. Backend released first.

- **2026-08-28 (Codex):** Fixed the shared Today planner's cross-mode design-system drift: its main
  and agenda headings now use `--serif` instead of the nonexistent `--font-display`, and Study scopes
  the shared accent to `--study-blue`. Added a regression guard that rejects the undefined token.
  All 139 tests, typecheck, lint, optimized production build, tracked-secret scan, and diff checks
  pass. Runtime commit `c8c55c4` is pushed to `main`, and Vercel reports its production deployment
  successful.

- **2026-08-28 (Codex):** Implemented Phase 3 private briefing consent on guarded branch
  `codex/phase3-today-delivery-notes`. Personal Reminder settings now provide two off-by-default
  morning/evening digest switches with branded time pickers and clear cross-mode/quiet-hours copy;
  Group settings cannot submit these private fields. Typecheck, lint, 139 tests, isolated production
  build, secret scan, and browser smoke (5 passed, 1 intentional mobile skip) pass. The paired backend
  scheduler remains owner-gated; no merge or deployment occurred.

- **2026-08-28 (Codex):** Implemented the Phase 2 cross-mode Today planner on guarded branch
  `codex/phase2-today-interactions`. Personal, Group, and Study overviews now share a responsive
  Today/Carryover/Deadline-watch surface, progressive batch editor, exact Telegram draft hydration,
  atomic save, branded Study module picker, and one-tap audited carryover planning. The feature hides
  cleanly when the paired backend owner gate is unavailable. Typecheck, lint, 138 tests, optimized
  build, and browser smoke (5 passed, 1 intentional mobile skip) pass. No merge or deployment occurred.

- **2026-08-25 (Codex):** Implemented the paired Phase 1 trust UI on
  `codex/phase1-reliability-foundation`. Work remains the canonical complete assignment view and
  now labels suspicious Canvas deadlines for confirmation; quarantined deadlines stay out of the
  timetable. Block details expose reminder readiness and reasons. Recurring deletion offers this
  week, this-and-future, or the entire series. Personal and Group destructive actions share one
  accessible branded confirmation provider, and no runtime native confirm/alert remains. Added
  regression detection and timetable exclusion tests. Typecheck, lint, isolated production build,
  secret scan, focused tests, and all 127 tests pass. Final documentation and push remain in
  progress.

- **2026-08-21 (Codex):** Personal Overview quote manager is implementation-complete on
  `codex/personal-overview-quotes`. The two owner-supplied attributed lines join the built-in set;
  saved personal lines use the paired backend `overviewQuotes` setting and remain stable for each
  local date. The UI passed desktop and 390×844 browser QA plus all unit, type, lint, build, secret,
  security, and dependency gates. Backend runtime `3860db8` and dashboard runtime `fc2cf64`
  are deployed; only this documentation-only release record follows them.

- **2026-08-17 (Codex):** Phase 7 dashboard boundary commit `16687b3` is complete on
  `codex/phase7-public-study-architecture`, paired with backend architecture `77739bd`.
  `docs/PUBLIC_STUDY_DASHBOARD_BOUNDARY.md` keeps credentials server-only, backend authorization
  authoritative, the workspace cookie non-authoritative, and the founder workspace absent from
  public cohort discovery. F-02 replay control, F-03 rate limits, hosted synthetic staging, and
  explicit Stage 7.1 approval remain required. No code, config, secret, bot, deployment, or
  production state changed.

- **2026-08-17 (Codex):** Phase 6 dashboard assurance commit `bf9c948` is pushed on
  `codex/phase6-security-assurance`: direct tests now cover session tampering/expiry, BFF
  path/method/origin/JSON/size boundaries, dangerous Markdown protocols, and Mermaid exhaustion.
  Focused assurance passed 52, the full suite passed 118, Chromium passed 5 with one intentional
  mobile skip, and TypeScript/ESLint/build/secret/dependency gates passed. Security behavior was
  only extracted into testable helpers; no production deploy occurred. The backend Phase 6 report
  records the unresolved findings and hosted-staging boundary. No PR or deployment was created;
  manual remote CI awaits GitHub CLI re-authentication.

- **2026-08-17 (Codex):** Completed security remediation Phase 1B in runtime commit `5bf0ab4`.
  Next.js and its ESLint config moved from `16.2.10` to stable patch `16.2.12`; shipped Nano ID,
  PostCSS, and Sharp paths are pinned to patched versions. The production audit moved from four
  high findings to zero. Focused proxy/access/schema tests pass 35/35; all 91 tests, TypeScript,
  ESLint, isolated optimized build, Vercel exact-commit deployment, and canonical `/dashboard`
  HTTP 200 pass. Two development-only audit findings remain outside the shipped graph and were not
  force-overridden across incompatible ranges. The paired backend Phase 1A runtime is `5630f1e`.

- **2026-08-17 (Codex):** The paired backend now tracks the planning-only cross-repository security
  remediation sequence in `D:\CodexProjects\Threadwise\docs\SECURITY_REMEDIATION_ROADMAP.md`,
  linked from its `PROJECT_CONTEXT.md`. It defines seven phases, validation/rollback and handoff
  gates, staging-first active testing, bounded production inspection, and cost-conscious model
  routing. No dashboard code, dependency, configuration, deployment, or remediation phase changed.

- **2026-08-17 (Codex, validated locally):** Study Library notes now open as portable Markdown
  documents with safe GFM/Mermaid rendering, wiki links/backlinks, local unsaved-draft recovery,
  Write/Preview/Split editing, bounded version recovery, optimistic conflict protection, and `.md`
  import/export. Raw HTML/plugins/scripts remain disabled and Telegram receives a readable backend
  fallback. All 91 tests, non-incremental TypeScript, full ESLint, and an isolated optimized production
  build pass. Runtime commit `14b691b` is pushed, GitHub reports its Vercel deployment successful,
  and the canonical `/dashboard` route returns HTTP 200. Paired backend commit `13b2431` is live on
  Render with its additive migration and HTTP 200 health.

- **2026-08-16 (Codex, deployed):** Weekly review now uses a uniform non-blurred scrim, a
  zoom-resilient proportional wide sheet, and fixed header/progress/footer rows around one bounded
  scrollable step body. A fourteen-module browser fixture reaches the final row at both normal and
  expanded CSS viewports without moving the wizard chrome. All 88 tests, TypeScript, full ESLint,
  optimized production build, and diff checks pass. Runtime commit `d928ef9` is pushed to
  `origin/main`; Vercel reports success and the canonical `/dashboard` route returns HTTP 200.

- **2026-08-15 (Codex, validated locally):** Replaced every browser-native selector in the Study
  timetable block editor (module, type, day, start/end time, and usual origin) with the shared
  accessible Threadwise choice popover; existing non-quarter-hour values remain selectable. The
  laptop day agenda now opens block details from the entire keyboard-accessible row. Personal
  Reminder settings now distinguish regular follow-ups from near-deadline warnings, explain the
  ordinary-reminder safety limit accurately, and keep neighboring numeric inputs at one control
  height. The shared personal/group exact-reminder editor is compact when empty and reveals rows
  only when added. All 87 tests, TypeScript, full ESLint, production build, and diff checks pass.

- **2026-08-14 (Codex, validated locally):** Corrected the live Review, timetable, and Ari defects.
  Top three is now one semantic form with aligned content and a distinct desktop/mobile action footer.
  Horizontal cards reserve up to three lines for the real title before optional module/location data;
  redundant visible time is removed but remains in the accessible label/details, and Up next is also
  title-first. Ari v6 keeps 42 registered frames but spreads them over 6.09 seconds, normalizes the
  source's alternating closed-eye poses to authored open eyes, and uses exactly one deliberate 330 ms
  blink per loop. Focused tests pass 9/9; full dashboard tests pass 83/83; TypeScript, ESLint, production
  build, generator validation, frame-by-frame contact-sheet review, and diff checks pass. Paired backend
  validation passes 858 tests plus 6 skips and now recovers through configured OpenAI fallback models
  while preserving safe key/quota/rate/permission diagnostics. Dashboard runtime commit `313fa9d` is
  pushed and its Vercel deployment completed successfully; `/dashboard` and the 1,663,568-byte v6 WebP
  both return HTTP 200. Backend runtime commit `8e6a87d` is live on Render. An authenticated Study
  request remains the final proof of the deployed OpenAI project's current quota/permission state.

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
