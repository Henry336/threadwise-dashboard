"use client";

import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight,
  Clock3, Columns3, Focus, MapPin, Pencil, Plus, Rows3, Trash2, Upload, X,
} from "lucide-react";
import type { StudyItem, StudySnapshot } from "@/lib/study-types";
import {
  academicWeekForDate, addDays, buildTimetableDays, clockMinutes, currentMinutesInZone, dateKeyInZone,
  formatClock, formatWeekRange, FULL_DAY_END_MINUTE, FULL_DAY_START_MINUTE, initialTimetableWeek,
  preferredTimetableMinute, startOfWeek, timetableBlockBounds, timetableBlockDensity, timetableBlockLanes, timetableBlockPayload, timetableDuePreview,
  timetableHorizontalBlockWidth, timetableIndicatorOffset, timetablePanelReducer,
} from "@/lib/study-timetable";
import { parseStudyOrientation, studyTimetablePreferenceKey, type StudyOrientation } from "@/lib/study-preferences";
import { scheduleBlockPlaceId, StudyPlaceCombobox } from "./study-place-combobox";
import { IntegerInput } from "./integer-input";
import { clampInteger, normalizeIntegerDraft } from "@/lib/numeric-input";

type ScheduleBlock = StudySnapshot["scheduleBlocks"][number];
type WeekOrientation = StudyOrientation;

const VERTICAL_MINUTE_SCALE = 1.05;
const HORIZONTAL_MINUTE_SCALE = 1.35;

type Props = {
  study: StudySnapshot;
  busy: boolean;
  onAddBlock: (body: unknown) => Promise<unknown>;
  onUpdateBlock: (id: string, body: unknown) => Promise<unknown>;
  onDeleteBlock: (id: string) => Promise<unknown>;
  onImportNusmods: (url: string) => Promise<unknown>;
  onEditItem: (item: StudyItem) => void;
  onFocusItem: (item: StudyItem) => void;
};

export function StudyTimetable({ study, busy, onAddBlock, onUpdateBlock, onDeleteBlock, onImportNusmods, onEditItem, onFocusItem }: Props) {
  const [weekStart, setWeekStart] = useState(() => initialTimetableWeek(study));
  const [selectedDay, setSelectedDay] = useState(() => {
    const week = initialTimetableWeek(study);
    const today = dateKeyInZone(study.generatedAt, study.workspace.timezone);
    return startOfWeek(today) === week ? today : week;
  });
  const [mode, setMode] = useState<"week" | "day">("week");
  const [orientation, setOrientation] = useState<WeekOrientation>("vertical");
  const orientationKey = studyTimetablePreferenceKey(study.workspace.id);
  const orientationReady = useRef(false);
  const [panel, dispatchPanel] = useReducer(timetablePanelReducer, { mode: "closed" });
  const [importOpen, setImportOpen] = useState(false);
  const verticalScrollRef = useRef<HTMLElement>(null);
  const horizontalScrollRef = useRef<HTMLElement>(null);
  const days = useMemo(() => buildTimetableDays(study, weekStart), [study, weekStart]);
  const activeDay = days.find((day) => day.key === selectedDay) ?? days[0]!;
  const academicWeek = academicWeekForDate(weekStart, study.workspace.semesterStartDate);
  const blockCount = days.reduce((sum, day) => sum + day.blocks.length, 0);
  const dueCount = days.reduce((sum, day) => sum + day.dueItems.length, 0);
  const plannedMinutes = days.reduce((sum, day) => sum + day.plannedMinutes, 0);
  const todayKey = dateKeyInZone(study.generatedAt, study.workspace.timezone);
  const blocksInView = days.flatMap((day) => day.blocks.map((block) => ({ day, block })));
  const firstBlock = blocksInView.find(({ day, block }) => day.key > todayKey || (day.key === todayKey && clockMinutes(block.endTime) >= currentMinutesInZone(study.generatedAt, study.workspace.timezone))) ?? blocksInView[0];
  const gridStart = FULL_DAY_START_MINUTE;
  const gridEnd = FULL_DAY_END_MINUTE;
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const nowMinutes = currentMinutesInZone(study.generatedAt, study.workspace.timezone);
  const showingCurrentWeek = weekStart === startOfWeek(todayKey);
  const preferredMinute = preferredTimetableMinute(blocksInView.map(({ block }) => block.startTime), nowMinutes, showingCurrentWeek);
  const verticalExtent = (gridEnd - gridStart) * VERTICAL_MINUTE_SCALE;
  const verticalNowOffset = timetableIndicatorOffset(nowMinutes - gridStart, VERTICAL_MINUTE_SCALE, verticalExtent);
  const panelBlock = panel.mode === "details" || panel.mode === "edit"
    ? study.scheduleBlocks.find((block) => block.id === panel.blockId)
    : undefined;

  useLayoutEffect(() => {
    const storedOrientation = parseStudyOrientation(window.localStorage.getItem(orientationKey));
    queueMicrotask(() => {
      setOrientation(storedOrientation);
      orientationReady.current = true;
    });
  }, [orientationKey]);

  useEffect(() => {
    if (!orientationReady.current) return;
    window.localStorage.setItem(orientationKey, orientation);
  }, [orientation, orientationKey]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (verticalScrollRef.current) verticalScrollRef.current.scrollTop = Math.max(0, preferredMinute * VERTICAL_MINUTE_SCALE - 150);
      if (horizontalScrollRef.current) horizontalScrollRef.current.scrollLeft = Math.max(0, preferredMinute * HORIZONTAL_MINUTE_SCALE - 180);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode, orientation, preferredMinute, weekStart]);

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
      <div><span>Study Mode</span><h1>Timetable</h1></div>
      <div className="study-timetable-actions">
        <button className="study-secondary" onClick={() => setImportOpen(true)}><Upload size={16} /> Import NUSMods</button>
        <button className="study-primary" onClick={() => dispatchPanel({ type: "create", day: activeDay.weekday })}><Plus size={16} /> Add block</button>
      </div>
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
      <div className="study-layout-controls">
        {mode === "week" && <div className="study-orientation-toggle" aria-label="Week orientation">
          <button type="button" className={orientation === "vertical" ? "active" : ""} aria-pressed={orientation === "vertical"} onClick={() => setOrientation("vertical")}><Columns3 size={14} /> Vertical</button>
          <button type="button" className={orientation === "horizontal" ? "active" : ""} aria-pressed={orientation === "horizontal"} onClick={() => setOrientation("horizontal")}><Rows3 size={14} /> Horizontal</button>
        </div>}
        <div className="study-view-toggle" aria-label="Timetable range"><button className={mode === "week" ? "active" : ""} aria-pressed={mode === "week"} onClick={() => setMode("week")}>Week</button><button className={mode === "day" ? "active" : ""} aria-pressed={mode === "day"} onClick={() => setMode("day")}>Day</button></div>
      </div>
    </div>

    <nav className={`study-day-strip ${mode === "week" && orientation === "horizontal" ? "horizontal-hidden" : ""}`} aria-label="Open a day">
      <span className="study-day-strip-rail" aria-hidden="true"><Clock3 size={14} /></span>
      {days.map((day) => <button
        key={day.key}
        type="button"
        aria-pressed={mode === "day" && activeDay.key === day.key}
        aria-label={`Open ${day.longLabel}, ${day.dateLabel} in day view`}
        className={`${activeDay.key === day.key ? "active" : ""} ${day.isToday ? "today" : ""}`}
        onClick={() => { setSelectedDay(day.key); setMode("day"); }}
      ><span>{day.shortLabel}</span><b>{day.dateLabel.split(" ")[0]}</b>{(day.blocks.length > 0 || day.dueItems.length > 0) && <i aria-hidden="true" />}</button>)}
    </nav>

    <div className={`study-timetable-surface ${mode === "day" ? "day-mode" : "week-mode"} ${orientation}-orientation`}>
      {orientation === "vertical" && <section className="study-due-lane" aria-label="Deadlines this week">
        <header><span>Deadlines</span></header>
        <div>{days.map((day) => <div key={day.key}><span className="study-due-day-label">{day.shortLabel} {day.dateLabel.split(" ")[0]}</span>{day.dueItems.slice(0, 2).map((item) => <button key={item.id} style={{ "--module-color": item.module.color ?? "#168b83" } as CSSProperties} onClick={() => onEditItem(item)}><b>{item.title}</b><span>{item.module.code}</span></button>)}{day.dueItems.length > 2 && <button className="more" onClick={() => { setSelectedDay(day.key); setMode("day"); }}>+{day.dueItems.length - 2} more</button>}</div>)}</div>
      </section>}

      {orientation === "vertical" && <section ref={verticalScrollRef} className="study-week-grid" aria-label={`Vertical timetable for ${formatWeekRange(weekStart)}`} style={{ "--grid-height": `${verticalExtent}px` } as CSSProperties}>
        <div className="study-time-rail">{hours.map((hour) => <span key={hour} style={{ top: `${(hour * 60 - gridStart) * VERTICAL_MINUTE_SCALE}px` }}>{formatClock(`${String(hour).padStart(2, "0")}:00`)}</span>)}{showingCurrentWeek && <strong className="study-now-label" style={{ top: `${verticalNowOffset}px` }}>Now</strong>}</div>
        <div className="study-week-columns">
          {days.map((day) => <div className={`study-week-day ${day.isToday ? "today" : ""}`} key={day.key}>
            {hours.map((hour) => <i key={hour} style={{ top: `${(hour * 60 - gridStart) * VERTICAL_MINUTE_SCALE}px` }} />)}
            {day.isToday && nowMinutes >= gridStart && nowMinutes < gridEnd && <span className="study-now-line" style={{ top: `${verticalNowOffset}px` }} />}
            {day.blocks.map((block) => { const bounds = timetableBlockBounds(block.startTime, block.endTime); return <button key={block.id} className="study-schedule-block" style={{
              "--block-top": `${(bounds.start - gridStart) * VERTICAL_MINUTE_SCALE}px`,
              "--block-height": `${Math.max(42, (bounds.end - bounds.start) * VERTICAL_MINUTE_SCALE - 4)}px`,
              "--module-color": study.modules.find((module) => module.id === block.moduleId)?.color ?? "#168b83",
            } as CSSProperties} onClick={() => dispatchPanel({ type: "open-details", blockId: block.id })}>
              <b>{block.label}</b><span>{block.module?.code ?? block.blockType}</span><small>{formatClock(block.startTime)}–{formatClock(block.endTime)}</small>{block.venueName && <em><MapPin size={11} />{block.venueName}</em>}
            </button>; })}
          </div>)}
        </div>
      </section>}

      {orientation === "horizontal" && <HorizontalWeekGrid
        study={study}
        days={days}
        hours={hours}
        gridStart={gridStart}
        gridEnd={gridEnd}
        nowMinutes={nowMinutes}
        weekLabel={formatWeekRange(weekStart)}
        scrollRef={horizontalScrollRef}
        showingCurrentWeek={showingCurrentWeek}
        onOpenDay={(key) => { setSelectedDay(key); setMode("day"); }}
        onOpenDueOverflow={(key) => { setSelectedDay(key); setMode("day"); }}
        onEditItem={onEditItem}
        onOpenBlock={(block) => dispatchPanel({ type: "open-details", blockId: block.id })}
      />}

      <section className="study-day-agenda" aria-label={`${activeDay.longLabel} agenda`}>
        <header><div><span>{activeDay.longLabel}</span><h2>{activeDay.dateLabel}</h2></div><button onClick={() => dispatchPanel({ type: "create", day: activeDay.weekday })}><Plus size={15} /> Add block</button></header>
        {activeDay.blocks.length === 0 && activeDay.dueItems.length === 0 ? <div className="study-agenda-empty"><CalendarDays size={23} /><b>Nothing scheduled.</b><p>Keep the space open or add a study block.</p></div> : <>
          {activeDay.blocks.map((block) => <article className="study-agenda-block" key={block.id} style={{ "--module-color": study.modules.find((module) => module.id === block.moduleId)?.color ?? "#168b83" } as CSSProperties}>
            <time>{formatClock(block.startTime)}<span>{formatClock(block.endTime)}</span></time><div><span>{block.module?.code ?? block.blockType}</span><h3>{block.label}</h3>{block.venueName && <p><MapPin size={13} /> {block.venueName}</p>}</div><button onClick={() => dispatchPanel({ type: "open-details", blockId: block.id })} aria-label={`View ${block.label}`}><ChevronRight size={17} /></button>
          </article>)}
          {activeDay.dueItems.length > 0 && <div className="study-agenda-due"><span>Deadlines</span>{activeDay.dueItems.map((item) => <article key={item.id} style={{ "--module-color": item.module.color ?? "#168b83" } as CSSProperties}><button onClick={() => onEditItem(item)}><small>{item.module.code} · {item.plannedMinutes ? `${item.plannedMinutes} min` : "unestimated"}</small><b>{item.title}</b></button><button onClick={() => onFocusItem(item)} aria-label={`Focus on ${item.title}`}><Focus size={16} /></button></article>)}</div>}
        </>}
      </section>
    </div>

    {panel.mode === "details" && panelBlock && <TimetableBlockDetails
      key={`details-${panelBlock.id}`}
      block={panelBlock}
      busy={busy}
      onClose={() => dispatchPanel({ type: "close" })}
      onEdit={() => dispatchPanel({ type: "edit" })}
      onDelete={async () => {
        const confirmed = window.confirm(`Remove ${panelBlock.label} from every scheduled week? This recurring block will be removed.`);
        if (!confirmed) return;
        const saved = await onDeleteBlock(panelBlock.id);
        if (saved !== undefined) dispatchPanel({ type: "close" });
      }}
    />}
    {(panel.mode === "create" || (panel.mode === "edit" && panelBlock)) && <TimetableEditor
      key={panel.mode === "create" ? `new-${panel.day}` : `edit-${panelBlock?.id}`}
      study={study}
      block={panel.mode === "edit" ? panelBlock : undefined}
      defaultDay={panel.mode === "create" ? panel.day : panelBlock?.dayOfWeek ?? activeDay.weekday}
      busy={busy}
      onClose={() => dispatchPanel({ type: "close" })}
      onSave={async (body) => {
        const saved = panel.mode === "edit" && panelBlock
          ? await onUpdateBlock(panelBlock.id, body)
          : await onAddBlock(body);
        if (saved !== undefined) dispatchPanel({ type: "close" });
      }}
    />}
    {importOpen && <NusmodsImportDialog
      busy={busy}
      onClose={() => setImportOpen(false)}
      onImport={async (url) => {
        const saved = await onImportNusmods(url);
        if (saved !== undefined) setImportOpen(false);
      }}
    />}
  </section>;
}

function NusmodsImportDialog({ busy, onClose, onImport }: {
  busy: boolean;
  onClose: () => void;
  onImport: (url: string) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [url, setUrl] = useState("");
  useDialogFocus(dialogRef, busy, onClose);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onImport(url.trim());
  };

  return <TimetableOverlay busy={busy} onClose={onClose}>
    <section ref={dialogRef} className="study-timetable-dialog study-timetable-import" role="dialog" aria-modal="true" aria-labelledby="nusmods-import-title" tabIndex={-1}>
      <header><div><span>NUSMods</span><h2 id="nusmods-import-title">Import timetable</h2></div><button onClick={onClose} disabled={busy} aria-label="Close NUSMods import"><X size={20} /></button></header>
      <form onSubmit={submit}>
        <label>Share link<input autoFocus required type="url" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://nusmods.com/timetable/sem-1/share?..." /></label>
        <p>Imports class types, times, weeks, and venues. Manual blocks stay unchanged.</p>
        <footer><button type="button" className="study-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="study-primary" disabled={busy || !url.trim()}><Upload size={16} /> {busy ? "Importing…" : "Import"}</button></footer>
      </form>
    </section>
  </TimetableOverlay>;
}

function HorizontalWeekGrid({ study, days, hours, gridStart, gridEnd, nowMinutes, weekLabel, scrollRef, showingCurrentWeek, onOpenDay, onOpenDueOverflow, onEditItem, onOpenBlock }: {
  study: StudySnapshot;
  days: ReturnType<typeof buildTimetableDays>;
  hours: number[];
  gridStart: number;
  gridEnd: number;
  nowMinutes: number;
  weekLabel: string;
  scrollRef: RefObject<HTMLElement | null>;
  showingCurrentWeek: boolean;
  onOpenDay: (key: string) => void;
  onOpenDueOverflow: (key: string) => void;
  onEditItem: (item: StudyItem) => void;
  onOpenBlock: (block: ScheduleBlock) => void;
}) {
  const timelineWidth = (gridEnd - gridStart) * HORIZONTAL_MINUTE_SCALE + 48;
  const horizontalNowOffset = timetableIndicatorOffset(nowMinutes - gridStart, HORIZONTAL_MINUTE_SCALE, timelineWidth - 48, 20);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || (event.deltaX === 0 && event.deltaY === 0)) return;

      const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? viewport.clientWidth * 0.85
          : 1;
      const wheelDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const delta = wheelDelta * scale;
      const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const canMove = delta > 0 ? viewport.scrollLeft < maximum - 1 : viewport.scrollLeft > 1;

      event.preventDefault();
      if (!canMove) return;
      viewport.scrollLeft = Math.min(maximum, Math.max(0, viewport.scrollLeft + delta));
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [scrollRef]);

  return <section ref={scrollRef} className="study-horizontal-grid" aria-label={`Horizontal timetable for ${weekLabel}`} style={{ "--timeline-width": `${timelineWidth}px` } as CSSProperties}>
    <div className="study-horizontal-scroll">
      <div className="study-horizontal-time-axis">
        <span className="study-horizontal-axis-day" aria-hidden="true">Day</span>
        <span className="study-horizontal-axis-deadlines" aria-hidden="true">Deadlines</span>
        <div>{hours.map((hour) => <time key={hour} style={{ left: `${(hour * 60 - gridStart) * HORIZONTAL_MINUTE_SCALE}px` }}>{formatClock(`${String(hour).padStart(2, "0")}:00`)}</time>)}{showingCurrentWeek && <strong className="study-horizontal-now-label" style={{ left: `${horizontalNowOffset}px` }}>Now</strong>}</div>
      </div>
      <div className="study-horizontal-days">
        {days.map((day) => {
          const due = timetableDuePreview(day.dueItems);
          const layout = timetableBlockLanes(day.blocks);
          const laneGap = 8;
          const rowPadding = 10;
          const rowHeight = Math.max(82, rowPadding + layout.laneCount * 58 + (layout.laneCount - 1) * laneGap);
          return <div className={`study-horizontal-day ${day.isToday ? "today" : ""}`} key={day.key} style={{ "--row-height": `${rowHeight}px` } as CSSProperties}>
          <button type="button" className="study-horizontal-day-label" aria-label={`Open ${day.longLabel}, ${day.dateLabel} in day view`} aria-current={day.isToday ? "date" : undefined} onClick={() => onOpenDay(day.key)}><span>{day.isToday ? `Today · ${day.shortLabel}` : day.shortLabel}</span><b>{day.dateLabel.split(" ")[0]}</b></button>
          <div className="study-horizontal-due" aria-label={`Deadlines for ${day.longLabel}`}>
            {due.visible.map((item) => <button key={item.id} style={{ "--module-color": item.module.color ?? "#168b83" } as CSSProperties} onClick={() => onEditItem(item)}><b>{item.title}</b><span>{item.module.code}</span></button>)}
            {due.visible.length === 0 && <span className="study-horizontal-due-empty">{"\u2014"}</span>}
            {due.remaining > 0 && <button className="more" onClick={() => onOpenDueOverflow(day.key)}>+{due.remaining} more</button>}
          </div>
          <div className="study-horizontal-track">
            {hours.map((hour) => <i key={hour} style={{ left: `${(hour * 60 - gridStart) * HORIZONTAL_MINUTE_SCALE}px` }} />)}
            {day.isToday && nowMinutes >= gridStart && nowMinutes < gridEnd && <span className="study-horizontal-now" style={{ left: `${horizontalNowOffset}px` }} />}
            {day.blocks.map((block) => { const bounds = timetableBlockBounds(block.startTime, block.endTime); const width = timetableHorizontalBlockWidth(block.startTime, block.endTime, HORIZONTAL_MINUTE_SCALE); const density = timetableBlockDensity(width); const label = scheduleBlockAccessibleLabel(block); const groupLaneCount = layout.groupLaneCounts.get(block.id) ?? 1; const blockHeight = (rowHeight - rowPadding - (groupLaneCount - 1) * laneGap) / groupLaneCount; return <button key={block.id} className={`study-horizontal-block density-${density}`} style={{
              "--block-left": `${(bounds.start - gridStart) * HORIZONTAL_MINUTE_SCALE + 3}px`,
              "--block-width": `${width}px`,
              "--block-top": `${5 + (layout.lanes.get(block.id) ?? 0) * (blockHeight + laneGap)}px`,
              "--block-height": `${blockHeight}px`,
              "--module-color": study.modules.find((module) => module.id === block.moduleId)?.color ?? "#168b83",
            } as CSSProperties} onClick={() => onOpenBlock(block)} aria-label={label} title={label}>
              {density === "narrow" ? <b>{block.label}</b> : <><b>{block.label}</b><span>{block.module?.code ?? block.blockType}</span>{density === "full" && <><small>{formatClock(block.startTime)}{"\u2013"}{formatClock(block.endTime)}</small>{block.venueName && <em><MapPin size={11} />{block.venueName}</em>}</>}</>}
            </button>; })}
          </div>
        </div>;
        })}
      </div>
    </div>
  </section>;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function scheduleBlockAccessibleLabel(block: ScheduleBlock): string {
  return [block.module?.code, block.label, `${DAY_NAMES[block.dayOfWeek - 1] ?? "Scheduled"}, ${formatClock(block.startTime)} to ${formatClock(block.endTime)}`, block.venueName]
    .filter(Boolean).join(" · ");
}

function useDialogFocus(dialogRef: RefObject<HTMLElement | null>, busy: boolean, onClose: () => void) {
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    busyRef.current = busy;
    onCloseRef.current = onClose;
  }, [busy, onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const initialFocus = dialog.querySelector<HTMLElement>("[autofocus]") ?? dialog;
    initialFocus.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); previous?.focus(); };
  }, [dialogRef]);
}

function TimetableOverlay({ children, busy, onClose, className = "" }: {
  children: ReactNode;
  busy: boolean;
  onClose: () => void;
  className?: string;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(<div className={`study-timetable-overlay ${className}`.trim()} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    {children}
  </div>, document.body);
}

function TimetableBlockDetails({ block, busy, onClose, onEdit, onDelete }: {
  block: ScheduleBlock;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(dialogRef, busy, onClose);
  const weeks = block.startWeek == null && block.endWeek == null
    ? "Every week"
    : block.startWeek === block.endWeek
      ? `Week ${block.startWeek}`
      : `Weeks ${block.startWeek ?? 1}–${block.endWeek ?? "end"}`;
  const travelConfigured = Boolean(block.venueName || block.defaultOrigin?.name || block.defaultOriginId);

  return <TimetableOverlay busy={busy} onClose={onClose} className="detail-overlay">
    <section ref={dialogRef} className="study-timetable-detail" role="dialog" aria-modal="true" aria-labelledby="timetable-details-title" tabIndex={-1}>
      <header><div><span>Timetable block</span><h2 id="timetable-details-title">{block.label}</h2></div><button onClick={onClose} disabled={busy} aria-label="Close block details"><X size={20} /></button></header>
      <div className="study-timetable-detail-body">
        <dl>
          {block.module && <div><dt>Module</dt><dd>{block.module.code} · {block.module.name}</dd></div>}
          <div><dt>Type</dt><dd>{block.blockType.replace(/_/g, " ")}</dd></div>
          <div><dt>Time</dt><dd>{DAY_NAMES[block.dayOfWeek - 1]} · {formatClock(block.startTime)}–{formatClock(block.endTime)}</dd></div>
          <div><dt>Repeats</dt><dd>{weeks}</dd></div>
          {block.venueName && <div><dt>Venue</dt><dd>{block.venueName}</dd></div>}
        </dl>
        {travelConfigured && <section className="study-timetable-detail-travel"><span><MapPin size={16} /> Travel reminder</span><p>{block.defaultOrigin?.name ? `From ${block.defaultOrigin.name}` : "Uses your current or default origin"}</p><small>{block.travelBufferMinutes} min buffer · {block.reminderLeadMinutes} min reminder lead</small></section>}
      </div>
      <footer><button type="button" className="study-danger" disabled={busy} onClick={() => void onDelete()}><Trash2 size={16} /> Delete</button><div><button type="button" className="study-secondary" disabled={busy} onClick={onClose}>Close</button><button type="button" className="study-primary" disabled={busy} onClick={onEdit}><Pencil size={16} /> Edit</button></div></footer>
    </section>
  </TimetableOverlay>;
}

function TimetableEditor({ study, block, defaultDay, busy, onClose, onSave }: {
  study: StudySnapshot;
  block?: ScheduleBlock;
  defaultDay: number;
  busy: boolean;
  onClose: () => void;
  onSave: (body: unknown) => Promise<void>;
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
  const [destinationPlaceId, setDestinationPlaceId] = useState<string | null>(block ? scheduleBlockPlaceId(block) : null);
  const [originId, setOriginId] = useState(block?.defaultOriginId ?? "");
  const [buffer, setBuffer] = useState(block?.travelBufferMinutes ?? 15);

  useDialogFocus(dialogRef, busy, onClose);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(timetableBlockPayload({
      moduleId,
      dayOfWeek: day,
      startTime: start,
      endTime: end,
      label,
      blockType,
      startWeek,
      endWeek,
      destination,
      destinationPlaceId,
      defaultOriginId: originId,
      travelBufferMinutes: clampInteger(buffer, 0, 90),
    }, Boolean(block)));
  };

  return <TimetableOverlay busy={busy} onClose={onClose}>
    <section ref={dialogRef} className="study-timetable-dialog" role="dialog" aria-modal="true" aria-labelledby="timetable-editor-title" tabIndex={-1}>
      <header><div><span>{block ? "Edit block" : "New block"}</span><h2 id="timetable-editor-title">{block ? block.label : "Add to the timetable"}</h2></div><button onClick={onClose} disabled={busy} aria-label="Close editor"><X size={20} /></button></header>
      <form onSubmit={submit}>
        <label className="wide">Label<input autoFocus required maxLength={200} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="CS2100 lecture" /></label>
        <label>Module<select value={moduleId} onChange={(event) => setModuleId(event.target.value)}><option value="">No module</option>{study.modules.map((module) => <option key={module.id} value={module.id}>{module.code} · {module.name}</option>)}</select></label>
        <label>Type<select value={blockType} onChange={(event) => setBlockType(event.target.value)}><option value="class">Class</option><option value="lecture">Lecture</option><option value="tutorial">Tutorial</option><option value="lab">Lab</option><option value="study">Study block</option><option value="other">Other</option></select></label>
        <label>Day<select value={day} onChange={(event) => setDay(Number(event.target.value))}>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
        <label>Starts<input required type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label>Ends<input required type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        <div className="study-timetable-weeks"><label>From week<input type="text" inputMode="numeric" pattern="[0-9]*" value={startWeek} onChange={(event) => setStartWeek(normalizeIntegerDraft(event.target.value))} onBlur={() => startWeek && setStartWeek(String(clampInteger(Number(startWeek), 1, 80)))} placeholder="1" /></label><span>to</span><label>Until week<input type="text" inputMode="numeric" pattern="[0-9]*" value={endWeek} onChange={(event) => setEndWeek(normalizeIntegerDraft(event.target.value))} onBlur={() => endWeek && setEndWeek(String(clampInteger(Number(endWeek), 1, 80)))} placeholder="13" /></label></div>
        <div className="study-timetable-travel wide"><span><MapPin size={16} /> Leave-time reminder</span><StudyPlaceCombobox value={destination} placeId={destinationPlaceId} onChange={(value, placeId) => { setDestination(value); setDestinationPlaceId(placeId); }} /><label>Usual origin<select value={originId} onChange={(event) => setOriginId(event.target.value)}><option value="">Current/default origin</option>{study.origins.map((origin) => <option key={origin.id} value={origin.id}>{origin.name}</option>)}</select></label><label>Travel buffer<IntegerInput min={0} max={90} value={buffer} onValueChange={setBuffer} aria-label="Travel buffer" /></label></div>
        <footer><span /><div><button type="button" className="study-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="study-primary" disabled={busy}><Check size={16} /> {busy ? "Saving…" : block ? "Save changes" : "Save block"}</button></div></footer>
      </form>
    </section>
  </TimetableOverlay>;
}
