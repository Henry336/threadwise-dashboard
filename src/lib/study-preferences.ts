/** Per-workspace Study display preferences kept in the browser. */
export type StudyOrientation = "vertical" | "horizontal";

/** localStorage key for the timetable orientation. It includes the workspace id and a version. */
export function studyTimetablePreferenceKey(workspaceId: string) {
  return `threadwise-study-timetable-orientation:v1:${workspaceId}`;
}

/** Reads a stored value. Anything unexpected falls back to the vertical layout. */
export function parseStudyOrientation(value: string | null | undefined): StudyOrientation {
  return value === "horizontal" ? "horizontal" : "vertical";
}
