import "server-only";

import { createServiceToken } from "./threadwise-api";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_RESPONSE_BYTES = 8_192;

export type RegisteredBrowserSession = {
  id: string;
  expiresAt: number;
};

function endpoint(sessionId?: string) {
  const baseUrl = process.env.THREADWISE_API_URL;
  if (!baseUrl) throw new Error("THREADWISE_API_URL is not configured");
  const root = `${baseUrl.replace(/\/$/u, "")}/api/v1/dashboard/browser-sessions`;
  return sessionId ? `${root}/${encodeURIComponent(sessionId)}` : root;
}

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

export async function registerBrowserSession(telegramId: string): Promise<RegisteredBrowserSession> {
  const response = await registryFetch(telegramId, undefined, {
    method: "POST",
    body: JSON.stringify({ ttlSeconds: SESSION_TTL_SECONDS }),
  });
  const session = response.ok ? await parseSession(response) : null;
  if (!session) throw new Error("Threadwise could not establish a revocable browser session.");
  return session;
}

export async function browserSessionIsActive(telegramId: string, sessionId: string): Promise<boolean> {
  if (!SESSION_ID.test(sessionId)) return false;
  try {
    const response = await registryFetch(telegramId, sessionId, { method: "GET" });
    return response.ok && Boolean(await parseSession(response));
  } catch {
    return false;
  }
}

export async function revokeBrowserSession(telegramId: string, sessionId: string): Promise<void> {
  if (!SESSION_ID.test(sessionId)) return;
  const response = await registryFetch(telegramId, sessionId, { method: "DELETE" });
  if (!response.ok && response.status !== 401 && response.status !== 404) {
    throw new Error("Threadwise could not revoke the browser session.");
  }
}
