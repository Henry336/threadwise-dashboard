/**
 * Builds the Content-Security-Policy header that `src/proxy.ts` adds to every page.
 * Scripts and style elements must carry the per-request nonce. Inline style attributes are allowed
 * because React sets dynamic geometry (timetable block sizes, for example) through `style`.
 */
export type ContentSecurityPolicyMode = "enforce" | "report-only";

/** Enforce by default. `THREADWISE_CSP_MODE=report-only` switches to reporting only, for debugging a violation without breaking pages. */
export function contentSecurityPolicyMode(value = process.env.THREADWISE_CSP_MODE): ContentSecurityPolicyMode {
  return value === "report-only" ? "report-only" : "enforce";
}

/**
 * The policy text for one request. `https://telegram.org` is allowed for the Mini App script, and
 * `oauth.telegram.org` for Telegram login. Images may come from any https host because Markdown notes can
 * show remote images after the reader consents.
 */
export function buildContentSecurityPolicy(nonce: string, mode: ContentSecurityPolicyMode = "enforce"): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://telegram.org`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self'",
    "connect-src 'self' https://oauth.telegram.org",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (mode === "enforce") directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/** The header name for the chosen mode. */
export function contentSecurityPolicyHeader(mode: ContentSecurityPolicyMode): string {
  return mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}
