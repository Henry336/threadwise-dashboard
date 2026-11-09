/**
 * Pure timetable logic for `study-timetable.tsx`: which blocks fall on which day, overlap lanes and
 * conflicts, sizes, and the panel state machine. Kept free of React so it can be unit tested.
 */
import type { StudySnapshot } from "@/lib/study-types";

/** One column of the week view: its blocks, the work due that day, and display labels. */
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

export type TimetableBlockDensity = "narrow" | "compact" | "full";

/** The timetable block form's values before they become an API payload. */
export type TimetableBlockDraft = {
  moduleId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string;
  blockType: string;
  customTypeLabel: string;
  recurrenceMode: "once" | "weekly";
  recurrenceStartDate: string;
  recurrenceEndDate: string;
  destination: string;
  destinationPlaceId: string | null;
  defaultOriginId: string;
  travelBufferMinutes: number;
};

/** What the side panel shows. A block opens read-only details first; editing is a second step. */
export type TimetablePanelState =
  | { mode: "closed" }
  | { mode: "details"; blockId: string; occurrenceDate: string }
  | { mode: "edit"; blockId: string; occurrenceDate: string }
  | { mode: "create"; day: number; occurrenceDate: string };

export type TimetablePanelAction =
  | { type: "open-details"; blockId: string; occurrenceDate: string }
  | { type: "edit" }
  | { type: "create"; day: number; occurrenceDate: string }
  | { type: "close" };

/** Panel transitions. "edit" only works from details, so the form cannot open without a selected block. */
export function timetablePanelReducer(state: TimetablePanelState, action: TimetablePanelAction): TimetablePanelState {
  if (action.type === "open-details") return { mode: "details", blockId: action.blockId, occurrenceDate: action.occurrenceDate };
  if (action.type === "create") return { mode: "create", day: action.day, occurrenceDate: action.occurrenceDate };
  if (action.type === "edit" && state.mode === "details") return { mode: "edit", blockId: state.blockId, occurrenceDate: state.occurrenceDate };
  if (action.type === "close") return { mode: "closed" };
  return state;
}

/** How much text a block has room for at a given pixel width. */
export function timetableBlockDensity(width: number): TimetableBlockDensity {
  if (width < 68) return "narrow";
  if (width < 132) return "compact";
  return "full";
}

/** Pixel width of a block in the horizontal layout, minus the gap between blocks. */
export function timetableHorizontalBlockWidth(startTime: string, endTime: string, scale: number, gap = 6): number {
  const bounds = timetableBlockBounds(startTime, endTime);
  return Math.max(1, (bounds.end - bounds.start) * scale - gap);
}

/**
 * Builds the create/update body for a block. Empty optional fields are left out when creating, but sent
 * as null when editing so the backend clears them. Sending null on create used to fail validation.
 */
export function timetableBlockPayload(draft: TimetableBlockDraft, editing: boolean): Record<string, unknown> {
  const destination = draft.destination.trim();
  const payload: Record<string, unknown> = {
    moduleId: draft.moduleId || null,
    dayOfWeek: draft.dayOfWeek,
    startTime: draft.startTime,
    endTime: draft.endTime,
    label: draft.label,
    blockType: draft.blockType,
    recurrenceStartDate: draft.recurrenceStartDate,
    recurrenceEndDate: draft.recurrenceMode === "once" ? draft.recurrenceStartDate : draft.recurrenceEndDate || null,
    startWeek: null,
    endWeek: null,
    defaultOriginId: draft.defaultOriginId || null,
    travelBufferMinutes: draft.travelBufferMinutes,
  };
  if (draft.blockType === "other") payload.customTypeLabel = draft.customTypeLabel.trim();
  else if (editing) payload.customTypeLabel = null;
  if (destination) payload.destination = destination;
  else if (editing) payload.destination = null;
  if (draft.destinationPlaceId) payload.destinationPlaceId = draft.destinationPlaceId;
  else if (editing) payload.destinationPlaceId = null;
  return payload;
}

/**
 * Assigns overlapping blocks to side-by-side lanes. Lane count is worked out per group of overlapping
 * blocks, so one busy morning does not make every other block on that day narrow.
 */
export function timetableBlockLanes<T extends { id: string; startTime: string; endTime: string }>(blocks: T[]): {
  laneCount: number;
  lanes: Map<string, number>;
  groupLaneCounts: Map<string, number>;
} {
  const lanes = new Map<string, number>();
  const groupLaneCounts = new Map<string, number>();
  const ordered = [...blocks]
    .map((block) => ({ block, bounds: timetableBlockBounds(block.startTime, block.endTime) }))
    .sort((left, right) => left.bounds.start - right.bounds.start || left.bounds.end - right.bounds.end);
  let maximumLaneCount = 1;
  let group: typeof ordered = [];
  let groupEnd = -1;

  const placeGroup = () => {
    if (!group.length) return;
    const laneEnds: number[] = [];
    for (const entry of group) {
      let lane = laneEnds.findIndex((end) => end <= entry.bounds.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = entry.bounds.end;
      lanes.set(entry.block.id, lane);
    }
    const groupLaneCount = Math.max(1, laneEnds.length);
    maximumLaneCount = Math.max(maximumLaneCount, groupLaneCount);
    for (const entry of group) groupLaneCounts.set(entry.block.id, groupLaneCount);
  };

  for (const entry of ordered) {
    if (group.length && entry.bounds.start >= groupEnd) {
      placeGroup();
      group = [];
      groupEnd = -1;
    }
    group.push(entry);
    groupEnd = Math.max(groupEnd, entry.bounds.end);
  }
  placeGroup();

  return { laneCount: maximumLaneCount, lanes, groupLaneCounts };
}

/** For each block, the other blocks it overlaps. Overlaps are allowed but flagged with a warning. */
export function timetableBlockConflicts<T extends { id: string; startTime: string; endTime: string }>(blocks: T[]): Map<string, T[]> {
  const conflicts = new Map<string, T[]>();
  for (let leftIndex = 0; leftIndex < blocks.length; leftIndex += 1) {
    const left = blocks[leftIndex]!;
    const leftBounds = timetableBlockBounds(left.startTime, left.endTime);
    for (let rightIndex = leftIndex + 1; rightIndex < blocks.length; rightIndex += 1) {
      const right = blocks[rightIndex]!;
      const rightBounds = timetableBlockBounds(right.startTime, right.endTime);
      if (leftBounds.start >= rightBounds.end || rightBounds.start >= leftBounds.end) continue;
      conflicts.set(left.id, [...(conflicts.get(left.id) ?? []), right]);
      conflicts.set(right.id, [...(conflicts.get(right.id) ?? []), left]);
    }
  }
  return conflicts;
}

/** Start and end as minutes in the day, clamped to 0..1440. An end at or before the start is read as running to midnight. */
export function timetableBlockBounds(startTime: string, endTime: string): { start: number; end: number } {
  const start = Math.max(FULL_DAY_START_MINUTE, Math.min(FULL_DAY_END_MINUTE, clockMinutes(startTime)));
  const parsedEnd = Math.max(FULL_DAY_START_MINUTE, Math.min(FULL_DAY_END_MINUTE, clockMinutes(endTime)));
  return { start, end: parsedEnd <= start ? FULL_DAY_END_MINUTE : parsedEnd };
}

/** Where to scroll the timetable on open: now when viewing the current week, otherwise the earliest block, otherwise 8 AM. */
export function preferredTimetableMinute(startTimes: string[], nowMinute: number, showingCurrentPeriod: boolean): number {
  if (showingCurrentPeriod) return Math.max(0, Math.min(FULL_DAY_END_MINUTE - 1, nowMinute));
  const starts = startTimes.map(clockMinutes).filter((minute) => Number.isFinite(minute));
  return starts.length ? Math.min(...starts) : 8 * 60;
}

/** Pixel offset of the "now" line, kept inside the visible area. */
export function timetableIndicatorOffset(minute: number, scale: number, extent: number, edgePadding = 8): number {
  const raw = Math.max(FULL_DAY_START_MINUTE, Math.min(FULL_DAY_END_MINUTE, minute)) * scale;
  return Math.max(edgePadding, Math.min(Math.max(edgePadding, extent - edgePadding), raw));
}

/** The first few due items for a day plus how many more there are. */
export function timetableDuePreview<T>(items: T[], limit = 2): { visible: T[]; remaining: number } {
  const safeLimit = Math.max(0, Math.trunc(limit));
  return { visible: items.slice(0, safeLimit), remaining: Math.max(0, items.length - safeLimit) };
}

/** The YYYY-MM-DD day an instant falls on in `timezone`. */
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

/** Adds days to a YYYY-MM-DD key. Uses noon UTC so DST changes cannot shift the date. */
export function addDays(key: string, amount: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** The Monday of the week that contains `key`. */
export function startOfWeek(key: string): string {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(key, mondayOffset);
}

/** The week the timetable opens on: this week, or the semester's first week if it has not started yet. */
export function initialTimetableWeek(study: StudySnapshot): string {
  const today = dateKeyInZone(study.generatedAt, study.workspace.timezone);
  const semester = study.workspace.semesterStartDate?.slice(0, 10);
  return startOfWeek(semester && today < semester ? semester : today);
}

/** Academic week number for a date (Week 1 starts on the semester's Monday). 0 before the semester, null without a start date. */
export function academicWeekForDate(key: string, semesterStart?: string | null): number | null {
  if (!semesterStart) return null;
  const semesterMonday = startOfWeek(semesterStart.slice(0, 10));
  if (key < semesterMonday) return 0;
  const days = Math.round((Date.parse(`${key}T12:00:00Z`) - Date.parse(`${semesterMonday}T12:00:00Z`)) / 86_400_000);
  return Math.floor(days / 7) + 1;
}

/**
 * The seven days of a week with their blocks and due items. Blocks with calendar dates use those dates and
 * excluded dates; older blocks use academic week ranges and excluded weeks. Done, skipped and
 * unconfirmed-deadline items are left out of the due list.
 */
export function buildTimetableDays(study: StudySnapshot, weekStart: string): TimetableDay[] {
  const today = dateKeyInZone(study.generatedAt, study.workspace.timezone);
  const academicWeek = academicWeekForDate(weekStart, study.workspace.semesterStartDate);
  return Array.from({ length: 7 }, (_, index) => {
    const key = addDays(weekStart, index);
    const weekday = index + 1;
    const blocks = study.scheduleBlocks
      .filter((block) => block.active && block.dayOfWeek === weekday)
      .filter((block) => {
        const hasCalendarRecurrence = Boolean(block.recurrenceStartDate || block.recurrenceEndDate || block.excludedDates?.length);
        if (hasCalendarRecurrence) {
          return (!block.recurrenceStartDate || key >= block.recurrenceStartDate.slice(0, 10))
            && (!block.recurrenceEndDate || key <= block.recurrenceEndDate.slice(0, 10))
            && !(block.excludedDates ?? []).some((date) => date.slice(0, 10) === key);
        }
        return academicWeek === null || academicWeek === 0 || (
          (block.startWeek == null || academicWeek >= block.startWeek)
          && (block.endWeek == null || academicWeek <= block.endWeek)
          && !block.excludedWeeks.includes(academicWeek)
        );
      })
      .sort((left, right) => left.startTime.localeCompare(right.startTime));
    const dueItems = study.items
      .filter((item) => item.status !== "SKIPPED" && item.status !== "DONE" && item.dueAt && item.deadlineStatus !== "NEEDS_CONFIRMATION")
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

/** A "1 Sep – 7 Sep 2026" label for the week header. */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(`${addDays(weekStart, 6)}T12:00:00Z`);
  const startLabel = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: "UTC" }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(end);
  return `${startLabel} – ${endLabel}`;
}

/** Minutes since midnight for an "HH:mm" string. */
export function clockMinutes(clock: string): number {
  const [hour = "0", minute = "0"] = clock.split(":");
  return Number(hour) * 60 + Number(minute);
}

/** "HH:mm" as a 12-hour time, for example "2:30 PM". */
export function formatClock(clock: string): string {
  const total = clockMinutes(clock);
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

/** Minutes since midnight for an instant in `timezone`. */
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
