export type ContentSecurityPolicyMode = "enforce" | "report-only";

export function contentSecurityPolicyMode(value = process.env.THREADWISE_CSP_MODE): ContentSecurityPolicyMode {
  return value === "report-only" ? "report-only" : "enforce";
}

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

export function contentSecurityPolicyHeader(mode: ContentSecurityPolicyMode): string {
  return mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}
