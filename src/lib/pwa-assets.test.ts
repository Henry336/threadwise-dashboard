import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PWA service worker", () => {
  const source = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

  it("never places authenticated API responses in the offline cache", () => {
    expect(source).toContain('url.pathname.startsWith("/api/")');
    expect(source).toContain('request.mode === "navigate"');
    expect(source).not.toContain('cache.put("/dashboard"');
  });

  it("keeps a generic offline fallback available", () => {
    expect(source).toContain('caches.match("/offline")');
  });
});

