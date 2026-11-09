/** Decides whether a `?view=` value may open. The dashboard page uses it to return 404 for Study views outside a Study workspace. */
import type { DashboardWorkspace } from "./types";

/** Study views all start with `study-`. */
export function isStudyView(view: string | undefined): boolean {
  return Boolean(view?.startsWith("study-"));
}

/** Non-Study views always open. Study views open only when the selected workspace is the Study workspace. */
export function canOpenStudyView(view: string | undefined, workspace: DashboardWorkspace | undefined): boolean {
  return !isStudyView(view) || workspace?.mode === "STUDY";
}
