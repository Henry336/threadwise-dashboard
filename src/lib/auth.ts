/**
 * Server-side session cookie helpers. The cookie is an HMAC-signed JSON payload (signed with `AUTH_SECRET`)
 * that names a browser session registered with the backend. A valid signature is not enough: every read
 * also asks the backend whether that session is still active, so logout and revocation take effect at once.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { browserSessionIsActive } from "./browser-session-registry";

export const SESSION_COOKIE = "threadwise_session";
export const WORKSPACE_COOKIE = "threadwise_workspace";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** What the session cookie carries: the Telegram identity plus the backend session id and expiry. */
export type SessionUser = {
  sessionId: string;
  telegramId: string;
  firstName: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  expiresAt: number;
};

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}
/** HMAC-SHA256 of the payload. Throws when `AUTH_SECRET` is missing so a misconfigured deploy fails loudly. */
function signature(payload: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Signs a new session cookie value. Refuses ids that are not UUIDs and lifetimes past seven days,
 * so a bad backend reply cannot mint a long-lived cookie.
 */
export function createSessionToken(user: Omit<SessionUser, "expiresAt">, expiresAt: number) {
  if (!SESSION_ID.test(user.sessionId) || expiresAt <= Date.now() || expiresAt > Date.now() + SESSION_TTL_MS + 60_000) {
    throw new Error("The dashboard browser session is invalid or outside the supported lifetime.");
  }
  const payload = encode(
    JSON.stringify({
      ...user,
      expiresAt,
    }),
  );
  return `${payload}.${signature(payload)}`;
}

/**
 * Checks the signature in constant time and the payload's shape and expiry. Returns null on any problem.
 * It does not ask the backend; use `getSessionUser` for that.
 */
export function verifySessionToken(token?: string): SessionUser | null {
  if (!token) return null;
  const [payload, provided] = token.split(".");
  if (!payload || !provided || !process.env.AUTH_SECRET) return null;

  const expected = signature(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionUser;
    if (
      !/^[1-9]\d{0,19}$/u.test(user.telegramId)
      || !SESSION_ID.test(user.sessionId)
      || !Number.isFinite(user.expiresAt)
      || user.expiresAt < Date.now()
      || user.expiresAt > Date.now() + SESSION_TTL_MS + 60_000
    ) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * The signed-in user for this request, or null. Makes a backend call to confirm the session was not revoked.
 * Pages and the BFF call this on every request.
 */
export async function getSessionUser() {
  const store = await cookies();
  const user = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!user) return null;
  return await browserSessionIsActive(user.telegramId, user.sessionId) ? user : null;
}

/** The workspace chosen with the workspace switcher (`/api/workspace/select`). Falls back to "personal" when the cookie is missing or malformed. */
export async function getSelectedWorkspace() {
  const store = await cookies();
  const value = store.get(WORKSPACE_COOKIE)?.value;
  return value && /^(?:personal|[0-9a-f-]{36})$/i.test(value) ? value : "personal";
}

/** True when every env var Telegram login needs is set. The landing page shows "Explore the demo" instead of sign-in when it is false. */
export function isTelegramAuthConfigured() {
  return Boolean(
    process.env.TELEGRAM_OIDC_CLIENT_ID &&
      process.env.TELEGRAM_OIDC_CLIENT_SECRET &&
      process.env.AUTH_SECRET &&
      process.env.DASHBOARD_API_PRIVATE_KEY &&
      process.env.THREADWISE_API_URL &&
      process.env.NEXT_PUBLIC_APP_URL,
  );
}
