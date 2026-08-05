import { describe, expect, it } from "vitest";
import { academicWeekForDate, buildTimetableDays, initialTimetableWeek } from "./study-timetable";
import type { StudySnapshot } from "./study-types";

function snapshot(): StudySnapshot {
  return {
    generatedAt: "2026-08-05T05:00:00.000Z",
    workspace: {
      id: "study", semesterName: "Semester 1", semesterStartDate: "2026-08-10T00:00:00.000Z", timezone: "Asia/Singapore",
      weeklyReviewDay: 6, weeklyReviewTime: "19:00", weeklyPreviewDay: 7, weeklyPreviewTime: "19:00", maxRemindersPerDay: 20,
      timedPracticeStartWeek: 7, studyBlockRemindersEnabled: true, canvasSyncEnabled: true,
    },
    weekNumber: 0,
    overview: { overallStatus: "UNASSESSED", amberWarning: false, redWarning: false, topPriorities: [], attention: { generatedAt: "", items: [], overdue: 0, dueToday: 0, dueThisWeek: 0, undated: 0, missingCanvas: 0, redModules: [] } },
    modules: [], resources: [], mistakes: [], sessions: [], reviews: [], origins: [],
    items: [{
      id: "item", publicId: "STUDY-1", moduleId: "module", type: "ASSIGNMENT", title: "Tutorial 1", source: "MANUAL", status: "OPEN", priority: "NORMAL",
      dueAt: "2026-08-12T10:00:00.000Z", plannedMinutes: 45, actualMinutes: 0, mastery: "UNASSESSED", createdAt: "", updatedAt: "",
      module: { id: "module", code: "CS2100", name: "Computer Organisation", color: "#168b83" },
    }],
    scheduleBlocks: [{
      id: "block", moduleId: "module", dayOfWeek: 3, startTime: "10:00", endTime: "12:00", label: "Lecture", blockType: "class", startWeek: 1, endWeek: 13,
      travelBufferMinutes: 15, reminderLeadMinutes: 20, active: true, module: { id: "module", code: "CS2100", name: "Computer Organisation" },
    }],
    canvas: { configured: false, missingAssignments: [] },
  };
}

describe("study timetable", () => {
  it("opens on semester week one before the semester starts", () => {
    expect(initialTimetableWeek(snapshot())).toBe("2026-08-10");
  });

  it("keeps recurring blocks and due work in their own lanes", () => {
    const days = buildTimetableDays(snapshot(), "2026-08-10");
    expect(days[2]?.blocks.map((block) => block.id)).toEqual(["block"]);
    expect(days[2]?.dueItems.map((item) => item.id)).toEqual(["item"]);
    expect(days[2]?.plannedMinutes).toBe(45);
  });

  it("calculates pre-semester and teaching weeks", () => {
    expect(academicWeekForDate("2026-08-05", "2026-08-10")).toBe(0);
    expect(academicWeekForDate("2026-08-17", "2026-08-10")).toBe(2);
  });
});
