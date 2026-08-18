import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, contentSecurityPolicyHeader, contentSecurityPolicyMode } from "./content-security-policy";

describe("content security policy", () => {
  it("uses a nonce without broad unsafe script or style directives", () => {
    const policy = buildContentSecurityPolicy("known-nonce");
    expect(policy).toContain("script-src 'self' 'nonce-known-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-known-nonce'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("stages report-only by default and requires an explicit enforcement switch", () => {
    expect(contentSecurityPolicyMode(undefined)).toBe("report-only");
    expect(contentSecurityPolicyHeader(contentSecurityPolicyMode("report-only"))).toBe("Content-Security-Policy-Report-Only");
    expect(contentSecurityPolicyHeader(contentSecurityPolicyMode("enforce"))).toBe("Content-Security-Policy");
    expect(buildContentSecurityPolicy("nonce", "report-only")).not.toContain("upgrade-insecure-requests");
    expect(buildContentSecurityPolicy("nonce", "enforce")).toContain("upgrade-insecure-requests");
  });
});
