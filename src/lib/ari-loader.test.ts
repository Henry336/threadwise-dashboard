import { describe, expect, it } from "vitest";
import {
  ARI_LOADER_ANCHOR_FRAME_COUNT,
  ARI_LOADER_DURATION_MS,
  ARI_LOADER_FRAME_COUNT,
  ARI_LOADER_FRAME_DURATION_PATTERN_MS,
  ARI_LOADER_FRAME_HEIGHT,
  ARI_LOADER_FRAME_WIDTH,
  ARI_LOADER_FRAMES_PER_SECOND,
  ARI_LOADER_IN_BETWEEN_FRAMES,
  ARI_LOADER_SEQUENCE,
} from "./ari-loader";

describe("Ari loader registration", () => {
  it("adds two in-between frames between each normalized anchor", () => {
    expect(ARI_LOADER_ANCHOR_FRAME_COUNT).toBe(8);
    expect(ARI_LOADER_IN_BETWEEN_FRAMES).toBe(2);
    expect(ARI_LOADER_FRAME_COUNT).toBe(42);
    expect(ARI_LOADER_FRAME_WIDTH / ARI_LOADER_FRAME_HEIGHT).toBe(1);
    expect(ARI_LOADER_FRAMES_PER_SECOND).toBe(12);
    expect(ARI_LOADER_FRAME_DURATION_PATTERN_MS).toEqual([84, 83, 83]);
    expect(ARI_LOADER_DURATION_MS).toBe(3_500);
  });
  it("plays forward and reverses without a jump", () => {
    expect(ARI_LOADER_SEQUENCE).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1]);
  });
});
