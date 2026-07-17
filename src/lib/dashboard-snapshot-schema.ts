import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const isoDate = z.string().datetime({ offset: true });
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

const TaskSchema = z.object({
  id: text(100), publicId: text(50), title: text(500), description: optionalText(5_000),
  dueAt: isoDate.nullish().transform((value) => value ?? undefined),
  nextReminderAt: isoDate.nullish().transform((value) => value ?? undefined),
  reminderIntervalMinutes: z.number().int().min(1).max(525_600).nullish().transform((value) => value ?? undefined),
  status: z.enum(["OPEN", "DONE", "CANCELED"]),
  recurrenceRule: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).nullish().transform((value) => value ?? undefined),
  recurring: z.boolean().optional(), pinned: z.boolean().optional(),
  reminderCount: z.number().int().min(0).max(100_000).optional(), assignee: optionalText(200),
  createdAt: isoDate.optional(), updatedAt: isoDate.optional(),
});

const NoteSchema = z.object({
  id: text(100), publicId: text(50), title: text(500), body: optionalText(50_000),
  summary: z.string().max(10_000), tags: z.array(text(100)).max(50), createdAt: isoDate,
  updatedAt: isoDate.optional(), pinned: z.boolean().optional(),
});

const IdeaSchema = z.object({
  id: text(100), publicId: text(50), title: text(500), concept: z.string().max(20_000),
  status: z.enum(["RAW", "CLARIFIED", "SELECTED", "PROTOTYPING", "BUILT", "PAUSED", "REJECTED"]),
  tags: z.array(text(100)).max(50), createdAt: isoDate, updatedAt: isoDate.optional(), pinned: z.boolean().optional(),
});

const ImageSchema = z.object({
  id: text(100), publicId: text(50), mediaKind: text(50), mimeType: optionalText(200), fileName: optionalText(500),
  caption: optionalText(4_000), ocrText: optionalText(50_000), ocrConfidence: z.number().min(0).max(100).nullish().transform((value) => value ?? undefined),
  createdAt: isoDate, updatedAt: isoDate.optional(),
});

const ExpenseSchema = z.object({
  id: text(100), publicId: text(50), merchant: optionalText(500),
  description: z.string().max(5_000).nullish().transform((value) => value?.trim() || "Expense"),
  total: z.number().finite(), currency: z.string().regex(/^[A-Z]{3}$/), category: optionalText(200), transactionAt: isoDate,
  paymentMethod: optionalText(200), notes: optionalText(5_000), excelSyncedAt: isoDate.nullish().transform((value) => value ?? undefined),
  createdAt: isoDate.optional(),
});

export const DashboardSnapshotSchema = z.object({
  user: z.object({
    telegramId: z.string().regex(/^[1-9]\d{0,19}$/), firstName: text(120), fullName: text(240),
    username: optionalText(64), avatarUrl: z.string().url().max(2_000).optional(), timezone,
    accent: z.enum(["iris", "coral", "mint"]),
  }),
  generatedAt: isoDate,
  tasks: z.array(TaskSchema).max(500), notes: z.array(NoteSchema).max(500), ideas: z.array(IdeaSchema).max(500),
  images: z.array(ImageSchema).max(1_000).optional(), expenses: z.array(ExpenseSchema).max(500),
  activity: z.array(z.object({ day: text(12), captures: z.number().int().min(0).max(10_000), completed: z.number().int().min(0).max(10_000) })).max(31),
  integrations: z.array(z.object({
    name: z.enum(["Gmail", "Calendar", "Excel"]), provider: z.enum(["gmail", "calendar", "excel"]).optional(),
    state: z.enum(["connected", "attention", "available"]), detail: text(500), connectUrl: z.string().url().optional(),
  })).max(3),
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
  }).optional(),
});

export function parseDashboardSnapshot(input: unknown) {
  return DashboardSnapshotSchema.parse(input);
}
