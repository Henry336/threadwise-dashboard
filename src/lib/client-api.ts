/** A failed BFF call: the HTTP status plus the backend's machine-readable error code
 * (for example `revision_conflict`), so callers can branch on the code instead of the text. */
export class ClientApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "ClientApiError";
  }
}

const FALLBACK_MESSAGE = "That action could not be completed.";

/** The one browser client for the same-origin BFF (`/api/threadwise/*`). Every component calls
 * through here so cookies, caching and error handling behave the same everywhere. An error body
 * that is not JSON (an HTML gateway page, for example) becomes a plain message, never a parse error. */
export async function api<T>(path: string, method = "GET", body?: unknown, options: { keepalive?: boolean } = {}): Promise<T> {
  const response = await fetch(`/api/threadwise/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    keepalive: options.keepalive,
    headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = response.headers.get("content-type")?.includes("application/json") ?? false;
  const payload: unknown = json ? await response.json().catch(() => undefined) : await response.text();
  if (!response.ok) {
    const error = payload && typeof payload === "object" ? payload as { message?: unknown; error?: unknown } : {};
    const code = typeof error.error === "string" ? error.error : "request_failed";
    const message = typeof error.message === "string" && error.message ? error.message : FALLBACK_MESSAGE;
    throw new ClientApiError(response.status, code, message);
  }
  return payload as T;
}
