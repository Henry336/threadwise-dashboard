"use client";

/**
 * Text box for whole numbers in a min/max range, used for settings such as reminder minutes
 * and timetable durations. It replaced native `type="number"` inputs (commit e07a1db), which
 * made partial or empty values awkward to type.
 */
import { useState, type InputHTMLAttributes } from "react";
import { clampInteger, normalizeIntegerDraft } from "@/lib/numeric-input";

type IntegerInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "inputMode" | "max" | "min" | "onChange" | "type" | "value"> & {
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
};

/**
 * Integer field that keeps a local text draft while focused. Typing strips non-digits and
 * reports each valid number at once; an empty box is allowed mid-edit.
 * On blur the value is clamped into range, or restored if left empty.
 */
export function IntegerInput({ value, min, max, onValueChange, onBlur, ...props }: IntegerInputProps) {
  const [draft, setDraft] = useState(String(clampInteger(value, min, max)));
  const [editing, setEditing] = useState(false);

  /** Ends editing: clamp the draft, show it, and report it only if it changed. */
  const commit = () => {
    const next = draft === "" ? clampInteger(value, min, max) : clampInteger(Number(draft), min, max);
    setDraft(String(next));
    setEditing(false);
    if (next !== value) onValueChange(next);
  };

  return <input
    {...props}
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    minLength={1}
    value={editing ? draft : String(clampInteger(value, min, max))}
    onFocus={() => {
      setDraft(String(clampInteger(value, min, max)));
      setEditing(true);
    }}
    onChange={(event) => {
      const next = normalizeIntegerDraft(event.target.value);
      setEditing(true);
      setDraft(next);
      if (next !== "") onValueChange(Number(next));
    }}
    onBlur={(event) => {
      commit();
      onBlur?.(event);
    }}
  />;
}
