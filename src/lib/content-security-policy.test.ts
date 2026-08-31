import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, contentSecurityPolicyHeader, contentSecurityPolicyMode } from "./content-security-policy";

describe("content security policy", () => {
  it("keeps scripts and style elements nonce-bound while isolating dynamic style attributes", () => {
    const policy = buildContentSecurityPolicy("known-nonce");
    expect(policy).toContain("script-src 'self' 'nonce-known-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-known-nonce'");
    expect(policy).toContain("style-src-elem 'self' 'nonce-known-nonce'");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy.match(/script-src [^;]+/u)?.[0]).not.toContain("'unsafe-inline'");
    expect(policy.match(/style-src-elem [^;]+/u)?.[0]).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("enforces by default while preserving an explicit report-only rollback", () => {
    expect(contentSecurityPolicyMode(undefined)).toBe("enforce");
    expect(contentSecurityPolicyHeader(contentSecurityPolicyMode("report-only"))).toBe("Content-Security-Policy-Report-Only");
    expect(contentSecurityPolicyHeader(contentSecurityPolicyMode("enforce"))).toBe("Content-Security-Policy");
    expect(buildContentSecurityPolicy("nonce", "report-only")).not.toContain("upgrade-insecure-requests");
    expect(buildContentSecurityPolicy("nonce", "enforce")).toContain("upgrade-insecure-requests");
  });
});
