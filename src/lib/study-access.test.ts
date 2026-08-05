import { describe, expect, it } from "vitest";
import { canOpenStudyView, isStudyView } from "./study-access";

const study = { id: "study", kind: "GROUP", name: "Study", role: "OWNER", mode: "STUDY" } as const;
const group = { id: "group", kind: "GROUP", name: "Project", role: "OWNER" } as const;
const personal = { id: "personal", kind: "PERSONAL", name: "Henry", role: "OWNER" } as const;

describe("Study dashboard route visibility", () => {
  it("recognizes only the namespaced Study views", () => {
    expect(isStudyView("study-library")).toBe(true);
    expect(isStudyView("library")).toBe(false);
    expect(isStudyView(undefined)).toBe(false);
  });

  it("hides direct Study URLs outside the sealed Study workspace", () => {
    expect(canOpenStudyView("study-overview", personal)).toBe(false);
    expect(canOpenStudyView("study-overview", group)).toBe(false);
    expect(canOpenStudyView("study-overview", undefined)).toBe(false);
  });

  it("allows the Study workspace and leaves ordinary dashboard views alone", () => {
    expect(canOpenStudyView("study-overview", study)).toBe(true);
    expect(canOpenStudyView("tasks", personal)).toBe(true);
    expect(canOpenStudyView(undefined, group)).toBe(true);
  });
});
