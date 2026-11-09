/** Helpers for the Study module analysis panel in Deep Work (`study-deep-work.tsx`). */
import type { StudyModule, StudyModuleAnalysis, StudyResource, StudySession } from "./study-types";

/**
 * Modules that can be analysed: active, not archived, and with at least one finished session or saved
 * resource. The backend has the same rule; filtering here avoids offering a button that would be refused.
 */
export function studyAnalysisModules(modules: StudyModule[], sessions: StudySession[], resources: StudyResource[]) {
  const completedModuleIds = new Set(
    sessions
      .filter((session) => Boolean(session.endedAt) && !session.archivedAt)
      .map((session) => session.moduleId),
  );
  const resourceModuleIds = new Set(resources.map((resource) => resource.moduleId));
  return modules.filter((module) => module.active && !module.userArchivedAt && (completedModuleIds.has(module.id) || resourceModuleIds.has(module.id)));
}

/** Which module the panel opens on: the preferred one if eligible, else the module of the latest finished session, else the first eligible one. */
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

/** Numbers each evidence id 1, 2, 3 in order, for the citation markers in the analysis text. */
export function studyAnalysisEvidenceNumbers(evidenceIds: string[]) {
  return new Map(evidenceIds.map((id, index) => [id, index + 1]));
}

/** Turns a backend reason code into a sentence for the user. Unknown codes (anything with an underscore) get the fallback text. */
export function studyAnalysisReason(reason?: string, fallback = "Analysis is unavailable right now.") {
  if (!reason) return fallback;
  if (reason === "complete_a_session_first") return "Complete a module session first.";
  if (reason === "save_study_evidence_first") return "Complete a module session or save a note or image first.";
  if (reason === "worker_unavailable" || reason === "provider_unavailable") return "Analysis is offline right now. Saved results stay available.";
  if (reason === "request_recently_submitted") return "That review was just requested.";
  return reason.includes("_") ? fallback : reason;
}

/** Label for the analysis button, or null when a fresh complete analysis needs no action. */
export function studyAnalysisAction(analysis?: StudyModuleAnalysis | null) {
  if (analysis?.status === "COMPLETE" && !analysis.stale) return null;
  if (analysis?.status === "FAILED") return "Try again";
  if (analysis?.status === "COMPLETE") return "Update analysis";
  return "Analyze module";
}
