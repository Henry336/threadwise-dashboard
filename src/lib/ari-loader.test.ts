import { describe, expect, it } from "vitest";
import { ARI_LOADER_DURATION_MS, ARI_LOADER_FRAME_COUNT, ARI_LOADER_FRAME_HEIGHT, ARI_LOADER_FRAME_MS, ARI_LOADER_FRAME_WIDTH, ARI_LOADER_SEQUENCE } from "./ari-loader";

describe("Ari loader registration", () => {
  it("uses eight fixed 3:4 frames and two-second holds", () => {
    expect(ARI_LOADER_FRAME_COUNT).toBe(8);
    expect(ARI_LOADER_FRAME_WIDTH / ARI_LOADER_FRAME_HEIGHT).toBeCloseTo(0.75, 2);
    expect(ARI_LOADER_FRAME_MS).toBe(2_000);
    expect(ARI_LOADER_DURATION_MS).toBe(28_000);
  });
  it("plays forward and reverses without a jump", () => {
    expect(ARI_LOADER_SEQUENCE).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1]);
  });
});
