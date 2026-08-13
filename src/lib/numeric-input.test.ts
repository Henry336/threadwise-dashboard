import { describe, expect, it } from "vitest";
import { clampInteger, normalizeIntegerDraft } from "./numeric-input";

describe("numeric input normalization", () => {
  it("allows an empty editing state and removes redundant leading zeros", () => {
    expect(normalizeIntegerDraft("")).toBe("");
    expect(normalizeIntegerDraft("0")).toBe("0");
    expect(normalizeIntegerDraft("000")).toBe("0");
    expect(normalizeIntegerDraft("019")).toBe("19");
    expect(normalizeIntegerDraft("00a12")).toBe("12");
  });

  it("clamps committed integer values", () => {
    expect(clampInteger(0, 1, 24)).toBe(1);
    expect(clampInteger(19.8, 1, 30)).toBe(19);
    expect(clampInteger(99, 0, 90)).toBe(90);
  });
});
