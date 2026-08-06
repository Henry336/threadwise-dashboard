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
- Never put DB credentials in a `NEXT_PUBLIC_*` variable.

## Continuity

Code is clean and pushed to GitHub, so any AI in any environment can continue from a clone.
Secrets are **not** in git (`.env*` gitignored; `.env.example` documents them). Back these up
in a password manager — they cannot be recovered from the repo:
`AUTH_SECRET`, the Telegram OIDC client credentials, and the Ed25519 `DASHBOARD_API_PRIVATE_KEY`
(its public half is deployed to the Render bot). See `README.md` → Deployment and `docs/ARCHITECTURE.md`.

## Cross-AI handoff (Claude ↔ Codex)

The owner works between Claude Code and Codex interchangeably. Canonical context is this
`CLAUDE.md`; `AGENTS.md` (tracked) points here so Codex auto-loads it. **Whoever does work
updates the Working log below** (newest first: date, who, what, current state).

## Working log

- **2026-08-06 (Claude):** Created this canonical `CLAUDE.md` + `AGENTS.md` pointer as part of a
  continuity pass across both Threadwise repos. Documented the trust boundary and the secrets to
  back up (`AUTH_SECRET`, Telegram OIDC creds, `DASHBOARD_API_PRIVATE_KEY`). No code changes.
