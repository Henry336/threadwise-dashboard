export const THREADWISE_PROXY_MAX_BODY_BYTES = 192_000;
export const THREADWISE_PROXY_MAX_RESPONSE_BYTES = 20_000_000;

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

export function proxyBodyIsTooLarge(declaredLength: string | null, actualLength?: number): boolean {
  const declared = Number(declaredLength ?? 0);
  return (Number.isFinite(declared) && declared > THREADWISE_PROXY_MAX_BODY_BYTES)
    || (actualLength !== undefined && actualLength > THREADWISE_PROXY_MAX_BODY_BYTES);
}

export function proxyBodyIsJson(body: string): boolean {
  if (!body) return true;
  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
}
