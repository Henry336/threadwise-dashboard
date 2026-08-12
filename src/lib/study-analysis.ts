import type { StudyModule, StudyModuleAnalysis, StudyResource, StudySession } from "./study-types";

export function studyAnalysisModules(modules: StudyModule[], sessions: StudySession[], resources: StudyResource[]) {
  const completedModuleIds = new Set(
    sessions
      .filter((session) => Boolean(session.endedAt) && !session.archivedAt)
      .map((session) => session.moduleId),
  );
  void resources;
  return modules.filter((module) => module.active && !module.userArchivedAt && completedModuleIds.has(module.id));
}

export function studyAnalysisInitialModuleId(
  modules: StudyModule[],
  sessions: StudySession[],
  resources: StudyResource[],
  preferredModuleId?: string | null,
) {
  const eligible = studyAnalysisModules(modules, sessions, resources);
  if (preferredModuleId && eligible.some((module) => module.id === preferredModuleId)) return preferredModuleId;

  const eligibleIds = new Set(eligible.map((module) => module.id));
  const latest = sessions
    .filter((session) => Boolean(session.endedAt) && !session.archivedAt && eligibleIds.has(session.moduleId))
    .sort((left, right) => Date.parse(right.endedAt ?? right.startedAt) - Date.parse(left.endedAt ?? left.startedAt))[0];
  return latest?.moduleId ?? eligible[0]?.id ?? "";
}

export function studyAnalysisEvidenceNumbers(evidenceIds: string[]) {
  return new Map(evidenceIds.map((id, index) => [id, index + 1]));
}

export function studyAnalysisReason(reason?: string, fallback = "Analysis is unavailable right now.") {
  if (!reason) return fallback;
  if (reason === "complete_a_session_first") return "Complete a module session first.";
  if (reason === "worker_unavailable") return "Analysis is offline right now. Saved results stay available.";
  if (reason === "request_recently_submitted") return "That review was just requested.";
  return reason.includes("_") ? fallback : reason;
}

export function studyAnalysisAction(analysis?: StudyModuleAnalysis | null) {
  if (analysis?.status === "COMPLETE" && !analysis.stale) return null;
  if (analysis?.status === "FAILED") return "Try again";
  if (analysis?.status === "COMPLETE") return "Update analysis";
  return "Analyze module";
}
