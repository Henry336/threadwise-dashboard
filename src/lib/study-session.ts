/** Shared vocabulary and helpers for Study Deep Work sessions (focus structures, techniques, timers). */
import type { StudySession } from "./study-types";

const METHOD_SEPARATOR = " · ";

/** The focus rhythms a session can use. The id is stored on the session; the label and note are display only. */
export const FOCUS_STRUCTURES = [
  { id: "pomodoro", label: "Pomodoro", note: "25 min focus · 5 min break" },
  { id: "fifty-ten", label: "50 / 10", note: "50 min focus · 10 min break" },
  { id: "uninterrupted", label: "Uninterrupted", note: "No timed breaks" },
  { id: "custom", label: "Custom", note: "Use your own rhythm" },
] as const;

export type FocusStructureId = (typeof FOCUS_STRUCTURES)[number]["id"];

/** Techniques the session form offers as chips. */
export const STUDY_TECHNIQUES = [
  "Retrieval practice",
  "Practice problems",
  "Spaced review",
  "Interleaving",
  "Self-explanation",
  "Mistake review",
  "Timed practice",
] as const;

/** Display label for a stored focus structure id. Unknown ids show as-is. */
export function focusStructureLabel(value?: string | null) {
  return FOCUS_STRUCTURES.find((entry) => entry.id === value)?.label ?? value ?? "Uninterrupted";
}

/** The one-line method text, for example "Pomodoro · Retrieval practice", with duplicates removed. */
export function sessionMethodSummary(
  focusStructure?: string | null,
  techniques: string[] = [],
  customMethod?: string | null,
) {
  return [focusStructureLabel(focusStructure), ...techniques, customMethod?.trim()]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    .join(METHOD_SEPARATOR);
}

/**
 * Recovers the free-text part of a saved method by removing the parts the summary generated, so editing
 * a session does not repeat the focus structure and techniques inside the custom field.
 */
export function sessionCustomMethod(session?: Pick<StudySession, "method" | "focusStructure" | "techniques"> | null) {
  if (!session?.method) return "";
  const generatedParts = new Set([
    focusStructureLabel(session.focusStructure),
    ...(session.techniques ?? []),
  ]);
  return session.method
    .split(METHOD_SEPARATOR)
    .filter((part) => part.trim() && !generatedParts.has(part.trim()))
    .join(METHOD_SEPARATOR);
}

/** Ids of the resources linked to a session. */
export function sessionResourceIds(session?: StudySession | null) {
  return session?.resources.map(({ resource }) => resource.id) ?? [];
}

/** Whole seconds since `startedAt`, never negative (guards against small clock differences). */
export function sessionElapsedSeconds(startedAt: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1_000));
}
