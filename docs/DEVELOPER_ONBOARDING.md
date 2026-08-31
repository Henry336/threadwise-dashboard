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
| Study shell | `src/components/study-dashboard.tsx` | Study navigation and feature composition |
| Timetable | `src/components/study-timetable.tsx` | Week/day layout, block/details/editor state |
| Today | `src/components/today-planner.tsx` | Cross-mode agenda projection and Personal ordering |
| Study writing | `study-note-editor.tsx`, `study-rich-note-body.tsx`, `study-markdown-media.tsx` | Draft lifecycle, Tiptap Markdown, Mermaid/media |
| Browser BFF | `src/app/api/threadwise/[...path]/route.ts` | Session, same-origin mutation check, path/method allowlist, body caps |
| Server API client | `src/lib/threadwise-api.ts` | 60-second EdDSA service tokens and backend response parsing |
| Authentication | `src/lib/auth.ts`, `src/app/api/auth/*` | Telegram OIDC/Mini App verification and signed browser session |
| CSP/PWA | `src/proxy.ts`, `src/lib/content-security-policy.ts`, `public/sw.js` | Nonce policy staging and static-only offline shell |
| Contracts | `src/lib/types.ts`, `study-types.ts`, snapshot schemas | Browser-facing DTOs and validation |
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
5. Keep modal focus inside the active visual layer and restore it to the invoking control.
6. Test error, empty, loading, offline/reconnecting, stale/conflict, and partial provider states.
7. Update architecture/design/changelog/handoff docs when product or trust behavior changes.

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
not exposed. Add a synthetic authenticated Study fixture before treating rich-note behavior as fully
covered; the current rich-note regression test is primarily structural.

## Current hotspots

- `src/components/dashboard-app.tsx` combines shell orchestration and many Personal/Group views.
- `src/components/study-dashboard.tsx` combines the Study shell and most feature views/forms.
- Several older forms still use native `select` while newer surfaces use branded pickers.
- The rich editor serializes full Markdown on every update and needs behavioral focus/recovery tests.
- CSP is report-only because current dynamic style attributes violate the intended enforced policy.

Extract by feature responsibility behind characterization tests. Do not combine a broad visual
refactor, API change, auth change, and CSP rollout in one release.

## Deployment

- Vercel hosts this repo. Backend API/schema changes deploy first.
- Verify both GitHub validation jobs, the Vercel production deployment, and the canonical dashboard
  route after release.
- Keep `THREADWISE_CSP_MODE` report-only until `docs/CSP_ROLLOUT.md` passes in synthetic staging.
- Do not treat a preview/demo pass as proof of owner-gated authenticated Study behavior.

## Definition of done

The visible interaction, accessibility tree, API contract, authorization boundary, failure behavior,
tests, docs, and deployed result must agree. A component that looks correct at one viewport is not
complete if its mobile label, focus order, dark theme, or recovery path is broken.
