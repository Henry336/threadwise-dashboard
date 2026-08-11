import { describe, expect, it } from "vitest";
import { parseStudyOrientation, studyTimetablePreferenceKey } from "./study-preferences";

describe("study timetable preferences", () => {
  it("scopes orientation to the Study workspace", () => {
    expect(studyTimetablePreferenceKey("workspace-1")).toBe("threadwise-study-timetable-orientation:v1:workspace-1");
  });

  it("restores only supported orientations", () => {
    expect(parseStudyOrientation("horizontal")).toBe("horizontal");
    expect(parseStudyOrientation("vertical")).toBe("vertical");
    expect(parseStudyOrientation("unknown")).toBe("vertical");
    expect(parseStudyOrientation(null)).toBe("vertical");
  });
});
