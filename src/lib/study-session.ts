import type { StudySession } from "./study-types";

const METHOD_SEPARATOR = " · ";

export const FOCUS_STRUCTURES = [
  { id: "pomodoro", label: "Pomodoro", note: "25 min focus · 5 min break" },
  { id: "fifty-ten", label: "50 / 10", note: "50 min focus · 10 min break" },
  { id: "uninterrupted", label: "Uninterrupted", note: "No timed breaks" },
  { id: "custom", label: "Custom", note: "Use your own rhythm" },
] as const;

export type FocusStructureId = (typeof FOCUS_STRUCTURES)[number]["id"];

export const STUDY_TECHNIQUES = [
  "Retrieval practice",
  "Practice problems",
  "Spaced review",
  "Interleaving",
  "Self-explanation",
  "Mistake review",
  "Timed practice",
] as const;

export function focusStructureLabel(value?: string | null) {
  return FOCUS_STRUCTURES.find((entry) => entry.id === value)?.label ?? value ?? "Uninterrupted";
}

export function sessionMethodSummary(
  focusStructure?: string | null,
  techniques: string[] = [],
  customMethod?: string | null,
) {
  return [focusStructureLabel(focusStructure), ...techniques, customMethod?.trim()]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    .join(METHOD_SEPARATOR);
}

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

export function sessionResourceIds(session?: StudySession | null) {
  return session?.resources.map(({ resource }) => resource.id) ?? [];
}

export function sessionElapsedSeconds(startedAt: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1_000));
}
