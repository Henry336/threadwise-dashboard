import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Ari untangling loader", () => {
  it("uses the approved four equal 3:4 frames without redrawing the artwork", () => {
    const asset = readFileSync(join(process.cwd(), "public", "brand", "ari-untangle-loading.png"));
    const width = asset.readUInt32BE(16);
    const height = asset.readUInt32BE(20);

    expect(width).toBe(2_172);
    expect(height).toBe(724);
    expect(width / 4).toBe(543);
    expect((width / 4) / height).toBe(0.75);
  });

  it("advances through all four source frames and honors reduced motion", () => {
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
    const loadingRoute = readFileSync(join(process.cwd(), "src", "app", "dashboard", "loading.tsx"), "utf8");

    expect(css).toContain("animation: ari-untangle-frames 2.8s steps(1, end) infinite");
    expect(css).toContain("transform: translateX(-25%)");
    expect(css).toContain("transform: translateX(-50%)");
    expect(css).toContain("transform: translateX(-75%)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(loadingRoute).toContain("<AriUntangleLoader");
  });
});
