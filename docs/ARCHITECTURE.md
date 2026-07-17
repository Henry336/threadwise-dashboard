# Dashboard architecture

## Boundary

The dashboard is a separate Next.js application hosted on Vercel. It acts as a backend-for-frontend and talks to a versioned API hosted by the existing Threadwise Render service.

```text
Telegram OIDC ──→ Vercel session
                       │
Browser ──→ Next.js server routes ──→ Render /api/v1 ──→ existing services ──→ Postgres
```

Vercel does not receive the database URL, Telegram bot token, Gmail/Calendar/Microsoft tokens, or reusable Telegram file identifiers. The bot remains the canonical mutation layer so reminders, recurrence, audit, undo, and settings rescheduling keep their existing invariants.

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
- Group owners (`chat:<id>`) are excluded until a verified membership model exists.

The API must never expose embeddings, raw provider payloads, OAuth state, access or refresh tokens, Telegram file IDs, receipt hashes, or assignee Telegram IDs. It may return the user-facing task, note, idea, image caption/OCR, expense, and settings fields needed by the product.

Saved-image bytes follow an owner-scoped server path: Browser → Vercel BFF → Render → Telegram. Render performs the authenticated lookup, enforces raster-only media and a bounded download, then streams bytes with defensive browser headers. Neither the bot token nor Telegram file ID crosses into Vercel or the browser.

Mutations are accepted only through the same-origin Vercel BFF. Each Render route validates a short-lived Ed25519 service token and resolves the user from its verified Telegram subject before performing any database operation.

## Production surface

The current API includes the initial snapshot plus owner-scoped paginated collections, CRUD operations, task completion and recurrence, idea conversion, image delivery, search, shared settings, Excel synchronization, integration disconnect, privacy export, and confirmed account deletion.

Deployment gates are:

1. Run lint, production builds, and the core service test suite.
2. Verify desktop and mobile demo flows in a real browser.
3. Configure Telegram OIDC origins/callbacks and Vercel secrets.
4. Verify real-user isolation with at least two Telegram accounts.
5. Keep group work out of scope until a verifiable human-to-group membership model exists.
