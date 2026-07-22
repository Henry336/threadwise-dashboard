import type { DashboardSnapshot } from "./types";

const at = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString();
};

export function getDemoSnapshot(): DashboardSnapshot {
  return {
    workspace: { id: "personal", kind: "PERSONAL", name: "Demo workspace", role: "OWNER" },
    user: {
      telegramId: "demo",
      firstName: "Maya",
      fullName: "Maya Chen",
      username: "maya_demo",
      timezone: "Asia/Singapore",
      accent: "iris",
    },
    generatedAt: new Date().toISOString(),
    tasks: [
      {
        id: "task-1",
        publicId: "T-184",
        title: "Review the launch copy",
        description: "Tighten the final page and confirm the handoff notes.",
        dueAt: at(0, 11, 30),
        status: "OPEN",
        pinned: true,
        reminderCount: 1,
      },
      {
        id: "task-2",
        publicId: "T-191",
        title: "Send project notes to the team",
        dueAt: at(0, 15, 0),
        status: "OPEN",
        assignee: "You",
      },
      {
        id: "task-3",
        publicId: "T-195",
        title: "Weekly expense review",
        dueAt: at(0, 19, 0),
        status: "OPEN",
        recurring: true,
      },
      {
        id: "task-4",
        publicId: "T-177",
        title: "Return the library book",
        dueAt: at(-1, 17, 0),
        status: "OPEN",
        reminderCount: 2,
      },
      {
        id: "task-5",
        publicId: "T-163",
        title: "Archive the old workspace",
        dueAt: at(-1, 13, 0),
        status: "DONE",
      },
      {
        id: "task-6",
        publicId: "T-201",
        title: "Outline next week’s priorities",
        dueAt: at(1, 10, 0),
        status: "OPEN",
      },
      {
        id: "task-7",
        publicId: "T-204",
        title: "Pick up the parcel",
        dueAt: at(2, 12, 0),
        status: "OPEN",
      },
    ],
    notes: [
      {
        id: "note-1",
        publicId: "N-72",
        title: "Dashboard principles",
        summary: "The interface should feel like a quiet desk: immediate, legible, and never demanding attention for its own sake.",
        tags: ["product", "design"],
        createdAt: at(0, 9, 12),
        pinned: true,
      },
      {
        id: "note-2",
        publicId: "N-70",
        title: "Deep-work routine",
        summary: "Batch small administrative work after lunch, then keep the late afternoon clear for focused work.",
        tags: ["routine", "focus"],
        createdAt: at(-1, 18, 40),
      },
      {
        id: "note-3",
        publicId: "N-68",
        title: "Launch checklist",
        summary: "Keep a rollback copy, verify the key paths, and watch the first week of feedback closely.",
        tags: ["launch"],
        createdAt: at(-2, 22, 7),
      },
    ],
    ideas: [
      {
        id: "idea-1",
        publicId: "I-38",
        title: "Daily threadline",
        concept: "Turn tasks and reminders into one calm, chronological strand instead of another crowded calendar.",
        status: "PROTOTYPING",
        tags: ["dashboard", "ux"],
        createdAt: at(-1, 10, 24),
      },
      {
        id: "idea-2",
        publicId: "I-35",
        title: "Voice inbox",
        concept: "Capture a thought in one breath, then let Threadwise sort it into the right place.",
        status: "CLARIFIED",
        tags: ["capture", "voice"],
        createdAt: at(-4, 21, 10),
      },
      {
        id: "idea-3",
        publicId: "I-31",
        title: "Shared assignment handoff",
        concept: "Give group tasks a lightweight trail from assignment to acknowledgement to completion.",
        status: "RAW",
        tags: ["groups"],
        createdAt: at(-7, 14, 30),
      },
    ],
    images: [
      {
        id: "image-1", publicId: "IMG-28", mediaKind: "photo", mimeType: "image/svg+xml",
        fileName: "garden-light.svg", caption: "Late afternoon light in the garden", ocrText: "", createdAt: at(0, 16, 42),
      },
      {
        id: "image-2", publicId: "IMG-27", mediaKind: "photo", mimeType: "image/svg+xml",
        fileName: "launch-board.svg", caption: "Launch board after the planning session", ocrText: "Launch · polish · publish", createdAt: at(0, 10, 18),
      },
      {
        id: "image-3", publicId: "IMG-26", mediaKind: "photo", mimeType: "image/svg+xml",
        fileName: "morning-cafe.svg", caption: "A quiet table before class", ocrText: "Morning Tide", createdAt: at(-1, 8, 22),
      },
      {
        id: "image-4", publicId: "IMG-25", mediaKind: "document", mimeType: "image/svg+xml",
        fileName: "receipt.svg", caption: "Notebook receipt", ocrText: "Paper & Pine · notebook · pens · $14.90", createdAt: at(-1, 16, 18),
      },
      {
        id: "image-5", publicId: "IMG-24", mediaKind: "photo", mimeType: "image/svg+xml",
        fileName: "city-rain.svg", caption: "Rain on the walk home", ocrText: "", createdAt: at(-3, 20, 4),
      },
      {
        id: "image-6", publicId: "IMG-23", mediaKind: "photo", mimeType: "image/svg+xml",
        fileName: "book-stack.svg", caption: "References for the next project", ocrText: "Design systems · Quiet interfaces", createdAt: at(-6, 13, 12),
      },
    ],
    expenses: [
      {
        id: "expense-1",
        publicId: "E-52",
        merchant: "Morning Tide",
        description: "Coffee and toast",
        total: 8.4,
        currency: "SGD",
        category: "Food",
        transactionAt: at(0, 8, 34),
      },
      {
        id: "expense-2",
        publicId: "E-51",
        merchant: "Paper & Pine",
        description: "Notebook and pens",
        total: 14.9,
        currency: "SGD",
        category: "School",
        transactionAt: at(-1, 16, 18),
      },
      {
        id: "expense-3",
        publicId: "E-48",
        merchant: "SimplyGo",
        description: "Transit top-up",
        total: 20,
        currency: "SGD",
        category: "Transport",
        transactionAt: at(-3, 12, 0),
      },
      {
        id: "expense-4",
        publicId: "E-46",
        merchant: "FairPrice",
        description: "Groceries",
        total: 36.25,
        currency: "SGD",
        category: "Food",
        transactionAt: at(-5, 19, 44),
      },
    ],
    activity: [
      { day: "Mon", captures: 5, completed: 3 },
      { day: "Tue", captures: 8, completed: 5 },
      { day: "Wed", captures: 4, completed: 4 },
      { day: "Thu", captures: 10, completed: 6 },
      { day: "Fri", captures: 7, completed: 5 },
      { day: "Sat", captures: 3, completed: 2 },
      { day: "Sun", captures: 6, completed: 4 },
    ],
    integrations: [
      { provider: "calendar", name: "Calendar", state: "connected", detail: "2 dated tasks synced", autoSync: true, syncedCount: 2, unsyncedCount: 1 },
      { provider: "excel", name: "Excel", state: "connected", detail: "Threadwise Expenses.xlsx", autoSync: true, syncedCount: 3, unsyncedCount: 0, workbookName: "Threadwise Expenses.xlsx" },
    ],
    settings: {
      timezone: "Asia/Singapore",
      reminderIntervalMinutes: 180,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      maxRemindersPerDay: 24,
      dueNudgeMinutes: 5,
      reminderMode: "INDIVIDUAL",
      expenseCurrency: "SGD",
      ocrLanguages: "eng",
      directNudgesEnabled: false,
      calendarAutoSync: true,
      excelAutoSync: true,
    },
  };
}

export function getGroupDemoSnapshot(): DashboardSnapshot {
  const personal = getDemoSnapshot();
  const now = new Date().toISOString();
  const groupTaskCopy: Record<string, { title: string; description?: string }> = {
    "task-3": { title: "Confirm the launch venue", description: "Lock the room and share access details with the team." },
    "task-4": { title: "Prepare the venue fallback", description: "Waiting for venue confirmation." },
    "task-7": { title: "Schedule the final rehearsal", description: "Find a time that works for every assignee." },
  };
  const members: NonNullable<DashboardSnapshot["collaboration"]>["members"] = [
    { telegramId: "1001", username: "maya", displayName: "Maya", initials: "M", role: "OWNER", lastSeenAt: now, openTasks: 2, blockedTasks: 0, awaitingTasks: 0 },
    { telegramId: "1002", username: "alex", displayName: "Alex", initials: "A", role: "ADMIN", lastSeenAt: now, openTasks: 2, blockedTasks: 0, awaitingTasks: 1 },
    { telegramId: "1003", username: "priya", displayName: "Priya", initials: "P", role: "MEMBER", lastSeenAt: now, openTasks: 1, blockedTasks: 1, awaitingTasks: 0 },
  ];
  const assignment = (id: string, member: typeof members[number], status: "PENDING" | "ACCEPTED" | "BLOCKED", statusReason?: string) => ({
    id,
    telegramId: member.telegramId,
    username: member.username,
    displayName: member.displayName,
    status,
    ...(statusReason ? { statusReason } : {}),
    updatedAt: now,
  });
  const tasks = personal.tasks.map((task, index) => ({
    ...task,
    ...(groupTaskCopy[task.id] ?? {}),
    createdAt: task.dueAt ?? now,
    updatedAt: now,
    assignees: index === 0 ? [assignment("assignment-1", members[0], "ACCEPTED")]
      : index === 1 ? [assignment("assignment-2", members[1], "PENDING")]
        : index === 3 ? [assignment("assignment-3", members[2], "BLOCKED", "Waiting for venue confirmation")]
          : [],
  }));
  return {
    ...personal,
    workspace: { id: "group-demo", kind: "GROUP", name: "Launch circle", role: "OWNER", memberCount: members.length },
    user: { ...personal.user, telegramId: "1001", firstName: "Maya" },
    tasks,
    expenses: [],
    integrations: [],
    collaboration: {
      viewerTelegramId: "1001",
      members,
      activity: [
        { id: "activity-1", type: "TASK_COMPLETED", actorTelegramId: "1001", actorName: "Maya", taskPublicId: "T-163", taskTitle: "Archive the old workspace", summary: "Maya completed T-163.", createdAt: at(0, 9, 8) },
        { id: "activity-2", type: "TASK_ASSIGNED", actorTelegramId: "1001", actorName: "Maya", taskPublicId: "T-191", taskTitle: "Send project notes to the team", summary: "Maya assigned T-191 to Alex.", createdAt: at(-1, 18, 20) },
        { id: "activity-3", type: "TASK_BLOCKED", actorTelegramId: "1003", actorName: "Priya", taskPublicId: "T-177", taskTitle: "Prepare the venue fallback", summary: "Priya blocked T-177 while waiting for venue confirmation.", createdAt: at(-1, 14, 5) },
      ],
      summary: { overdue: 1, unassigned: 3, awaitingAcknowledgement: 1, blocked: 1, createdThisWeek: 6, completedThisWeek: 1, handoffsThisWeek: 1 },
    },
  };
}
