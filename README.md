# Threadwise Dashboard

A calm, personal web home for everything captured through the Threadwise Telegram bot: tasks, notes, ideas, reminders, expenses, and integrations.

The application is intentionally a separate Next.js frontend and backend-for-frontend. Browsers never receive a Supabase connection string, service-role key, Telegram bot token, or provider refresh token.

## What is here

- A responsive public landing page and personalized dashboard
- A command-first capture/search surface with `Ctrl/Cmd + K`
- Today, Tasks, Notes, Ideas, Images, Expenses, Search, and Settings views
- A chronological "threadline" for today and overdue work
- Real user-scoped creation, editing, completion, conversion, deletion, pagination, and settings updates
- A date-grouped image gallery with OCR/caption search, selection, a keyboard-friendly lightbox, and note conversion
- Expense capture, editing, CSV export, and connected Excel synchronization
- Data export, integration disconnect, and confirmed account deletion controls
- Telegram OIDC Authorization Code + PKCE login routes
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
npm run lint
npm run build
```

The main interaction paths are also checked in a real Chromium browser at desktop and mobile widths before production releases.

## Trust boundary

```text
Browser → Vercel Next.js BFF → private Render /api/v1 → Threadwise services → Supabase
              │
              └── Telegram OIDC session
```

The dashboard identifies a user from Telegram's verified numeric `id` claim. Render derives the canonical Threadwise `userId`; resource requests never accept a browser-supplied `userId`. Group-owned data is deliberately excluded until Threadwise has a verifiable human-to-group membership model.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DESIGN.md](docs/DESIGN.md).

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

Never add database credentials to a `NEXT_PUBLIC_*` variable.
