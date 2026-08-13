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

  it("ships a bounded transparent gentle animation with deterministic in-betweens", () => {
    const assetPath = join(process.cwd(), "public", "brand", "ari-untangle-smooth-v5.webp");
    const asset = readFileSync(assetPath);
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "public", "brand", "ari-untangle-smooth-v5.json"), "utf8")) as {
      sourceAsset: string;
      frameCount: number;
      frameWidth: number;
      frameHeight: number;
      transparent: boolean;
      interpolation: { inBetweenFramesPerTransition: number; generativeRedrawing: boolean };
      playback: { framesPerSecond: number; anchorFramesPerSecond: number; durationMs: number; anchorSequence: number[] };
      validation: { decodedFrameCount: number; transparentCornerAlpha: number; maxAnchorMeanAbsoluteError: number };
      frames: Array<{ anchor: boolean; durationMs: number }>;
    };

    expect(asset.subarray(0, 4).toString()).toBe("RIFF");
    expect(asset.subarray(8, 12).toString()).toBe("WEBP");
    expect(statSync(assetPath).size).toBeLessThan(2_000_000);
    expect(manifest).toMatchObject({
      sourceAsset: "ari-untangle-normalized-v4.png",
      frameCount: 42,
      frameWidth: 480,
      frameHeight: 480,
      transparent: true,
      interpolation: { inBetweenFramesPerTransition: 2, generativeRedrawing: false },
      playback: { framesPerSecond: 7.5, anchorFramesPerSecond: 2.5, durationMs: 5_600 },
      validation: { decodedFrameCount: 42, transparentCornerAlpha: 0 },
    });
    expect(manifest.validation.maxAnchorMeanAbsoluteError).toBeLessThan(4.5);
    expect(manifest.frames).toHaveLength(42);
    expect(manifest.frames.filter((frame) => frame.anchor)).toHaveLength(14);
    expect(manifest.frames.reduce((total, frame) => total + frame.durationMs, 0)).toBe(5_600);
  });

  it("uses the smooth asset in both loading stages and honors reduced motion", () => {
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
    const loadingRoute = readFileSync(join(process.cwd(), "src", "app", "dashboard", "loading.tsx"), "utf8");
    const loaderComponent = readFileSync(join(process.cwd(), "src", "components", "ari.tsx"), "utf8");
    const studyDashboard = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");
    const studyCss = readFileSync(join(process.cwd(), "src", "app", "study-dashboard.css"), "utf8");

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain('background: url("/brand/ari-untangle-normalized-v4.png")');
    expect(loaderComponent).toContain("/brand/ari-untangle-smooth-v5.webp");
    expect(loaderComponent).toContain('label="Untangling your workspace…"');
    expect(loadingRoute).toContain("<AriWorkspaceLoader");
    expect(studyDashboard).toContain("if (!bootError) return <AriWorkspaceLoader />");
    expect(studyDashboard).not.toContain("Untangling your semester");
    expect(studyCss).not.toContain(".study-boot .ari-untangle-loader");
  });
});
