import { describe, expect, it } from "vitest";
import {
  FULL_DAY_END_MINUTE,
  FULL_DAY_START_MINUTE,
  buildTimetableDays,
  preferredTimetableMinute,
  timetableIndicatorOffset,
  timetableBlockBounds,
  timetableBlockDensity,
  timetableBlockLanes,
  timetableBlockPayload,
  timetableHorizontalBlockWidth,
  timetablePanelReducer,
} from "./study-timetable";
import type { StudySnapshot } from "./study-types";

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

  it("uses stable density thresholds without distorting duration-based widths", () => {
    expect(timetableHorizontalBlockWidth("10:00", "10:30", 1.35)).toBeCloseTo(34.5);
    expect(timetableBlockDensity(34.5)).toBe("narrow");
    expect(timetableBlockDensity(68)).toBe("compact");
    expect(timetableBlockDensity(132)).toBe("full");
  });

  it("omits absent destination fields on create but preserves deliberate update clears", () => {
    const draft = {
      moduleId: "",
      dayOfWeek: 7,
      startTime: "10:00",
      endTime: "11:00",
      label: "Hackathon",
      blockType: "other",
      customTypeLabel: "Competition",
      recurrenceMode: "once" as const,
      recurrenceStartDate: "2026-08-16",
      recurrenceEndDate: "",
      destination: "",
      destinationPlaceId: null,
      defaultOriginId: "",
      travelBufferMinutes: 15,
    };
    expect(timetableBlockPayload(draft, false)).not.toHaveProperty("destinationPlaceId");
    expect(timetableBlockPayload(draft, false)).not.toHaveProperty("destination");
    expect(timetableBlockPayload(draft, false)).toMatchObject({
      customTypeLabel: "Competition",
      recurrenceStartDate: "2026-08-16",
      recurrenceEndDate: "2026-08-16",
      startWeek: null,
      endWeek: null,
    });
    expect(timetableBlockPayload(draft, true)).toMatchObject({ destination: null, destinationPlaceId: null });
    expect(timetableBlockPayload({ ...draft, destination: "  Kent Ridge MRT  " }, false)).toMatchObject({ destination: "Kent Ridge MRT" });
    expect(timetableBlockPayload({ ...draft, destination: "COM3", destinationPlaceId: "venue:COM3" }, false)).toMatchObject({ destination: "COM3", destinationPlaceId: "venue:COM3" });
  });

  it("places overlapping and cross-midnight blocks in separate visual lanes", () => {
    const layout = timetableBlockLanes([
      { id: "a", startTime: "23:30", endTime: "00:30" },
      { id: "b", startTime: "23:45", endTime: "23:55" },
      { id: "c", startTime: "10:00", endTime: "10:30" },
    ]);
    expect(layout.laneCount).toBe(2);
    expect(layout.lanes.get("a")).not.toBe(layout.lanes.get("b"));
    expect(layout.lanes.get("c")).toBe(0);
    expect(layout.groupLaneCounts.get("a")).toBe(2);
    expect(layout.groupLaneCounts.get("b")).toBe(2);
    expect(layout.groupLaneCounts.get("c")).toBe(1);
  });

  it("keeps transitive overlaps together while letting isolated blocks fill the row", () => {
    const layout = timetableBlockLanes([
      { id: "a", startTime: "09:00", endTime: "10:00" },
      { id: "b", startTime: "09:30", endTime: "10:30" },
      { id: "c", startTime: "10:15", endTime: "11:00" },
      { id: "solo", startTime: "14:00", endTime: "15:00" },
    ]);
    expect(layout.laneCount).toBe(2);
    expect(layout.groupLaneCounts.get("a")).toBe(2);
    expect(layout.groupLaneCounts.get("b")).toBe(2);
    expect(layout.groupLaneCounts.get("c")).toBe(2);
    expect(layout.groupLaneCounts.get("solo")).toBe(1);
  });

  it("moves a selected block from details to edit and closes cleanly", () => {
    const details = timetablePanelReducer({ mode: "closed" }, { type: "open-details", blockId: "block-1", occurrenceDate: "2026-08-16" });
    expect(details).toEqual({ mode: "details", blockId: "block-1", occurrenceDate: "2026-08-16" });
    expect(timetablePanelReducer(details, { type: "edit" })).toEqual({ mode: "edit", blockId: "block-1", occurrenceDate: "2026-08-16" });
    expect(timetablePanelReducer(details, { type: "close" })).toEqual({ mode: "closed" });
  });

  it("hides excluded occurrences and quarantined deadlines from the timetable", () => {
    const study = {
      generatedAt: "2026-08-18T04:00:00.000Z",
      workspace: { timezone: "Asia/Singapore", semesterStartDate: "2026-08-10T00:00:00.000Z" },
      scheduleBlocks: [{ id: "block-1", active: true, dayOfWeek: 2, startTime: "10:00", endTime: "11:00", label: "Tutorial", blockType: "tutorial", excludedWeeks: [2] }],
      items: [
        { id: "trusted", status: "OPEN", dueAt: "2026-08-18T12:00:00.000+08:00", deadlineStatus: "TRUSTED", plannedMinutes: 30, module: { color: null } },
        { id: "suspect", status: "OPEN", dueAt: "2026-08-18T12:00:00.000+08:00", deadlineStatus: "NEEDS_CONFIRMATION", plannedMinutes: 30, module: { color: null } },
      ],
    } as unknown as StudySnapshot;
    const tuesday = buildTimetableDays(study, "2026-08-17")[1]!;
    expect(tuesday.blocks).toHaveLength(0);
    expect(tuesday.dueItems.map((item) => item.id)).toEqual(["trusted"]);
  });
});
