import { describe, expect, it } from "vitest";
import { studyAnalysisAction, studyAnalysisEvidenceNumbers, studyAnalysisInitialModuleId, studyAnalysisModules, studyAnalysisReason } from "./study-analysis";
import type { StudyModule, StudyResource, StudySession } from "./study-types";

const moduleValue = (id: string, active = true): StudyModule => ({
  id, code: id.toUpperCase(), name: id, active, displayOrder: 0,
  currentMastery: "UNASSESSED", updatedAt: "2026-08-12T10:00:00.000Z",
});

const sessionValue = (id: string, moduleId: string, endedAt?: string, archivedAt?: string): StudySession => ({
  id, moduleId, startedAt: "2026-08-12T09:00:00.000Z", endedAt,
  method: "Focused study", techniques: [], topicsMixed: [], timed: false, archivedAt,
  module: { code: moduleId.toUpperCase(), name: moduleId }, resources: [],
});

describe("Study module analysis helpers", () => {
  it("offers active modules with a completed session or a saved resource", () => {
    const modules = [moduleValue("one"), moduleValue("two"), moduleValue("three", false)];
    const sessions = [
      sessionValue("s1", "one", "2026-08-12T10:00:00.000Z"),
      sessionValue("s2", "two"),
      sessionValue("s3", "three", "2026-08-12T11:00:00.000Z"),
    ];
    const resourceOnly = [{ id: "r1", moduleId: "two" }] as StudyResource[];
    expect(studyAnalysisModules(modules, sessions, resourceOnly).map((module) => module.id)).toEqual(["one", "two"]);
  });

  it("prefers the requested eligible module, then the latest completed session", () => {
    const modules = [moduleValue("one"), moduleValue("two")];
    const sessions = [
      sessionValue("s1", "one", "2026-08-12T10:00:00.000Z"),
      sessionValue("s2", "two", "2026-08-12T12:00:00.000Z"),
    ];
    expect(studyAnalysisInitialModuleId(modules, sessions, [], "one")).toBe("one");
    expect(studyAnalysisInitialModuleId(modules, sessions, [])).toBe("two");
  });

  it("numbers evidence in stable response order", () => {
    expect([...studyAnalysisEvidenceNumbers(["session-1", "resource-1"])]).toEqual([
      ["session-1", 1], ["resource-1", 2],
    ]);
  });

  it("turns reason codes into recovery copy", () => {
    expect(studyAnalysisReason("complete_a_session_first")).toBe("Complete a module session first.");
    expect(studyAnalysisReason("save_study_evidence_first")).toContain("note or image");
    expect(studyAnalysisReason("worker_unavailable")).toContain("offline");
    expect(studyAnalysisReason("provider_unavailable")).toContain("Saved results");
    expect(studyAnalysisReason("unexpected_code")).toBe("Analysis is unavailable right now.");
  });

  it("does not offer a redundant refresh for current analysis", () => {
    expect(studyAnalysisAction({ status: "COMPLETE", stale: false } as never)).toBeNull();
    expect(studyAnalysisAction({ status: "COMPLETE", stale: true } as never)).toBe("Update analysis");
    expect(studyAnalysisAction({ status: "FAILED" } as never)).toBe("Try again");
  });
});
