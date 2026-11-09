/** Label for the current academic week, shown in the Study header and weekly review. */
import type { StudySnapshot } from "./study-types";

/**
 * Uses the backend's week number when there is one. Before the semester starts it says when Week 1 begins,
 * and without semester dates it says so, instead of showing a misleading "Week 0".
 */
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
