"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight,
  Clock3, Focus, MapPin, Pencil, Plus, Trash2, X,
} from "lucide-react";
import type { StudyItem, StudySnapshot } from "@/lib/study-types";
import {
  academicWeekForDate, addDays, buildTimetableDays, clockMinutes, currentMinutesInZone, dateKeyInZone,
  formatClock, formatWeekRange, initialTimetableWeek, startOfWeek,
} from "@/lib/study-timetable";

type ScheduleBlock = StudySnapshot["scheduleBlocks"][number];

type Props = {
  study: StudySnapshot;
  busy: boolean;
  onAddBlock: (body: unknown) => Promise<unknown>;
  onUpdateBlock: (id: string, body: unknown) => Promise<unknown>;
  onDeleteBlock: (id: string) => Promise<unknown>;
  onEditItem: (item: StudyItem) => void;
  onFocusItem: (item: StudyItem) => void;
};

export function StudyTimetable({ study, busy, onAddBlock, onUpdateBlock, onDeleteBlock, onEditItem, onFocusItem }: Props) {
  const [weekStart, setWeekStart] = useState(() => initialTimetableWeek(study));
  const [selectedDay, setSelectedDay] = useState(() => {
    const week = initialTimetableWeek(study);
    const today = dateKeyInZone(study.generatedAt, study.workspace.timezone);
    return startOfWeek(today) === week ? today : week;
  });
  const [mode, setMode] = useState<"week" | "day">("week");
  const [editor, setEditor] = useState<{ block?: ScheduleBlock; day: number } | null>(null);
  const days = useMemo(() => buildTimetableDays(study, weekStart), [study, weekStart]);
  const activeDay = days.find((day) => day.key === selectedDay) ?? days[0]!;
  const academicWeek = academicWeekForDate(weekStart, study.workspace.semesterStartDate);
  const blockCount = days.reduce((sum, day) => sum + day.blocks.length, 0);
  const dueCount = days.reduce((sum, day) => sum + day.dueItems.length, 0);
  const plannedMinutes = days.reduce((sum, day) => sum + day.plannedMinutes, 0);
  const todayKey = dateKeyInZone(study.generatedAt, study.workspace.timezone);
  const blocksInView = days.flatMap((day) => day.blocks.map((block) => ({ day, block })));
  const firstBlock = blocksInView.find(({ day, block }) => day.key > todayKey || (day.key === todayKey && clockMinutes(block.endTime) >= currentMinutesInZone(study.generatedAt, study.workspace.timezone))) ?? blocksInView[0];
  const allClockMinutes = days.flatMap((day) => day.blocks.flatMap((block) => [clockMinutes(block.startTime), clockMinutes(block.endTime)]));
  const gridStart = Math.max(6 * 60, Math.floor(Math.min(8 * 60, ...allClockMinutes) / 60) * 60);
  const gridEnd = Math.min(24 * 60, Math.ceil(Math.max(22 * 60, ...allClockMinutes) / 60) * 60);
  const hours = Array.from({ length: (gridEnd - gridStart) / 60 + 1 }, (_, index) => gridStart / 60 + index);
  const nowMinutes = currentMinutesInZone(study.generatedAt, study.workspace.timezone);

  const moveWeek = (amount: number) => {
    const next = addDays(weekStart, amount * 7);
    setWeekStart(next);
    setSelectedDay(addDays(next, Math.max(0, Math.min(6, activeDay.weekday - 1))));
  };
  const goToday = () => {
    const today = dateKeyInZone(study.generatedAt, study.workspace.timezone);
    const next = startOfWeek(today);
    setWeekStart(next);
    setSelectedDay(today);
  };

  return <section className="study-page study-timetable-page">
    <header className="study-timetable-head">
      <div><span>Timetable</span><h1>Your week, in motion.</h1><p>Module timings and planned work update from the same Study workspace.</p></div>
      <button className="study-primary" onClick={() => setEditor({ day: activeDay.weekday })}><Plus size={16} /> Add block</button>
    </header>

    <div className="study-timetable-summary" aria-label="Timetable summary">
      <div><CalendarDays size={18} /><span><b>{blockCount}</b><small>blocks this week</small></span></div>
      <div><Check size={18} /><span><b>{dueCount}</b><small>work items due</small></span></div>
      <div><Clock3 size={18} /><span><b>{plannedMinutes ? `${plannedMinutes} min` : "—"}</b><small>planned workload</small></span></div>
      <div className="study-timetable-next"><span>{academicWeek === 0 ? "First block" : "Up next"}</span>{firstBlock ? <><b>{firstBlock.block.module?.code ?? firstBlock.block.label}</b><small>{firstBlock.day.shortLabel} · {formatClock(firstBlock.block.startTime)}</small></> : <><b>Open week</b><small>Add a class or study block</small></>}</div>
    </div>

    <div className="study-timetable-toolbar">
      <div className="study-week-stepper"><button onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={18} /></button><button onClick={goToday}>Today</button><button onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={18} /></button></div>
      <div className="study-week-title"><b>{academicWeek === 0 ? "Pre-semester" : academicWeek ? `Week ${academicWeek}` : "Study week"}</b><span>{formatWeekRange(weekStart)}</span></div>
      <div className="study-view-toggle" aria-label="Timetable layout"><button className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>Week</button><button className={mode === "day" ? "active" : ""} onClick={() => setMode("day")}>Day</button></div>
    </div>

    <div className="study-day-strip" role="tablist" aria-label="Choose a day">
      {days.map((day) => <button key={day.key} role="tab" aria-selected={activeDay.key === day.key} className={`${activeDay.key === day.key ? "active" : ""} ${day.isToday ? "today" : ""}`} onClick={() => setSelectedDay(day.key)}><span>{day.shortLabel}</span><b>{day.dateLabel.split(" ")[0]}</b>{(day.blocks.length > 0 || day.dueItems.length > 0) && <i aria-hidden="true" />}</button>)}
    </div>

    <div className={`study-timetable-surface ${mode === "day" ? "day-mode" : "week-mode"}`}>
      <section className="study-due-lane" aria-label="Work due this week">
        <header><span>Work due</span><small>Deadlines, not class time</small></header>
        <div>{days.map((day) => <div key={day.key}>{day.dueItems.slice(0, 2).map((item) => <button key={item.id} style={{ "--module-color": item.module.color ?? "#168b83" } as CSSProperties} onClick={() => onEditItem(item)}><span>{item.module.code}</span><b>{item.title}</b></button>)}{day.dueItems.length > 2 && <button className="more" onClick={() => { setSelectedDay(day.key); setMode("day"); }}>+{day.dueItems.length - 2} more</button>}</div>)}</div>
      </section>

      <section className="study-week-grid" aria-label={`Timetable for ${formatWeekRange(weekStart)}`} style={{ "--grid-height": `${(gridEnd - gridStart) * 1.05}px` } as CSSProperties}>
        <div className="study-time-rail">{hours.map((hour) => <span key={hour} style={{ top: `${(hour * 60 - gridStart) * 1.05}px` }}>{formatClock(`${String(hour).padStart(2, "0")}:00`)}</span>)}</div>
        <div className="study-week-columns">
          {days.map((day) => <div className={`study-week-day ${day.isToday ? "today" : ""}`} key={day.key}>
            {hours.map((hour) => <i key={hour} style={{ top: `${(hour * 60 - gridStart) * 1.05}px` }} />)}
            {day.isToday && nowMinutes >= gridStart && nowMinutes <= gridEnd && <span className="study-now-line" style={{ top: `${(nowMinutes - gridStart) * 1.05}px` }}><b>Now</b></span>}
            {day.blocks.map((block) => <button key={block.id} className="study-schedule-block" style={{
              "--block-top": `${(clockMinutes(block.startTime) - gridStart) * 1.05}px`,
              "--block-height": `${Math.max(42, (clockMinutes(block.endTime) - clockMinutes(block.startTime)) * 1.05 - 4)}px`,
              "--module-color": study.modules.find((module) => module.id === block.moduleId)?.color ?? "#168b83",
            } as CSSProperties} onClick={() => setEditor({ block, day: block.dayOfWeek })}>
              <span>{block.module?.code ?? block.blockType}</span><b>{block.label}</b><small>{formatClock(block.startTime)}–{formatClock(block.endTime)}</small>{block.venueName && <em><MapPin size={11} />{block.venueName}</em>}
            </button>)}
          </div>)}
        </div>
      </section>

      <section className="study-day-agenda" aria-label={`${activeDay.longLabel} agenda`}>
        <header><div><span>{activeDay.longLabel}</span><h2>{activeDay.dateLabel}</h2></div><button onClick={() => setEditor({ day: activeDay.weekday })}><Plus size={15} /> Add block</button></header>
        {activeDay.blocks.length === 0 && activeDay.dueItems.length === 0 ? <div className="study-agenda-empty"><CalendarDays size={23} /><b>Nothing scheduled.</b><p>Keep the space open or add a study block.</p></div> : <>
          {activeDay.blocks.map((block) => <article className="study-agenda-block" key={block.id} style={{ "--module-color": study.modules.find((module) => module.id === block.moduleId)?.color ?? "#168b83" } as CSSProperties}>
            <time>{formatClock(block.startTime)}<span>{formatClock(block.endTime)}</span></time><div><span>{block.module?.code ?? block.blockType}</span><h3>{block.label}</h3>{block.venueName && <p><MapPin size={13} /> {block.venueName}</p>}</div><button onClick={() => setEditor({ block, day: block.dayOfWeek })} aria-label={`Edit ${block.label}`}><Pencil size={16} /></button>
          </article>)}
          {activeDay.dueItems.length > 0 && <div className="study-agenda-due"><span>Work due</span>{activeDay.dueItems.map((item) => <article key={item.id} style={{ "--module-color": item.module.color ?? "#168b83" } as CSSProperties}><button onClick={() => onEditItem(item)}><small>{item.module.code} · {item.plannedMinutes ? `${item.plannedMinutes} min` : "unestimated"}</small><b>{item.title}</b></button><button onClick={() => onFocusItem(item)} aria-label={`Focus on ${item.title}`}><Focus size={16} /></button></article>)}</div>}
        </>}
      </section>
    </div>

    {editor && <TimetableEditor key={editor.block?.id ?? `new-${editor.day}`} study={study} block={editor.block} defaultDay={editor.day} busy={busy} onClose={() => setEditor(null)} onDelete={async (block) => {
      if (!window.confirm(`Remove ${block.label}?`)) return;
      const saved = await onDeleteBlock(block.id);
      if (saved !== undefined) setEditor(null);
    }} onSave={async (body) => {
      const saved = editor.block ? await onUpdateBlock(editor.block.id, body) : await onAddBlock(body);
      if (saved !== undefined) setEditor(null);
    }} />}
  </section>;
}

function TimetableEditor({ study, block, defaultDay, busy, onClose, onSave, onDelete }: {
  study: StudySnapshot;
  block?: ScheduleBlock;
  defaultDay: number;
  busy: boolean;
  onClose: () => void;
  onSave: (body: unknown) => Promise<void>;
  onDelete: (block: ScheduleBlock) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [moduleId, setModuleId] = useState(block?.moduleId ?? "");
  const [day, setDay] = useState(block?.dayOfWeek ?? defaultDay);
  const [start, setStart] = useState(block?.startTime ?? "10:00");
  const [end, setEnd] = useState(block?.endTime ?? "11:00");
  const [label, setLabel] = useState(block?.label ?? "");
  const [blockType, setBlockType] = useState(block?.blockType ?? "class");
  const [startWeek, setStartWeek] = useState(block?.startWeek?.toString() ?? "");
  const [endWeek, setEndWeek] = useState(block?.endWeek?.toString() ?? "");
  const [destination, setDestination] = useState(block?.venueName ?? "");
  const [originId, setOriginId] = useState(block?.defaultOriginId ?? "");
  const [buffer, setBuffer] = useState(block?.travelBufferMinutes ?? 15);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("input, select, button")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("keydown", close); previous?.focus(); };
  }, [busy, onClose]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave({
      moduleId: moduleId || null,
      dayOfWeek: day,
      startTime: start,
      endTime: end,
      label,
      blockType,
      startWeek: startWeek ? Number(startWeek) : null,
      endWeek: endWeek ? Number(endWeek) : null,
      destination: destination.trim() || (block ? null : undefined),
      defaultOriginId: originId || null,
      travelBufferMinutes: buffer,
    });
  };

  return <div className="study-timetable-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={dialogRef} className="study-timetable-dialog" role="dialog" aria-modal="true" aria-labelledby="timetable-editor-title" tabIndex={-1}>
      <header><div><span>{block ? "Edit block" : "New block"}</span><h2 id="timetable-editor-title">{block ? block.label : "Add to the timetable"}</h2></div><button onClick={onClose} disabled={busy} aria-label="Close editor"><X size={20} /></button></header>
      <form onSubmit={submit}>
        <label className="wide">Label<input autoFocus required maxLength={200} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="CS2100 lecture" /></label>
        <label>Module<select value={moduleId} onChange={(event) => setModuleId(event.target.value)}><option value="">No module</option>{study.modules.map((module) => <option key={module.id} value={module.id}>{module.code} · {module.name}</option>)}</select></label>
        <label>Type<select value={blockType} onChange={(event) => setBlockType(event.target.value)}><option value="class">Class</option><option value="lecture">Lecture</option><option value="tutorial">Tutorial</option><option value="lab">Lab</option><option value="study">Study block</option><option value="other">Other</option></select></label>
        <label>Day<select value={day} onChange={(event) => setDay(Number(event.target.value))}>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
        <label>Starts<input required type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label>Ends<input required type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        <div className="study-timetable-weeks"><label>From week<input type="number" min={1} max={80} value={startWeek} onChange={(event) => setStartWeek(event.target.value)} placeholder="1" /></label><span>to</span><label>Until week<input type="number" min={1} max={80} value={endWeek} onChange={(event) => setEndWeek(event.target.value)} placeholder="13" /></label></div>
        <div className="study-timetable-travel wide"><span><MapPin size={16} /> Leave-time reminder</span><label>Destination<input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="COM3" /></label><label>Usual origin<select value={originId} onChange={(event) => setOriginId(event.target.value)}><option value="">Current/default origin</option>{study.origins.map((origin) => <option key={origin.id} value={origin.id}>{origin.name}</option>)}</select></label><label>Travel buffer<input type="number" min={0} max={90} value={buffer} onChange={(event) => setBuffer(Number(event.target.value))} /></label></div>
        <footer>{block ? <button type="button" className="study-danger" disabled={busy} onClick={() => void onDelete(block)}><Trash2 size={15} /> Remove</button> : <span />}<div><button type="button" className="study-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="study-primary" disabled={busy}><Check size={16} /> {busy ? "Saving…" : "Save block"}</button></div></footer>
      </form>
    </section>
  </div>;
}
