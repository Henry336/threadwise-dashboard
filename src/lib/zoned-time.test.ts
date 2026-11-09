import { describe, expect, it } from "vitest";
import { calendarKey, zonedInputDate, zonedInputToIso } from "./zoned-time";

describe("zoned time helpers", () => {
  it("reads input values as Singapore wall-clock time", () => {
    expect(zonedInputToIso("2026-03-08T09:30", "Asia/Singapore")).toBe("2026-03-08T01:30:00.000Z");
    expect(zonedInputDate("2026-03-08T01:30:00.000Z", "Asia/Singapore")).toBe("2026-03-08T09:30");
  });

  it("uses the right New York offset on both sides of the March DST change", () => {
    expect(zonedInputToIso("2026-03-07T12:00", "America/New_York")).toBe("2026-03-07T17:00:00.000Z");
    expect(zonedInputToIso("2026-03-09T12:00", "America/New_York")).toBe("2026-03-09T16:00:00.000Z");
    expect(zonedInputToIso("2026-03-08T03:30", "America/New_York")).toBe("2026-03-08T07:30:00.000Z");
    expect(zonedInputToIso("2026-11-02T09:00", "America/New_York")).toBe("2026-11-02T14:00:00.000Z");
  });

  it("round-trips input values across the DST change", () => {
    for (const value of ["2026-03-07T23:15", "2026-03-08T04:00", "2026-10-31T23:59", "2026-11-01T03:00"]) {
      expect(zonedInputDate(zonedInputToIso(value, "America/New_York"), "America/New_York")).toBe(value);
    }
  });

  it("puts an instant on the calendar day of the chosen zone", () => {
    expect(calendarKey("2026-03-08T03:00:00.000Z", "America/New_York")).toBe("2026-03-07");
    expect(calendarKey("2026-03-08T03:00:00.000Z", "Asia/Singapore")).toBe("2026-03-08");
  });

  it("returns an empty input for unset values and rejects malformed input", () => {
    expect(zonedInputDate(undefined, "Asia/Singapore")).toBe("");
    expect(zonedInputDate(null, "Asia/Singapore")).toBe("");
    expect(() => zonedInputToIso("tomorrow", "Asia/Singapore")).toThrow("Choose a valid date and time.");
  });
});
