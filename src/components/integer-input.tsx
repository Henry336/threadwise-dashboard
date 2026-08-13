"use client";

import { useState, type InputHTMLAttributes } from "react";
import { clampInteger, normalizeIntegerDraft } from "@/lib/numeric-input";

type IntegerInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "inputMode" | "max" | "min" | "onChange" | "type" | "value"> & {
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
};

export function IntegerInput({ value, min, max, onValueChange, onBlur, ...props }: IntegerInputProps) {
  const [draft, setDraft] = useState(String(clampInteger(value, min, max)));
  const [editing, setEditing] = useState(false);

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
