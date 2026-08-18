import { describe, expect, it } from "vitest";
import {
  hasAllowedProxyOrigin,
  proxyBodyIsJson,
  proxyBodyIsTooLarge,
  THREADWISE_PROXY_MAX_BODY_BYTES,
} from "./proxy-security";

describe("dashboard mutation proxy security", () => {
  const requestOrigin = "https://threadwise.example";

  it("accepts only the configured application origin", () => {
    expect(hasAllowedProxyOrigin({ origin: requestOrigin, requestOrigin })).toBe(true);
    expect(hasAllowedProxyOrigin({ origin: "https://evil.example", requestOrigin })).toBe(false);
    expect(hasAllowedProxyOrigin({ origin: null, requestOrigin })).toBe(false);
    expect(hasAllowedProxyOrigin({ origin: "not a URL", requestOrigin })).toBe(false);
  });

  it("does not trust a forwarded request origin when production has an explicit app URL", () => {
    expect(hasAllowedProxyOrigin({
      origin: "https://attacker.example",
      configuredAppUrl: requestOrigin,
      requestOrigin: "https://attacker.example",
    })).toBe(false);
  });

  it("bounds declared and observed bodies and rejects malformed JSON", () => {
    expect(proxyBodyIsTooLarge(String(THREADWISE_PROXY_MAX_BODY_BYTES))).toBe(false);
    expect(proxyBodyIsTooLarge(String(THREADWISE_PROXY_MAX_BODY_BYTES + 1))).toBe(true);
    expect(proxyBodyIsTooLarge(null, THREADWISE_PROXY_MAX_BODY_BYTES + 1)).toBe(true);
    expect(proxyBodyIsJson('{"ok":true}')).toBe(true);
    expect(proxyBodyIsJson("{broken")).toBe(false);
  });
});
