import { describe, expect, it } from "vitest";
import {
  FULL_DAY_END_MINUTE,
  FULL_DAY_START_MINUTE,
  preferredTimetableMinute,
  timetableIndicatorOffset,
  timetableBlockBounds,
} from "./study-timetable";

describe("Study timetable day bounds", () => {
  it("models the complete midnight-to-midnight day", () => {
    expect(FULL_DAY_START_MINUTE).toBe(0);
    expect(FULL_DAY_END_MINUTE).toBe(1440);
  });

  it("keeps late-night blocks visible through midnight", () => {
    expect(timetableBlockBounds("23:15", "23:55")).toEqual({ start: 1395, end: 1435 });
    expect(timetableBlockBounds("23:30", "00:30")).toEqual({ start: 1410, end: 1440 });
  });

  it("focuses now for the current week and the first event otherwise", () => {
    expect(preferredTimetableMinute(["09:30", "14:00"], 1180, true)).toBe(1180);
    expect(preferredTimetableMinute(["14:00", "09:30"], 1180, false)).toBe(570);
    expect(preferredTimetableMinute([], 1180, false)).toBe(480);
  });

  it("keeps the current-time marker clear of both midnight edges and exact-hour labels", () => {
    const extent = 1440 * 1.05;
    expect(timetableIndicatorOffset(0, 1.05, extent)).toBe(8);
    expect(timetableIndicatorOffset(7 * 60, 1.05, extent)).toBe(441);
    expect(timetableIndicatorOffset(1440, 1.05, extent)).toBe(extent - 8);
  });
});
