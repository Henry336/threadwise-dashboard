import { describe, expect, it } from "vitest";
import { focusStructureLabel, sessionCustomMethod, sessionElapsedSeconds, sessionMethodSummary } from "./study-session";

describe("study session helpers", () => {
  it("builds a concise, deduplicated method summary", () => {
    expect(sessionMethodSummary("pomodoro", ["Retrieval practice"], "Practice set"))
      .toBe("Pomodoro · Retrieval practice · Practice set");
    expect(sessionMethodSummary("pomodoro", ["Pomodoro"], ""))
      .toBe("Pomodoro");
  });

  it("keeps unknown focus structures readable", () => {
    expect(focusStructureLabel("90 / 20")).toBe("90 / 20");
  });

  it("separates the user's custom method from structured choices", () => {
    expect(sessionCustomMethod({
      method: "Pomodoro · Retrieval practice · Topic 3 worksheet",
      focusStructure: "pomodoro",
      techniques: ["Retrieval practice"],
    })).toBe("Topic 3 worksheet");
  });

  it("never returns a negative elapsed duration", () => {
    expect(sessionElapsedSeconds("2026-08-12T10:00:00.000Z", Date.parse("2026-08-12T10:01:05.000Z"))).toBe(65);
    expect(sessionElapsedSeconds("2026-08-12T10:00:00.000Z", Date.parse("2026-08-12T09:59:00.000Z"))).toBe(0);
  });
});
