import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const isoDate = z.string().datetime({ offset: true });
const dateOnly = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/);
const timezone = text(80).refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}, "Invalid timezone");

const clock = z.string()
  .trim()
  .regex(/^(?:[01]?\d|2[0-3]):[0-5]\d$/)
  .transform((value) => {
    const [hour, minute] = value.split(":");
    return `${hour!.padStart(2, "0")}:${minute}`;
  });

// Quiet hours are optional display preferences. Normalize known legacy H:mm
// values and omit truly malformed values instead of rejecting the user's
// otherwise-valid dashboard snapshot.
const optionalClock = z.preprocess(
  (value) => value === null ? undefined : value,
  clock.optional(),
).catch(undefined);

const TaskAssigneeSchema = z.object({
  id: text(100),
  telegramId: z.string().regex(/^[1-9]\d{0,19}$/).optional(),
  username: optionalText(64),
  displayName: text(240),
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "BLOCKED"]),
  statusReason: optionalText(500),
  respondedAt: isoDate.optional(),
  updatedAt: isoDate,
});

const TaskSchema = z.object({
  id: text(100), publicId: text(50), title: text(500), description: optionalText(5_000),
  dueAt: isoDate.nullish().transform((value) => value ?? undefined),
  nextReminderAt: isoDate.nullish().transform((value) => value ?? undefined),
  snoozedUntil: isoDate.nullish().transform((value) => value ?? undefined),
  reminderIntervalMinutes: z.number().int().min(1).max(525_600).nullish().transform((value) => value ?? undefined),
  status: z.enum(["OPEN", "DONE", "CANCELED"]),
  recurrenceRule: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).nullish().transform((value) => value ?? undefined),
  recurring: z.boolean().optional(), pinned: z.boolean().optional(),
  reminderCount: z.number().int().min(0).max(100_000).optional(), assignee: optionalText(200),
  calendarEventId: optionalText(500), calendarEventUrl: z.string().url().optional(),
  calendarSyncedAt: isoDate.nullish().transform((value) => value ?? undefined),
  assignees: z.array(TaskAssigneeSchema).max(100).optional(),
  createdAt: isoDate.optional(), updatedAt: isoDate.optional(),
});

const NoteSchema = z.object({
  id: text(100), publicId: text(50), title: text(500), body: optionalText(50_000),
  summary: z.string().max(10_000), tags: z.array(text(100)).max(50), createdAt: isoDate,
  updatedAt: isoDate.optional(), pinned: z.boolean().optional(),
});

const IdeaBriefSchema = z.object({
  buildability: z.number().min(0).max(10),
  usefulness: z.number().min(0).max(10),
  novelty: z.number().min(0).max(10),
  portfolioValue: z.number().min(0).max(10),
  monetization: z.number().min(0).max(10),
  difficulty: z.number().min(0).max(10),
  risk: z.number().min(0).max(10),
  summary: z.string().max(5_000),
  marketNotes: z.string().max(5_000),
  dos: z.array(z.string().trim().min(1).max(1_000)).max(20),
  donts: z.array(z.string().trim().min(1).max(1_000)).max(20),
});

const IdeaSchema = z.object({
  id: text(100), publicId: text(50), title: text(500), concept: z.string().max(20_000),
  status: z.enum(["RAW", "CLARIFIED", "SELECTED", "PROTOTYPING", "BUILT", "PAUSED", "REJECTED"]),
  tags: z.array(text(100)).max(50), createdAt: isoDate, updatedAt: isoDate.optional(), pinned: z.boolean().optional(),
  brief: IdeaBriefSchema.optional(),
});

const ImageSchema = z.object({
  id: text(100), publicId: text(50), mediaKind: text(50), mimeType: optionalText(200), fileName: optionalText(500),
  caption: optionalText(4_000), ocrText: optionalText(50_000), ocrConfidence: z.number().min(0).max(100).nullish().transform((value) => value ?? undefined),
  createdAt: isoDate, updatedAt: isoDate.optional(), pinned: z.boolean().optional(),
});

const ExpenseSchema = z.object({
  id: text(100), publicId: text(50), merchant: optionalText(500),
  description: z.string().max(5_000).nullish().transform((value) => value?.trim() || "Expense"),
  total: z.number().finite(), currency: z.string().regex(/^[A-Z]{3}$/), category: optionalText(200), transactionAt: isoDate,
  paymentMethod: optionalText(200), notes: optionalText(5_000), excelSyncedAt: isoDate.nullish().transform((value) => value ?? undefined),
  createdAt: isoDate.optional(),
});

const AvailabilityPollSchema = z.object({
  id: text(100), publicId: text(50), title: text(160),
  status: z.enum(["OPEN", "FINALIZED", "CANCELED"]),
  startDate: dateOnly, endDate: dateOnly, timezone,
  durationMinutes: z.number().int().min(15).max(240),
  dayStartMinutes: z.number().int().min(0).max(1_425),
  dayEndMinutes: z.number().int().min(15).max(1_440),
  slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  revision: z.number().int().positive(), createdByName: text(240),
  createdAt: isoDate, updatedAt: isoDate, telegramMessageId: optionalText(100),
  slots: z.array(isoDate).max(2_000),
  bestSlots: z.array(z.object({ startAt: isoDate, endAt: isoDate, availableCount: z.number().int().min(0).max(100_000) })).max(20),
  respondentCount: z.number().int().min(0).max(100_000), memberCount: z.number().int().min(0).max(100_000),
  respondents: z.array(z.object({ telegramId: z.string().regex(/^[1-9]\d{0,19}$/), displayName: text(240) })).max(10_000),
  pendingMembers: z.array(z.object({ telegramId: z.string().regex(/^[1-9]\d{0,19}$/), displayName: text(240), username: optionalText(64) })).max(10_000),
  viewerResponse: z.object({ timezone, availableStarts: z.array(isoDate).max(2_000), wantsCalendar: z.boolean() }).optional(),
  finalStartAt: isoDate.optional(), finalEndAt: isoDate.optional(), finalizedAt: isoDate.optional(),
  viewerCalendar: z.object({ connected: z.boolean(), synced: z.boolean(), eventUrl: z.string().url().optional() }).optional(),
});

export const DashboardSnapshotSchema = z.object({
  workspace: z.object({
    id: z.union([z.literal("personal"), z.string().uuid()]),
    kind: z.enum(["PERSONAL", "GROUP"]),
    name: text(240),
    role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
    memberCount: z.number().int().min(0).max(100_000).optional(),
  }).optional(),
  user: z.object({
    telegramId: z.string().regex(/^(?:[1-9]\d{0,19}|chat:-\d{1,20})$/), firstName: text(120), fullName: text(240),
    username: optionalText(64), avatarUrl: z.string().url().max(2_000).optional(), timezone,
    accent: z.enum(["iris", "coral", "mint"]),
  }),
  generatedAt: isoDate,
  tasks: z.array(TaskSchema).max(500), notes: z.array(NoteSchema).max(500), ideas: z.array(IdeaSchema).max(500),
  images: z.array(ImageSchema).max(1_000).optional(), expenses: z.array(ExpenseSchema).max(500),
  activity: z.array(z.object({ day: text(12), captures: z.number().int().min(0).max(10_000), completed: z.number().int().min(0).max(10_000) })).max(31),
  integrations: z.array(z.object({
    name: z.enum(["Calendar", "Excel"]), provider: z.enum(["calendar", "excel"]),
    state: z.enum(["connected", "attention", "available"]), detail: text(500),
    accountEmail: optionalText(320), autoSync: z.boolean(),
    syncedCount: z.number().int().min(0).max(1_000_000), unsyncedCount: z.number().int().min(0).max(1_000_000),
    workbookName: optionalText(500), workbookUrl: z.string().url().optional(),
  })).max(2),
  settings: z.object({
    timezone,
    reminderIntervalMinutes: z.number().int().min(1).max(525_600),
    quietHoursStart: optionalClock,
    quietHoursEnd: optionalClock,
    maxRemindersPerDay: z.number().int().min(1).max(2_000),
    dueNudgeMinutes: z.number().int().min(0).max(10_080),
    reminderMode: z.enum(["INDIVIDUAL", "DIGEST"]),
    expenseCurrency: z.string().regex(/^[A-Z]{3}$/),
    ocrLanguages: text(200),
    directNudgesEnabled: z.boolean(),
    calendarAutoSync: z.boolean().default(false),
    excelAutoSync: z.boolean().default(false),
  }).optional(),
  collaboration: z.object({
    viewerTelegramId: z.string().regex(/^[1-9]\d{0,19}$/),
    members: z.array(z.object({
      telegramId: z.string().regex(/^[1-9]\d{0,19}$/),
      username: optionalText(64),
      displayName: text(240),
      initials: text(8),
      role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
      lastSeenAt: isoDate,
      openTasks: z.number().int().min(0).max(100_000),
      blockedTasks: z.number().int().min(0).max(100_000),
      awaitingTasks: z.number().int().min(0).max(100_000),
    })).max(10_000),
    activity: z.array(z.object({
      id: text(100),
      type: text(60),
      actorTelegramId: z.string().regex(/^[1-9]\d{0,19}$/),
      actorName: text(240),
      taskPublicId: optionalText(50),
      taskTitle: optionalText(500),
      summary: text(1_000),
      createdAt: isoDate,
    })).max(100),
    summary: z.object({
      overdue: z.number().int().min(0).max(100_000),
      unassigned: z.number().int().min(0).max(100_000),
      awaitingAcknowledgement: z.number().int().min(0).max(100_000),
      blocked: z.number().int().min(0).max(100_000),
      createdThisWeek: z.number().int().min(0).max(100_000),
      completedThisWeek: z.number().int().min(0).max(100_000),
      handoffsThisWeek: z.number().int().min(0).max(100_000),
    }),
  }).optional(),
  scheduling: z.object({ polls: z.array(AvailabilityPollSchema).max(100) }).optional(),
});

export function parseDashboardSnapshot(input: unknown) {
  return DashboardSnapshotSchema.parse(input);
}
