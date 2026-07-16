# Dashboard architecture

## Boundary

The dashboard is a separate Next.js application hosted on Vercel. It acts as a backend-for-frontend and talks to a versioned API hosted by the existing Threadwise Render service.

```text
Telegram OIDC ──→ Vercel session
                       │
Browser ──→ Next.js server routes ──→ Render /api/v1 ──→ existing services ──→ Postgres
```

Vercel does not receive the database URL, Telegram bot token, Gmail/Calendar/Microsoft tokens, or Telegram file URLs. The bot remains the canonical mutation layer so reminders, recurrence, audit, undo, and settings rescheduling keep their existing invariants.

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

The API must never expose embeddings, raw source text, OAuth state, access or refresh tokens, Telegram file IDs, receipt hashes, full OCR receipts, or assignee Telegram IDs.

## Rollout

1. Deploy and review the demo preview.
2. Add the read-only `/api/v1/dashboard` endpoint and service-token verification to Render.
3. Configure Telegram OIDC allowed URLs and Vercel secrets.
4. Verify real-user isolation with at least two Telegram accounts.
5. Add mutations through existing Threadwise service functions, beginning with task completion and quick capture.
6. Keep group work out of scope until membership authorization exists.
