import { describe, expect, it } from "vitest";
import { dailyOverviewLine } from "./dashboard-copy";

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
});

