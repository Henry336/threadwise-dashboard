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

  it("accepts a resolved group owner but rejects malformed workspace identities", () => {
    const input = snapshot("03:00", "06:00");
    input.user.telegramId = "chat:-100";
    expect(parseDashboardSnapshot(input).user.telegramId).toBe("chat:-100");
    input.user.telegramId = "chat:not-a-group";
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

  it("accepts shared assignment states and the compact group collaboration summary", () => {
    const parsed = parseDashboardSnapshot({
      ...snapshot("03:00", "06:00"),
      tasks: [{
        id: "task-1", publicId: "TASK-1", title: "Prepare launch notes", status: "OPEN",
        assignees: [{
          id: "assignee-1", telegramId: "123456789", displayName: "Henry",
          status: "BLOCKED", statusReason: "Waiting for figures",
          updatedAt: "2026-07-17T12:00:00.000Z",
        }],
      }],
      collaboration: {
        viewerTelegramId: "123456789",
        members: [{
          telegramId: "123456789", displayName: "Henry", initials: "H", role: "OWNER",
          lastSeenAt: "2026-07-17T12:00:00.000Z", openTasks: 1, blockedTasks: 1, awaitingTasks: 0,
        }],
        activity: [{
          id: "activity-1", type: "TASK_BLOCKED", actorTelegramId: "123456789", actorName: "Henry",
          taskPublicId: "TASK-1", summary: "Henry blocked TASK-1.", createdAt: "2026-07-17T12:00:00.000Z",
        }],
        summary: {
          overdue: 0, unassigned: 0, awaitingAcknowledgement: 0, blocked: 1,
          createdThisWeek: 1, completedThisWeek: 0, handoffsThisWeek: 0,
        },
      },
    });

    expect(parsed.tasks[0]?.assignees?.[0]).toMatchObject({ status: "BLOCKED", statusReason: "Waiting for figures" });
    expect(parsed.collaboration?.summary.blocked).toBe(1);
  });

  it("accepts group scheduling while keeping every member's raw availability private", () => {
    const parsed = parseDashboardSnapshot({
      ...snapshot("03:00", "06:00"),
      scheduling: { polls: [{
        id: "poll-1", publicId: "TIME-A1B2C3", title: "Project rehearsal", status: "OPEN",
        startDate: "2026-07-24", endDate: "2026-07-26", timezone: "Asia/Singapore",
        durationMinutes: 60, dayStartMinutes: 480, dayEndMinutes: 1320, slotMinutes: 30, revision: 2,
        createdByName: "Henry", createdAt: "2026-07-23T12:00:00.000Z", updatedAt: "2026-07-23T12:05:00.000Z",
        slots: ["2026-07-24T01:00:00.000Z", "2026-07-24T01:30:00.000Z"],
        bestSlots: [{ startAt: "2026-07-24T01:00:00.000Z", endAt: "2026-07-24T02:00:00.000Z", availableCount: 2 }],
        respondentCount: 2, memberCount: 3,
        respondents: [{ telegramId: "123456789", displayName: "Henry" }],
        pendingMembers: [{ telegramId: "987654321", displayName: "Maya", username: "maya" }],
        viewerResponse: { timezone: "Asia/Singapore", availableStarts: ["2026-07-24T01:00:00.000Z"], wantsCalendar: true },
        viewerCalendar: { connected: true, synced: false },
      }] },
    });
    expect(parsed.scheduling?.polls[0]).toMatchObject({ publicId: "TIME-A1B2C3", respondentCount: 2 });
    expect(parsed.scheduling?.polls[0]).not.toHaveProperty("responses");
  });

  it("rejects malformed scheduling windows", () => {
    const input = { ...snapshot("03:00", "06:00"), scheduling: { polls: [{ id: "poll-1", publicId: "TIME-A1B2C3", title: "Meeting", status: "OPEN", startDate: "tomorrow", endDate: "2026-07-26", timezone: "Asia/Singapore", durationMinutes: 60, dayStartMinutes: 480, dayEndMinutes: 1320, slotMinutes: 30, revision: 1, createdByName: "Henry", createdAt: "2026-07-23T12:00:00.000Z", updatedAt: "2026-07-23T12:00:00.000Z", slots: [], bestSlots: [], respondentCount: 0, memberCount: 1, respondents: [], pendingMembers: [] }] } };
    expect(() => parseDashboardSnapshot(input)).toThrow();
  });
});
