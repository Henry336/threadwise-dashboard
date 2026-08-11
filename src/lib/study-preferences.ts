export type StudyOrientation = "vertical" | "horizontal";

export function studyTimetablePreferenceKey(workspaceId: string) {
  return `threadwise-study-timetable-orientation:v1:${workspaceId}`;
}

export function parseStudyOrientation(value: string | null | undefined): StudyOrientation {
  return value === "horizontal" ? "horizontal" : "vertical";
}
