import { describe, expect, it } from "vitest";
import type { StudySnapshot } from "./study-types";
import { studyWeekLabel } from "./study-week";

function study(overrides: { weekNumber: number; generatedAt: string; semesterStartDate?: string | null }) {
  return {
    weekNumber: overrides.weekNumber,
    generatedAt: overrides.generatedAt,
    workspace: {
      semesterStartDate: overrides.semesterStartDate ?? null,
      timezone: "Asia/Singapore",
    },
  } as Pick<StudySnapshot, "weekNumber" | "generatedAt" | "workspace">;
}

describe("studyWeekLabel", () => {
  it("describes the pre-semester state instead of rendering week zero", () => {
    expect(studyWeekLabel(study({
      weekNumber: 0,
      generatedAt: "2026-08-05T08:00:00.000Z",
      semesterStartDate: "2026-08-10T00:00:00.000Z",
    }))).toBe("Pre-semester · Week 1 begins 10 Aug");
  });

  it("uses the current academic week once the semester has started", () => {
    expect(studyWeekLabel(study({
      weekNumber: 4,
      generatedAt: "2026-09-01T08:00:00.000Z",
      semesterStartDate: "2026-08-10T00:00:00.000Z",
    }))).toBe("Week 4");
  });

  it("explains when semester dates are unavailable", () => {
    expect(studyWeekLabel(study({
      weekNumber: 0,
      generatedAt: "2026-08-05T08:00:00.000Z",
    }))).toBe("Semester dates not set");
  });
});
