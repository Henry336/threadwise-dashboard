import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Ari untangling loader", () => {
  it("ships the normalized sequence as a transparent registered sprite", () => {
    const assetPath = join(process.cwd(), "public", "brand", "ari-untangle-normalized-v4.png");
    const asset = readFileSync(assetPath);
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "public", "brand", "ari-untangle-normalized-v4.json"), "utf8")) as {
      frameCount: number;
      frameWidth: number;
      frameHeight: number;
      transparent: boolean;
      playback: { framesPerSecond: number };
      frames: Array<{ foregroundBox: number[]; tealCentroid: number[] }>;
    };

    expect(asset.subarray(1, 4).toString()).toBe("PNG");
    expect(statSync(assetPath).size).toBeLessThan(1_250_000);
    expect(manifest).toMatchObject({ frameCount: 8, frameWidth: 640, frameHeight: 640, transparent: true, playback: { framesPerSecond: 4 } });
    expect(manifest.frames).toHaveLength(8);
    expect(manifest.frames.every((frame) => frame.foregroundBox[1] >= 80 && frame.foregroundBox[3] <= 560)).toBe(true);
    expect(manifest.frames.every((frame) => Math.abs(frame.tealCentroid[0] - 320) < 1)).toBe(true);
  });

  it("plays all eight frames forward and backward and honors reduced motion", () => {
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
    const loadingRoute = readFileSync(join(process.cwd(), "src", "app", "dashboard", "loading.tsx"), "utf8");
    const loaderComponent = readFileSync(join(process.cwd(), "src", "components", "ari.tsx"), "utf8");
    const studyDashboard = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");
    const studyCss = readFileSync(join(process.cwd(), "src", "app", "study-dashboard.css"), "utf8");

    expect(css).toContain("animation: ari-untangle-frames 3.5s steps(1, end) infinite");
    expect(css).toContain("transform: translateX(-12.5%)");
    expect(css).toContain("transform: translateX(-25%)");
    expect(css).toContain("transform: translateX(-50%)");
    expect(css).toContain("transform: translateX(-75%)");
    expect(css).toContain("transform: translateX(-87.5%)");
    expect(css).toContain("100% { transform: translateX(0); }");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(loaderComponent).toContain("/brand/ari-untangle-normalized-v4.png");
    expect(loaderComponent).toContain('label="Untangling your workspace…"');
    expect(loadingRoute).toContain("<AriWorkspaceLoader");
    expect(studyDashboard).toContain("if (!bootError) return <AriWorkspaceLoader />");
    expect(studyDashboard).not.toContain("Untangling your semester");
    expect(studyCss).not.toContain(".study-boot .ari-untangle-loader");
  });
});
