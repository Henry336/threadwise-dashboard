import type { StudySnapshot } from "@/lib/study-types";

export type TimetableDay = {
  key: string;
  weekday: number;
  shortLabel: string;
  longLabel: string;
  dateLabel: string;
  isToday: boolean;
  blocks: StudySnapshot["scheduleBlocks"];
  dueItems: StudySnapshot["items"];
  plannedMinutes: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const FULL_DAY_START_MINUTE = 0;
export const FULL_DAY_END_MINUTE = 24 * 60;

export function timetableBlockBounds(startTime: string, endTime: string): { start: number; end: number } {
  const start = Math.max(FULL_DAY_START_MINUTE, Math.min(FULL_DAY_END_MINUTE, clockMinutes(startTime)));
  const parsedEnd = Math.max(FULL_DAY_START_MINUTE, Math.min(FULL_DAY_END_MINUTE, clockMinutes(endTime)));
  return { start, end: parsedEnd <= start ? FULL_DAY_END_MINUTE : parsedEnd };
}

export function preferredTimetableMinute(startTimes: string[], nowMinute: number, showingCurrentPeriod: boolean): number {
  if (showingCurrentPeriod) return Math.max(0, Math.min(FULL_DAY_END_MINUTE - 1, nowMinute));
  const starts = startTimes.map(clockMinutes).filter((minute) => Number.isFinite(minute));
  return starts.length ? Math.min(...starts) : 8 * 60;
}

export function timetableIndicatorOffset(minute: number, scale: number, extent: number, edgePadding = 8): number {
  const raw = Math.max(FULL_DAY_START_MINUTE, Math.min(FULL_DAY_END_MINUTE, minute)) * scale;
  return Math.max(edgePadding, Math.min(Math.max(edgePadding, extent - edgePadding), raw));
}

export function timetableDuePreview<T>(items: T[], limit = 2): { visible: T[]; remaining: number } {
  const safeLimit = Math.max(0, Math.trunc(limit));
  return { visible: items.slice(0, safeLimit), remaining: Math.max(0, items.length - safeLimit) };
}

export function dateKeyInZone(value: string | Date, timezone: string): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDays(key: string, amount: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(key: string): string {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(key, mondayOffset);
}

export function initialTimetableWeek(study: StudySnapshot): string {
  const today = dateKeyInZone(study.generatedAt, study.workspace.timezone);
  const semester = study.workspace.semesterStartDate?.slice(0, 10);
  return startOfWeek(semester && today < semester ? semester : today);
}

export function academicWeekForDate(key: string, semesterStart?: string | null): number | null {
  if (!semesterStart) return null;
  const semesterMonday = startOfWeek(semesterStart.slice(0, 10));
  if (key < semesterMonday) return 0;
  const days = Math.round((Date.parse(`${key}T12:00:00Z`) - Date.parse(`${semesterMonday}T12:00:00Z`)) / 86_400_000);
  return Math.floor(days / 7) + 1;
}

export function buildTimetableDays(study: StudySnapshot, weekStart: string): TimetableDay[] {
  const today = dateKeyInZone(study.generatedAt, study.workspace.timezone);
  const academicWeek = academicWeekForDate(weekStart, study.workspace.semesterStartDate);
  return Array.from({ length: 7 }, (_, index) => {
    const key = addDays(weekStart, index);
    const weekday = index + 1;
    const blocks = study.scheduleBlocks
      .filter((block) => block.active && block.dayOfWeek === weekday)
      .filter((block) => academicWeek === null || academicWeek === 0 || (
        (block.startWeek == null || academicWeek >= block.startWeek)
        && (block.endWeek == null || academicWeek <= block.endWeek)
      ))
      .sort((left, right) => left.startTime.localeCompare(right.startTime));
    const dueItems = study.items
      .filter((item) => item.status !== "SKIPPED" && item.status !== "DONE" && item.dueAt)
      .filter((item) => dateKeyInZone(item.dueAt!, study.workspace.timezone) === key)
      .sort((left, right) => String(left.dueAt).localeCompare(String(right.dueAt)));
    const date = new Date(`${key}T12:00:00Z`);
    return {
      key,
      weekday,
      shortLabel: WEEKDAYS[index]!,
      longLabel: new Intl.DateTimeFormat("en-SG", { weekday: "long", timeZone: "UTC" }).format(date),
      dateLabel: new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: "UTC" }).format(date),
      isToday: key === today,
      blocks,
      dueItems,
      plannedMinutes: dueItems.reduce((sum, item) => sum + (item.plannedMinutes ?? 0), 0),
    };
  });
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(`${addDays(weekStart, 6)}T12:00:00Z`);
  const startLabel = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: "UTC" }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(end);
  return `${startLabel} – ${endLabel}`;
}

export function clockMinutes(clock: string): number {
  const [hour = "0", minute = "0"] = clock.split(":");
  return Number(hour) * 60 + Number(minute);
}

export function formatClock(clock: string): string {
  const total = clockMinutes(clock);
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export function currentMinutesInZone(value: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-SG", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((entry) => entry.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((entry) => entry.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}
