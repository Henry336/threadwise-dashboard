import { describe, expect, it } from "vitest";
import { BUILT_IN_OVERVIEW_QUOTES, dailyOverviewLine } from "./dashboard-copy";

describe("dailyOverviewLine", () => {
  it("stays stable throughout one local calendar day", () => {
    expect(dailyOverviewLine("2026-08-11T00:15:00+08:00", "Asia/Singapore"))
      .toBe(dailyOverviewLine("2026-08-11T23:45:00+08:00", "Asia/Singapore"));
  });

  it("uses the workspace timezone at a date boundary", () => {
    const instant = "2026-08-10T16:30:00.000Z";
    expect(dailyOverviewLine(instant, "Asia/Singapore"))
      .not.toBe(dailyOverviewLine(instant, "America/New_York"));
  });

  it("includes the requested attributed lines in the built-in rotation", () => {
    expect(BUILT_IN_OVERVIEW_QUOTES).toContainEqual({
      text: "Life does not get better by chance. It gets better by change",
      author: "Jim Rohn",
    });
    expect(BUILT_IN_OVERVIEW_QUOTES).toContainEqual({
      text: "To exist is to change, to change is to mature, to mature is to keep creating oneself endlessly",
      author: "Henry Bergson",
    });
  });

  it("rotates personal quotes with their attribution", () => {
    expect(dailyOverviewLine("2026-08-08T12:00:00+08:00", "Asia/Singapore", [
      { text: "A personal line", author: "Henry" },
    ])).toBe("A personal line — Henry");
  });
});

