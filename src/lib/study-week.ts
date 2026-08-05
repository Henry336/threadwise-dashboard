import type { StudySnapshot } from "./study-types";

export function studyWeekLabel(study: Pick<StudySnapshot, "weekNumber" | "generatedAt" | "workspace">): string {
  if (study.weekNumber > 0) return `Week ${study.weekNumber}`;
  const startValue = study.workspace.semesterStartDate;
  if (!startValue) return "Semester dates not set";
  const start = new Date(startValue);
  const now = new Date(study.generatedAt);
  if (!Number.isFinite(start.getTime())) return "Semester dates not set";
  if (start.getTime() > now.getTime()) {
    const date = new Intl.DateTimeFormat("en-SG", {
      day: "numeric",
      month: "short",
      timeZone: study.workspace.timezone,
    }).format(start);
    return `Pre-semester · Week 1 begins ${date}`;
  }
  return "Week 1";
}
