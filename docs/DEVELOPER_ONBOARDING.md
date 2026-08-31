# Threadwise dashboard developer onboarding

Updated: 2026-08-31 SGT

This repository is the browser and backend-for-frontend half of Threadwise. The canonical data,
Telegram bot, domain services, Prisma schema, encryption keys, and provider credentials live in the
sibling backend repository `Henry336/threadwise`.

## Read in this order

1. `CLAUDE.md` for current contributor rules and deployment checkpoints.
2. `README.md` for setup, product surface, and trust boundary.
3. This file for the code map and safe-change workflow.
4. `docs/ARCHITECTURE.md` for the detailed browser/BFF contract.
5. `docs/DESIGN.md`, `docs/BRAND.md`, and `.21st/DESIGN.md` for UI decisions.
6. `docs/CSP_ROLLOUT.md` before changing CSP or dynamic styling.
7. Backend `docs/POST_RELEASE_CODE_UI_SECURITY_AUDIT_2026-08-31.md` for current cross-repo findings.

Older changelog/checkpoint entries are historical. Ground decisions in current source and live
headers, then update the handoff when truth changes.

## Runtime map

| Area | Primary files | Responsibility |
| --- | --- | --- |
| Route entry | `src/app/dashboard/page.tsx` | Auth/demo selection, initial snapshot, startup failures |
| Personal/group shell | `src/components/dashboard-app.tsx` | Navigation, Personal and Group composition, shared dialogs |
| Study shell | `src/components/study-dashboard.tsx` | Study navigation, synchronization, and feature composition |
| Study Deep Work | `src/components/study-deep-work.tsx` | Session builder/history/editor and module analysis |
| Study dialogs | `src/components/study-dialog.tsx`, `confirmation-dialog.tsx`, `src/lib/body-scroll-lock.ts` | Shared focus traps, dirty-close confirmation, background isolation, and reference-counted scroll restoration |
| Timetable | `src/components/study-timetable.tsx` | Week/day layout, block/details/editor state |
| Today | `src/components/today-planner.tsx` | Cross-mode agenda projection and Personal ordering |
| Study writing | `study-note-editor.tsx`, `study-rich-note-body.tsx`, `study-markdown-media.tsx` | Draft lifecycle, Tiptap Markdown, Mermaid/media |
| Browser BFF | `src/app/api/threadwise/[...path]/route.ts` | Session, same-origin mutation check, path/method allowlist, body caps |
| Server API client | `src/lib/threadwise-api.ts` | 60-second EdDSA service tokens and backend response parsing |
| Authentication | `src/lib/auth.ts`, `src/lib/browser-session-registry.ts`, `src/app/api/auth/*` | Telegram proof, signed cookie, backend revocation check, logout |
| CSP/PWA | `src/proxy.ts`, `src/lib/content-security-policy.ts`, `public/sw.js` | Enforced nonce policy and static-only offline shell |
| Contracts | `src/lib/types.ts`, `study-types.ts`, snapshot schemas, backend `src/dashboard/study.ts` | Browser-facing DTOs and validation; Study drafts are explicitly minimized server-side |
| Styling | `src/app/globals.css`, `src/app/study-dashboard.css` | Shared/Study tokens, responsive behavior, themes |

## Trust boundary

```text
Browser → same-origin Next.js BFF → 60-second EdDSA JWT → Render dashboard API → services → Postgres
```

- The browser never receives a database URL, bot token, provider refresh token, content-encryption
  key, or reusable Telegram file id.
- The browser-supplied workspace cookie is only a candidate. Render resolves the verified Telegram
  subject and repeats membership/role/Study-owner checks.
- Personalized routes are dynamic and `no-store`. The service worker does not cache authenticated
  navigation or API responses.
- Mutations must use the same-origin BFF, an allowlisted method/path, a bounded JSON body, and a
  short-lived backend token. Render consumes mutation JTIs and applies shared rate limits.
- Logout deletes the signed browser cookie only after Render returns a successful idempotent session
  revocation. Treat every non-2xx registry response, including authorization failure, as an incomplete
  logout so a stolen cookie cannot silently remain usable after the UI reports success.
- User content renders through React or bounded Markdown/Mermaid/media components. Do not add raw HTML,
  arbitrary script execution, protocol-relative images, or provider-hosted secrets.

## State ownership

- PostgreSQL is canonical. Optimistic browser state must reconcile from the backend.
- `localStorage` is for bounded presentation preferences or explicitly documented expiring drafts,
  not canonical private records.
- Study rich-note scratch text lives in encrypted backend `StudyNoteDraft` rows; Personal scratch text
  lives in separately owner-scoped `PersonalNoteDraft` rows. Neither uses local storage or search indexes.
- A filed Study note is a canonical `StudyResource`; Telegram, Library, search, backlinks, revisions,
  sessions, and analysis share it.
- A filed Personal note remains the existing canonical `Note`; the rich editor does not create a second
  document collection. Group note editing has not adopted the rich-draft flow yet.
- `study-rich-note-body.tsx` owns Tiptap integration; `study-editor-sync.ts` distinguishes local updates
  from external replacements; `study-editor-indentation.ts` keeps Tab behavior independently testable;
  `study-mermaid-templates.ts` is the reviewed local syntax/template catalog. New diagram kinds must
  stay within `study-mermaid.ts` budgets and pass the browser parser contract before release.
- Personal Today ordering is a private projection. It must not mutate Group/Study source ordering,
  deadlines, reminders, or provider priority.
- Study module pinning is canonical `StudyModule.pinnedAt` state. Pinned active modules sort before
  unpinned modules, then retain the existing display-order/code ordering; pinning does not alter Canvas
  activation or archival state.
- Rich-note transactions schedule Markdown conversion after a 140 ms quiet window with a 900 ms upper
  bound. Filing, explicit close, and page-hide handoff call the registered flush first; do not restore
  per-transaction parent serialization. Global shortcuts must treat any `contenteditable` descendant as
  a typing surface.
- Use `StudyChoicePicker` for controlled dashboard choices and `StudyFormChoicePicker` for traditional
  `FormData` submissions. Both share keyboard listbox semantics, focus return, searchable lists, mobile
  containment, and theme tokens. Do not reintroduce browser-native selectors in rendered forms.

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000/dashboard?demo=1` for credential-free UI work. Real-user and Study editor
flows require the paired backend plus Telegram authentication. Never put secrets in `NEXT_PUBLIC_*`.

## Safe UI workflow

1. Identify the owning mode and canonical backend record before changing UI state.
2. Reuse a shared accessible component where one exists; do not recreate dropdown/dialog behavior in
   one feature.
3. Preserve keyboard, screen-reader, touch, reduced-motion, dark-mode, mobile, and zoom behavior.
4. Keep buttons named after their action. If responsive CSS hides visible text, provide an `aria-label`.
5. Keep modal focus inside the active visual layer and restore it to the invoking control. Expose only
   one destructive `aria-modal` at a time; overlays that can overlap must use `useBodyScrollLock` rather
   than independently saving and restoring `document.body.style.overflow`. The global confirmation
   layer also marks obscured body roots inert and must restore their prior inert state on cleanup.
6. Test error, empty, loading, offline/reconnecting, stale/conflict, and partial provider states.
7. Update architecture/design/changelog/handoff docs when product or trust behavior changes.

Action menus focus their first item with `preventScroll`. Close them on explicit wheel, touch-move,
resize, Escape, or page-navigation keys rather than every raw `scroll` event: browser focus/layout
work can emit a delayed scroll immediately after mount and otherwise dismiss the menu before use.

## Validation gate

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run test:browser
npm run security:scan-secrets
npm run security:audit
npm run security:audit:all
npm run security:assurance
```

Run build and browser tests sequentially on Windows because both write shared `.next`/test-result
artifacts. A release also requires the paired backend tests and schema/API compatibility checks.

The browser suite intentionally skips the command-palette focus test on mobile where the control is
not exposed. Personal demo coverage types continuously through numbered-list conversion, checks computed
markers and focus retention, and verifies filing focus isolation. The desktop Study lifecycle is now
covered by `e2e/study-authenticated-lifecycle.spec.ts`: Playwright generates an ephemeral Ed25519 pair,
starts `scripts/study-browser-fixture.mjs`, signs a synthetic browser session, and proves autosave,
reload recovery, conflict refusal, import guidance, filing focus, canonical save, and Library visibility.
It is local-only and skips whenever `PLAYWRIGHT_BASE_URL` points at a hosted environment.

## Current hotspots

- `src/components/dashboard-app.tsx` combines shell orchestration and many Personal/Group views.
- Phase 3 reduced `src/components/study-dashboard.tsx` from 1,303 to 911 lines by moving Deep Work,
  module analysis, and the shared Study dialog into focused modules. The shell still owns several
  feature views/forms and should be split incrementally when those areas are next changed.
- `src/components/study-maintainability-boundaries.test.ts` protects the new shell/feature/dialog seam
  and line-count budgets. Rendered forms continue to share one branded choice primitive.
- Rich-note serialization is bounded and authenticated 10k/50k/99.5k browser measurements are held to
  an 8-second ceiling. Keep the gate before widening rich notes to Group.
- CSP is enforced by default. Scripts/style elements stay nonce-bound; only bounded dynamic React style
  attributes use the explicit `style-src-attr` compatibility lane documented in `docs/CSP_ROLLOUT.md`.

Extract by feature responsibility behind characterization tests. Do not combine a broad visual
refactor, API change, auth change, and CSP rollout in one release.

## Deployment

- Vercel hosts this repo. Backend API/schema changes deploy first.
- Verify both GitHub validation jobs, the Vercel production deployment, and the canonical dashboard
  route after release.
- Keep enforcement as the default. Use `THREADWISE_CSP_MODE=report-only` only as a temporary rollback
  and record why before redeploying.
- Do not treat a preview/demo pass as proof of owner-gated authenticated Study behavior.

## Definition of done

The visible interaction, accessibility tree, API contract, authorization boundary, failure behavior,
tests, docs, and deployed result must agree. A component that looks correct at one viewport is not
complete if its mobile label, focus order, dark theme, or recovery path is broken.
