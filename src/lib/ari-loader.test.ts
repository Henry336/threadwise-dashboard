import { describe, expect, it } from "vitest";
import {
  ARI_LOADER_ANCHOR_FRAME_COUNT,
  ARI_LOADER_DURATION_MS,
  ARI_LOADER_FRAME_COUNT,
  ARI_LOADER_BLINK_CLOSE_DURATION_PATTERN_MS,
  ARI_LOADER_BLINK_OPEN_DURATION_PATTERN_MS,
  ARI_LOADER_FRAME_HEIGHT,
  ARI_LOADER_FRAME_WIDTH,
  ARI_LOADER_INTENTIONAL_BLINKS,
  ARI_LOADER_IN_BETWEEN_FRAMES,
  ARI_LOADER_NORMAL_FRAME_DURATION_PATTERN_MS,
  ARI_LOADER_SEQUENCE,
} from "./ari-loader";

describe("Ari loader registration", () => {
  it("keeps smooth transitions while giving the loop one deliberate blink", () => {
    expect(ARI_LOADER_ANCHOR_FRAME_COUNT).toBe(8);
    expect(ARI_LOADER_IN_BETWEEN_FRAMES).toBe(2);
    expect(ARI_LOADER_FRAME_COUNT).toBe(42);
    expect(ARI_LOADER_FRAME_WIDTH / ARI_LOADER_FRAME_HEIGHT).toBe(1);
    expect(ARI_LOADER_NORMAL_FRAME_DURATION_PATTERN_MS).toEqual([180, 150, 150]);
    expect(ARI_LOADER_BLINK_CLOSE_DURATION_PATTERN_MS).toEqual([80, 50, 40]);
    expect(ARI_LOADER_BLINK_OPEN_DURATION_PATTERN_MS).toEqual([70, 50, 40]);
    expect(ARI_LOADER_INTENTIONAL_BLINKS).toBe(1);
    expect(ARI_LOADER_DURATION_MS).toBe(6_090);
  });
  it("plays forward and reverses without a jump", () => {
    expect(ARI_LOADER_SEQUENCE).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1]);
  });
});
