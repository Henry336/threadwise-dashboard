import type { DashboardWorkspace } from "./types";

export function isStudyView(view: string | undefined): boolean {
  return Boolean(view?.startsWith("study-"));
}

export function canOpenStudyView(view: string | undefined, workspace: DashboardWorkspace | undefined): boolean {
  return !isStudyView(view) || workspace?.mode === "STUDY";
}
