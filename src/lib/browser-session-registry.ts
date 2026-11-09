/**
 * Server-only client for the backend's browser-session registry (`/api/v1/dashboard/browser-sessions`).
 * Each login registers a session there, every request checks it, and logout deletes it. This is what makes
 * dashboard sessions revocable instead of trusting a self-contained cookie for seven days.
 */
import "server-only";

import { createServiceToken } from "./threadwise-api";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_RESPONSE_BYTES = 8_192;

export type RegisteredBrowserSession = {
  id: string;
  expiresAt: number;
};

/** The registry URL, with the session id appended when one is given. */
function endpoint(sessionId?: string) {
  const baseUrl = process.env.THREADWISE_API_URL;
  if (!baseUrl) throw new Error("THREADWISE_API_URL is not configured");
  const root = `${baseUrl.replace(/\/$/u, "")}/api/v1/dashboard/browser-sessions`;
  return sessionId ? `${root}/${encodeURIComponent(sessionId)}` : root;
}

/** One call to the registry, authenticated with a short-lived service token for this Telegram user. Times out after 8 seconds. */
async function registryFetch(telegramId: string, sessionId: string | undefined, init: RequestInit) {
  const token = await createServiceToken(telegramId);
  return fetch(endpoint(sessionId), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
}

/** Reads `{ session: { id, expiresAt } }` from a reply. Caps the size and returns null for anything malformed or already expired. */
async function parseSession(response: Response): Promise<RegisteredBrowserSession | null> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RESPONSE_BYTES) return null;
  const raw = await response.text();
  if (raw.length > MAX_RESPONSE_BYTES) return null;
  try {
    const body = JSON.parse(raw) as { session?: { id?: unknown; expiresAt?: unknown } };
    const id = body.session?.id;
    const expiresAtText = body.session?.expiresAt;
    const expiresAt = typeof expiresAtText === "string" ? Date.parse(expiresAtText) : Number.NaN;
    if (typeof id !== "string" || !SESSION_ID.test(id) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return { id, expiresAt };
  } catch {
    return null;
  }
}

/** Creates a seven-day session for a user who just signed in. Throws if the backend does not confirm it, so login fails closed. */
export async function registerBrowserSession(telegramId: string): Promise<RegisteredBrowserSession> {
  const response = await registryFetch(telegramId, undefined, {
    method: "POST",
    body: JSON.stringify({ ttlSeconds: SESSION_TTL_SECONDS }),
  });
  const session = response.ok ? await parseSession(response) : null;
  if (!session) throw new Error("Threadwise could not establish a revocable browser session.");
  return session;
}

/** Is this session still live on the backend? Any error counts as "no", so an outage signs people out rather than letting revoked sessions through. */
export async function browserSessionIsActive(telegramId: string, sessionId: string): Promise<boolean> {
  if (!SESSION_ID.test(sessionId)) return false;
  try {
    const response = await registryFetch(telegramId, sessionId, { method: "GET" });
    return response.ok && Boolean(await parseSession(response));
  } catch {
    return false;
  }
}

/** Deletes the session on the backend. Throws on failure so logout can keep the cookie and let the user retry. */
export async function revokeBrowserSession(telegramId: string, sessionId: string): Promise<void> {
  if (!SESSION_ID.test(sessionId)) return;
  const response = await registryFetch(telegramId, sessionId, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Threadwise could not revoke the browser session.");
  }
}
