/** Helpers behind `IntegerInput` (`src/components/integer-input.tsx`). */
/** Keeps only digits and drops leading zeros while the user types, so the field never holds text like "-" or "007". */
export function normalizeIntegerDraft(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/^0+(?=\d)/, "");
}

/** Fits a number into [min, max] as a whole number. Non-numbers become `min`. */
export function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
