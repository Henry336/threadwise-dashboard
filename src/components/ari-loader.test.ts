import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Ari untangling loader", () => {
  it("ships the registered sequence as a lightweight WebP sprite", () => {
    const assetPath = join(process.cwd(), "public", "brand", "ari-untangle-loading-v2.webp");
    const asset = readFileSync(assetPath);

    expect(asset.subarray(0, 4).toString()).toBe("RIFF");
    expect(asset.subarray(8, 12).toString()).toBe("WEBP");
    expect(statSync(assetPath).size).toBeLessThan(200_000);
  });

  it("plays all eight frames forward and backward and honors reduced motion", () => {
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
    const loadingRoute = readFileSync(join(process.cwd(), "src", "app", "dashboard", "loading.tsx"), "utf8");

    expect(css).toContain("animation: ari-untangle-frames 2.4s steps(1, end) infinite");
    expect(css).toContain("transform: translateX(-12.5%)");
    expect(css).toContain("transform: translateX(-25%)");
    expect(css).toContain("transform: translateX(-50%)");
    expect(css).toContain("transform: translateX(-75%)");
    expect(css).toContain("transform: translateX(-87.5%)");
    expect(css).toContain("100% { transform: translateX(0); }");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(readFileSync(join(process.cwd(), "src", "components", "ari.tsx"), "utf8"))
      .toContain("/brand/ari-untangle-loading-v2.webp");
    expect(loadingRoute).toContain("<AriUntangleLoader");
  });
});
