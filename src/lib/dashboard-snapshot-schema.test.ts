import { describe, expect, it } from "vitest";
import { parseDashboardSnapshot } from "./dashboard-snapshot-schema";

function snapshot(quietHoursStart: unknown, quietHoursEnd: unknown) {
  return {
    user: {
      telegramId: "123456789",
      firstName: "Henry",
      fullName: "Henry",
      timezone: "Asia/Singapore",
      accent: "iris",
    },
    generatedAt: "2026-07-17T12:00:00.000Z",
    tasks: [], notes: [], ideas: [], images: [], expenses: [], activity: [], integrations: [],
    settings: {
      timezone: "Asia/Singapore",
      reminderIntervalMinutes: 180,
      quietHoursStart,
      quietHoursEnd,
      maxRemindersPerDay: 200,
      dueNudgeMinutes: 3,
      reminderMode: "INDIVIDUAL",
      expenseCurrency: "SGD",
      ocrLanguages: "eng",
      directNudgesEnabled: false,
    },
  };
}

describe("dashboard snapshot contract", () => {
  it("normalizes the legacy quiet hours that previously blanked Henry's dashboard", () => {
    const parsed = parseDashboardSnapshot(snapshot("3:00", "6:00"));
    expect(parsed.settings).toMatchObject({ quietHoursStart: "03:00", quietHoursEnd: "06:00" });
  });

  it("omits malformed optional quiet hours without rejecting valid user data", () => {
    const parsed = parseDashboardSnapshot(snapshot("dawn", "25:00"));
    expect(parsed.settings?.quietHoursStart).toBeUndefined();
    expect(parsed.settings?.quietHoursEnd).toBeUndefined();
    expect(parsed.user.firstName).toBe("Henry");
  });

  it("still rejects an invalid authenticated user identity", () => {
    const input = snapshot("03:00", "06:00");
    input.user.telegramId = "chat:-100";
    expect(() => parseDashboardSnapshot(input)).toThrow();
  });

  it("preserves a task snooze revision used by the live task controls", () => {
    const parsed = parseDashboardSnapshot({
      ...snapshot("03:00", "06:00"),
      tasks: [{
        id: "task-1",
        publicId: "TASK-1",
        title: "Review the launch plan",
        status: "OPEN",
        snoozedUntil: "2026-07-17T13:00:00.000Z",
        updatedAt: "2026-07-17T12:00:00.000Z",
      }],
    });

    expect(parsed.tasks[0]?.snoozedUntil).toBe("2026-07-17T13:00:00.000Z");
  });

  it("preserves saved idea briefs and image favourites", () => {
    const brief = {
      buildability: 8, usefulness: 9, novelty: 7, portfolioValue: 8,
      monetization: 6, difficulty: 4, risk: 3,
      summary: "A focused concept.", marketNotes: "Validate retention first.",
      dos: ["Interview users."], donts: ["Overbuild the first version."],
    };
    const parsed = parseDashboardSnapshot({
      ...snapshot("03:00", "06:00"),
      ideas: [{
        id: "idea-1", publicId: "IDEA-1", title: "A calmer capture tool",
        concept: "Save useful thoughts without friction.", status: "RAW", tags: [],
        createdAt: "2026-07-17T12:00:00.000Z", brief,
      }],
      images: [{
        id: "image-1", publicId: "IMG-1", mediaKind: "photo", pinned: true,
        createdAt: "2026-07-17T12:00:00.000Z",
      }],
    });

    expect(parsed.ideas[0]?.brief).toEqual(brief);
    expect(parsed.images?.[0]?.pinned).toBe(true);
  });
});
