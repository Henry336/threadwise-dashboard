"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { formatClock } from "@/lib/study-timetable";

export type StudyChoice = { value: string; label: string; detail?: string };

export function StudyChoicePicker({ label, value, placeholder = "Choose one", options, disabled = false, searchable = false, allowEmpty = true, onChange }: {
  label: string;
  value: string;
  placeholder?: string;
  options: StudyChoice[];
  disabled?: boolean;
  searchable?: boolean;
  allowEmpty?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);
  const visible = options.filter((option) => !query || `${option.label} ${option.detail ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const optionCount = visible.length + (allowEmpty ? 1 : 0);
  const selectedIndex = Math.max(0, visible.findIndex((option) => option.value === value) + (allowEmpty ? 1 : 0));
  const close = (returnFocus = false) => {
    setOpen(false);
    setQuery("");
    if (returnFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const focusOption = (index: number) => window.requestAnimationFrame(() => optionRefs.current[index]?.focus());
  const openAt = (index: number) => {
    setOpen(true);
    focusOption(Math.max(0, Math.min(index, optionCount - 1)));
  };
  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    openAt(event.key === "ArrowDown" ? selectedIndex : optionCount - 1);
  };
  const onListboxKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const lastIndex = optionCount - 1;
    const currentIndex = optionRefs.current.findIndex((entry) => entry === document.activeElement);
    if (event.key === "Home") focusOption(0);
    else if (event.key === "End") focusOption(lastIndex);
    else if (event.key === "ArrowDown") focusOption(currentIndex < 0 || currentIndex >= lastIndex ? 0 : currentIndex + 1);
    else focusOption(currentIndex <= 0 ? lastIndex : currentIndex - 1);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return <div className="study-choice-field" ref={rootRef}>
    <span>{label}</span>
    <button ref={triggerRef} type="button" className="study-choice-trigger" disabled={disabled} aria-label={`${label}: ${selected?.label ?? placeholder}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listboxId : undefined} onClick={() => open ? close() : openAt(selectedIndex)} onKeyDown={onTriggerKeyDown}>
      <span><b>{selected?.label ?? placeholder}</b>{selected?.detail && <small>{selected.detail}</small>}</span><ChevronDown size={16} />
    </button>
    {open && <div id={listboxId} className="study-choice-popover" role="listbox" aria-label={label} onKeyDown={onListboxKeyDown}>
      {searchable && <label><Search size={15} /><span className="sr-only">Search {label.toLowerCase()}</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} /></label>}
      <div>
        {allowEmpty && <button ref={(element) => { optionRefs.current[0] = element; }} type="button" role="option" aria-selected={!value} onClick={() => { onChange(""); close(true); }}><span><b>{placeholder}</b></span>{!value && <Check size={15} />}</button>}
        {visible.map((option, index) => <button ref={(element) => { optionRefs.current[index + (allowEmpty ? 1 : 0)] = element; }} type="button" key={option.value} role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); close(true); }}><span><b>{option.label}</b>{option.detail && <small>{option.detail}</small>}</span>{option.value === value && <Check size={15} />}</button>)}
        {!visible.length && <p>No matching options.</p>}
      </div>
    </div>}
  </div>;
}

export function StudyTimePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const options = useMemo(() => {
    const values = Array.from({ length: 96 }, (_, index) => {
      const minutes = index * 15;
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    });
    if (value && !values.includes(value)) values.push(value);
    return values.sort().map((time) => ({ value: time, label: formatClock(time) }));
  }, [value]);

  return <StudyChoicePicker label={label} value={value} options={options} searchable allowEmpty={false} onChange={onChange} />;
}
