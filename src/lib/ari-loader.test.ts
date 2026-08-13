import { describe, expect, it } from "vitest";
import { ARI_LOADER_DURATION_MS, ARI_LOADER_FRAME_COUNT, ARI_LOADER_FRAME_HEIGHT, ARI_LOADER_FRAME_MS, ARI_LOADER_FRAME_WIDTH, ARI_LOADER_SEQUENCE } from "./ari-loader";

describe("Ari loader registration", () => {
  it("uses eight normalized square frames at four frames per second", () => {
    expect(ARI_LOADER_FRAME_COUNT).toBe(8);
    expect(ARI_LOADER_FRAME_WIDTH / ARI_LOADER_FRAME_HEIGHT).toBe(1);
    expect(ARI_LOADER_FRAME_MS).toBe(250);
    expect(ARI_LOADER_DURATION_MS).toBe(3_500);
  });
  it("plays forward and reverses without a jump", () => {
    expect(ARI_LOADER_SEQUENCE).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1]);
  });
});
