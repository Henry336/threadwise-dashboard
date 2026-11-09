/**
 * Request checks for the BFF proxy route (`src/app/api/threadwise/[...path]/route.ts`).
 * Kept apart from the route so the rules can be unit tested without Next.js.
 */
/** Largest request body the proxy forwards. Large enough for a big rich note, small enough to stop abuse. */
export const THREADWISE_PROXY_MAX_BODY_BYTES = 192_000;
/** Largest upstream response the proxy relays (images and exports included); bigger answers become a 502. */
export const THREADWISE_PROXY_MAX_RESPONSE_BYTES = 20_000_000;

/**
 * CSRF guard for mutations: true only when the browser's Origin header matches the configured app URL.
 * A missing Origin fails. In development the dev server's own origin is also accepted.
 */
export function hasAllowedProxyOrigin(input: {
  origin: string | null;
  configuredAppUrl?: string;
  requestOrigin: string;
  development?: boolean;
}): boolean {
  if (!input.origin) return false;
  try {
    const actual = new URL(input.origin).origin;
    const configured = input.configuredAppUrl
      ? new URL(input.configuredAppUrl).origin
      : new URL(input.requestOrigin).origin;
    return actual === configured || (Boolean(input.development) && actual === new URL(input.requestOrigin).origin);
  } catch {
    return false;
  }
}

/**
 * True when either the declared Content-Length or the body actually read is over the limit.
 * Both are checked because the header can be absent or wrong.
 */
export function proxyBodyIsTooLarge(declaredLength: string | null, actualLength?: number): boolean {
  const declared = Number(declaredLength ?? 0);
  return (Number.isFinite(declared) && declared > THREADWISE_PROXY_MAX_BODY_BYTES)
    || (actualLength !== undefined && actualLength > THREADWISE_PROXY_MAX_BODY_BYTES);
}

/** The backend only takes JSON, so anything else is refused before it leaves the dashboard. An empty body is fine. */
export function proxyBodyIsJson(body: string): boolean {
  if (!body) return true;
  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
}
