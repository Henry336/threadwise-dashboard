"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Clock3, GripVertical, LoaderCircle, Plus, RotateCcw, X } from "lucide-react";
import { StudyChoicePicker } from "@/components/study-choice-picker";
import type { StudyModule } from "@/lib/study-types";
import type { TaskCaptureDraft, TaskCaptureDraftItem, TodayAgenda, TodayAgendaEntry } from "@/lib/types";

type Props = {
  variant?: "standard" | "study";
  modules?: StudyModule[];
  onChanged?: () => void;
  disabled?: boolean;
};

type ApiError = Error & { status?: number };

export function TodayPlanner({ variant = "standard", modules = [], onChanged, disabled = false }: Props) {
  const [agenda, setAgenda] = useState<TodayAgenda | null>(null);
  const [draft, setDraft] = useState<TaskCaptureDraft | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [completingIds, setCompletingIds] = useState<Set<string>>(() => new Set());
  const [reordering, setReordering] = useState(false);

  const loadAgenda = useCallback(async () => {
    try {
      const response = await todayApi<{ agenda: TodayAgenda }>("today");
      setAgenda(response.agenda);
      setSupported(true);
    } catch (error) {
      if ((error as ApiError).status === 404) setSupported(false);
      else setMessage(error instanceof Error ? error.message : "Today could not refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (disabled) return;
    const timer = window.setTimeout(() => void loadAgenda(), 0);
    return () => window.clearTimeout(timer);
  }, [disabled, loadAgenda]);
  useEffect(() => {
    if (disabled) return;
    const draftId = new URLSearchParams(window.location.search).get("draft");
    if (!draftId) return;
    void todayApi<{ draft: TaskCaptureDraft }>(`task-drafts/${encodeURIComponent(draftId)}`)
      .then((response) => { setDraft(response.draft); setSupported(true); })
      .catch(() => undefined);
  }, [disabled]);

  const included = useMemo(() => draft?.items.filter((item) => item.included) ?? [], [draft]);
  const unresolved = included.some((item) => item.status === "NEEDS_REVIEW" || item.warnings.length > 0);

  const beginOrAppend = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const path = draft ? `task-drafts/${draft.id}/items` : "task-drafts";
      const moduleId = variant === "study" && modules.length === 1 ? modules[0]?.id : undefined;
      const response = await todayApi<{ draft: TaskCaptureDraft }>(path, "POST", { text: text.trim(), ...(moduleId ? { moduleId, studyItemType: "REVISION" } : {}) });
      setDraft(response.draft);
      setText("");
      setAdding(false);
      setSupported(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That list could not be prepared.");
    } finally { setSaving(false); }
  };

  const updateItem = async (item: TaskCaptureDraftItem, patch: Record<string, unknown>) => {
    if (!draft) return;
    const previous = draft;
    setDraft({ ...draft, items: draft.items.map((candidate) => candidate.id === item.id ? { ...candidate, ...patch } as TaskCaptureDraftItem : candidate) });
    try {
      const response = await todayApi<{ draft: TaskCaptureDraft }>(`task-drafts/${draft.id}/items/${item.id}`, "PATCH", patch);
      setDraft(response.draft);
    } catch (error) {
      setDraft(previous);
      setMessage(error instanceof Error ? error.message : "That task could not be updated.");
    }
  };

  const commit = async () => {
    if (!draft || unresolved || !included.length) return;
    setSaving(true);
    try {
      await todayApi(`task-drafts/${draft.id}/commit`, "POST", {});
      setDraft(null);
      removeDraftQuery();
      setMessage(`Saved ${included.length} task${included.length === 1 ? "" : "s"}. No reminders were created.`);
      await loadAgenda();
      onChanged?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The list could not be saved.");
    } finally { setSaving(false); }
  };

  const cancelDraft = async () => {
    if (!draft) return;
    try { await todayApi(`task-drafts/${draft.id}`, "DELETE"); } catch { /* Expired drafts are already inert. */ }
    setDraft(null);
    setAdding(false);
    removeDraftQuery();
  };

  const planEntry = async (entry: TodayAgendaEntry, plannedFor: string | null) => {
    if (!agenda) return;
    const previous = agenda;
    const remove = (items: TodayAgendaEntry[]) => items.filter((candidate) => candidate.id !== entry.id);
    setAgenda({ ...agenda, today: remove(agenda.today), carryover: remove(agenda.carryover) });
    try {
      await todayApi(`today/${entry.id}/plan`, "PATCH", { plannedFor });
      await loadAgenda();
      onChanged?.();
    } catch (error) {
      setAgenda(previous);
      setMessage(error instanceof Error ? error.message : "That plan could not be changed.");
    }
  };

  const completeEntry = async (entry: TodayAgendaEntry) => {
    if (!agenda) return;
    const previous = agenda;
    const remove = (items: TodayAgendaEntry[]) => items.filter((candidate) => candidate.id !== entry.id);
    const markedAt = Date.now();
    setCompletingIds((ids) => new Set(ids).add(entry.id));
    setAnnouncement(`${entry.title} marked complete.`);
    try {
      await todayApi(`today/${entry.id}/complete`, "POST", {});
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const remainingMarkTime = reduceMotion ? 0 : Math.max(0, 180 - (Date.now() - markedAt));
      if (remainingMarkTime) await new Promise((resolve) => window.setTimeout(resolve, remainingMarkTime));
      setAgenda({ ...agenda, today: remove(agenda.today), carryover: remove(agenda.carryover), dueSoon: remove(agenda.dueSoon), overdue: remove(agenda.overdue) });
      setCompletingIds((ids) => { const next = new Set(ids); next.delete(entry.id); return next; });
      setMessage(null);
      onChanged?.();
    } catch (error) {
      setAgenda(previous);
      setCompletingIds((ids) => { const next = new Set(ids); next.delete(entry.id); return next; });
      setMessage(error instanceof Error ? error.message : "That task could not be completed.");
    }
  };

  const reorderToday = async (ordered: TodayAgendaEntry[], movedEntryId: string) => {
    if (!agenda?.reorderable || reordering) return;
    const previous = agenda;
    const moved = ordered.find((entry) => entry.id === movedEntryId);
    setAgenda({ ...agenda, today: ordered, orderRevision: agenda.orderRevision + 1 });
    setReordering(true);
    setAnnouncement(moved ? `${moved.title} moved to position ${ordered.findIndex((entry) => entry.id === movedEntryId) + 1}.` : "Today reordered.");
    try {
      const response = await todayApi<{ agenda: TodayAgenda }>("today/order", "PATCH", {
        localDate: agenda.localDate,
        orderedEntryIds: ordered.map((entry) => entry.id),
        movedEntryId,
        expectedRevision: agenda.orderRevision,
      });
      setAgenda(response.agenda);
    } catch (error) {
      setAgenda(previous);
      setMessage(error instanceof Error ? error.message : "Today could not be reordered.");
    } finally {
      setReordering(false);
    }
  };

  const moveToday = (entryId: string, placement: "top" | "up" | "down") => {
    if (!agenda?.reorderable) return;
    const from = agenda.today.findIndex((entry) => entry.id === entryId);
    if (from < 0) return;
    const to = placement === "top" ? 0 : placement === "up" ? Math.max(0, from - 1) : Math.min(agenda.today.length - 1, from + 1);
    if (from === to) return;
    void reorderToday(arrayMove(agenda.today, from, to), entryId);
  };

  if (disabled || supported === false) return null;
  if (loading && supported === null) return <section className={`today-planner ${variant}`} aria-label="Loading Today"><LoaderCircle className="spin" size={20} /> Loading Today…</section>;

  return <section className={`today-planner ${variant}`} aria-labelledby={`today-planner-title-${variant}`}>
    <header className="today-planner-head">
      <div><span>Today</span><h2 id={`today-planner-title-${variant}`}>What you intend to do</h2></div>
      {!draft && <button type="button" className="today-planner-add" onClick={() => setAdding((value) => !value)}><Plus size={16} /> Add tasks</button>}
    </header>

    {message && <p className="today-planner-message" role="status"><AlertCircle size={15} /> {message}</p>}
    <p className="sr-only" aria-live="polite">{announcement}</p>

    {!draft && adding && <div className="today-planner-capture">
      <label><span>One task, or one task per line</span><textarea autoFocus rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder={"Start the IP increments\nPrepare Tutorial 2\nBuy groceries"} /></label>
      <div><button type="button" onClick={() => { setAdding(false); setText(""); }}>Cancel</button><button type="button" className="today-planner-primary" onClick={() => void beginOrAppend()} disabled={saving || !text.trim()}>{saving ? <LoaderCircle className="spin" size={16} /> : <ChevronRight size={16} />} Review list</button></div>
    </div>}

    {draft ? <div className="today-draft">
      <div className="today-draft-summary"><div><b>Review {included.length} task{included.length === 1 ? "" : "s"}</b><span>Nothing is saved until you approve the whole list.</span></div><button type="button" onClick={() => void cancelDraft()} aria-label="Discard task draft"><X size={18} /></button></div>
      <div className="today-draft-items">{draft.items.map((item) => <DraftRow key={item.id} item={item} timezone={draft.timezone} modules={modules} study={variant === "study"} onChange={(patch) => void updateItem(item, patch)} />)}</div>
      {adding && <div className="today-draft-more"><textarea autoFocus rows={2} value={text} onChange={(event) => setText(event.target.value)} placeholder="Add one or more tasks…" /><button type="button" onClick={() => void beginOrAppend()} disabled={saving || !text.trim()}>Add to list</button></div>}
      <footer><button type="button" onClick={() => setAdding((value) => !value)}><Plus size={15} /> {adding ? "Close" : "Add more"}</button><span />{unresolved && <small>Resolve the highlighted details first.</small>}<button type="button" className="today-planner-primary" onClick={() => void commit()} disabled={saving || unresolved || !included.length}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Save {included.length}</button></footer>
    </div> : agenda && <div className="today-agenda-grid">
      <AgendaColumn title="Today" empty="No tasks planned for today." entries={agenda.today} timezone={agenda.timezone} onComplete={completeEntry} completingIds={completingIds} reorderable={agenda.reorderable} reorderDisabled={reordering} onReorder={(ordered, movedId) => void reorderToday(ordered, movedId)} onMove={moveToday} />
      <AgendaColumn title="Carryover" empty="Nothing carried over." entries={agenda.carryover} timezone={agenda.timezone} carryover onPlan={(entry) => planEntry(entry, agenda.localDate)} onComplete={completeEntry} completingIds={completingIds} />
      <AgendaColumn title="Deadline watch" empty="Nothing due in the next 3 days." entries={agenda.dueSoon} timezone={agenda.timezone} deadlines onComplete={completeEntry} completingIds={completingIds} />
    </div>}
    {!draft && agenda?.unscheduledCount ? <p className="today-unscheduled"><RotateCcw size={14} /> {agenda.unscheduledCount} unscheduled task{agenda.unscheduledCount === 1 ? "" : "s"} remain in All Tasks.</p> : null}
  </section>;
}

function DraftRow({ item, timezone, modules, study, onChange }: { item: TaskCaptureDraftItem; timezone: string; modules: StudyModule[]; study: boolean; onChange: (patch: Record<string, unknown>) => void }) {
  const warning = warningText(item.warnings);
  return <article className={!item.included ? "excluded" : warning ? "needs-review" : ""}>
    <label className="today-draft-include"><input type="checkbox" checked={item.included} onChange={(event) => onChange({ included: event.target.checked })} /><span>{item.position}</span></label>
    <div className="today-draft-fields">
      <label><span>Task</span><input defaultValue={item.title} onBlur={(event) => { const title = event.target.value.trim(); if (title && title !== item.title) onChange({ title }); }} /></label>
      <div>
        <label><span>Plan</span><input type="date" value={dateValue(item.plannedFor)} onChange={(event) => onChange({ plannedFor: event.target.value || null })} /></label>
        <label><span>Deadline</span><input type="datetime-local" value={localDateTimeValue(item.dueAt, timezone)} onChange={(event) => onChange({ dueAt: event.target.value ? zonedInputToIso(event.target.value, timezone) : null })} /></label>
        {study && <StudyChoicePicker label="Module" value={item.moduleId ?? ""} placeholder="Choose module" searchable options={modules.map((module) => ({ value: module.id, label: module.code, detail: module.name }))} onChange={(moduleId) => onChange({ moduleId: moduleId || null, studyItemType: "REVISION" })} />}
      </div>
      {warning && <p><AlertCircle size={14} /> {warning}{item.warnings.includes("REMINDER_REQUIRES_CONFIRMATION") && <button type="button" onClick={() => onChange({ resolveWarnings: true })}>Keep task without reminder</button>}</p>}
    </div>
  </article>;
}

const AGENDA_PAGE_SIZE = 5;

type AgendaColumnProps = {
  title: string;
  empty: string;
  entries: TodayAgendaEntry[];
  timezone: string;
  carryover?: boolean;
  deadlines?: boolean;
  onPlan?: (entry: TodayAgendaEntry) => void;
  onComplete: (entry: TodayAgendaEntry) => void;
  completingIds: Set<string>;
  reorderable?: boolean;
  reorderDisabled?: boolean;
  onReorder?: (entries: TodayAgendaEntry[], movedEntryId: string) => void;
  onMove?: (entryId: string, placement: "top" | "up" | "down") => void;
};

function AgendaColumn({ title, empty, entries, timezone, carryover, deadlines, onPlan, onComplete, completingIds, reorderable = false, reorderDisabled = false, onReorder, onMove }: AgendaColumnProps) {
  const [page, setPage] = useState(0);
  const pendingFocusId = useRef<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(entries.length / AGENDA_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * AGENDA_PAGE_SIZE;
  const visible = entries.slice(start, start + AGENDA_PAGE_SIZE);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const finishDrag = (event: DragEndEvent) => {
    if (!reorderable || !onReorder || !event.over || event.active.id === event.over.id) return;
    const from = entries.findIndex((entry) => entry.id === event.active.id);
    const to = entries.findIndex((entry) => entry.id === event.over!.id);
    if (from >= 0 && to >= 0) onReorder(arrayMove(entries, from, to), String(event.active.id));
  };

  useEffect(() => {
    if (!pendingFocusId.current) return;
    const handle = [...document.querySelectorAll<HTMLButtonElement>("[data-today-reorder-id]")]
      .find((candidate) => candidate.dataset.todayReorderId === pendingFocusId.current);
    if (handle) {
      handle.focus();
      pendingFocusId.current = null;
    }
  }, [safePage, entries]);

  const moveWithFocus = (entryId: string, placement: "top" | "up" | "down") => {
    if (!onMove) return;
    const from = entries.findIndex((entry) => entry.id === entryId);
    const target = placement === "top" ? 0 : placement === "up" ? Math.max(0, from - 1) : Math.min(entries.length - 1, from + 1);
    setPage(Math.floor(target / AGENDA_PAGE_SIZE));
    pendingFocusId.current = entryId;
    onMove(entryId, placement);
  };

  const rows = <div>{visible.map((entry, visibleIndex) => reorderable && onMove
    ? <SortableAgendaRow key={entry.id} entry={entry} timezone={timezone} completing={completingIds.has(entry.id)} disabled={reorderDisabled} position={start + visibleIndex} total={entries.length} onComplete={onComplete} onMove={moveWithFocus} />
    : <AgendaRow key={entry.id} entry={entry} timezone={timezone} carryover={carryover} deadlines={deadlines} completing={completingIds.has(entry.id)} onComplete={onComplete} onPlan={onPlan} />)}</div>;

  return <section><header><h3>{title}</h3><span>{entries.length}</span></header>{entries.length ? <>{reorderable
    ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={finishDrag}><SortableContext items={visible.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>{rows}</SortableContext></DndContext>
    : rows}{pageCount > 1 && <footer className="today-agenda-pagination"><button type="button" onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0} aria-label={`Previous ${title} tasks`}><ChevronLeft size={16} /></button><span>{start + 1}–{start + visible.length} of {entries.length}</span><button type="button" onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))} disabled={safePage + 1 >= pageCount} aria-label={`Next ${title} tasks`}><ChevronRight size={16} /></button></footer>}</> : <p>{empty}</p>}</section>;
}

function AgendaRow({ entry, timezone, carryover, deadlines, completing, onComplete, onPlan }: { entry: TodayAgendaEntry; timezone: string; carryover?: boolean; deadlines?: boolean; completing: boolean; onComplete: (entry: TodayAgendaEntry) => void; onPlan?: (entry: TodayAgendaEntry) => void }) {
  return <article>
    <CompletionCircle entry={entry} completing={completing} onComplete={onComplete} />
    <AgendaIdentity entry={entry} timezone={timezone} />
    {carryover && onPlan && <button type="button" onClick={() => onPlan(entry)}>Do today</button>}
    {deadlines && <Clock3 className="today-agenda-deadline" size={15} aria-hidden="true" />}
  </article>;
}

function SortableAgendaRow({ entry, timezone, completing, disabled, position, total, onComplete, onMove }: { entry: TodayAgendaEntry; timezone: string; completing: boolean; disabled: boolean; position: number; total: number; onComplete: (entry: TodayAgendaEntry) => void; onMove: (entryId: string, placement: "top" | "up" | "down") => void }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return <article ref={setNodeRef} style={style} className={`today-agenda-sortable${isDragging ? " is-dragging" : ""}`}>
    <CompletionCircle entry={entry} completing={completing} onComplete={onComplete} />
    <AgendaIdentity entry={entry} timezone={timezone} />
    <button type="button" className="today-agenda-grip" data-today-reorder-id={entry.id} {...attributes} {...listeners} disabled={disabled} onClick={() => { if (!isDragging) setActionsOpen((open) => !open); }} aria-expanded={actionsOpen} aria-label={`Reorder ${entry.title}`} title="Drag to prioritize or open reorder actions"><GripVertical size={18} /></button>
    {actionsOpen && <div className="today-reorder-actions" aria-label={`Reorder ${entry.title}`}>
      <button type="button" onClick={() => { onMove(entry.id, "top"); setActionsOpen(false); }} disabled={position === 0}>Move to top</button>
      <button type="button" onClick={() => { onMove(entry.id, "up"); setActionsOpen(false); }} disabled={position === 0}>Move up</button>
      <button type="button" onClick={() => { onMove(entry.id, "down"); setActionsOpen(false); }} disabled={position + 1 >= total}>Move down</button>
    </div>}
  </article>;
}

function CompletionCircle({ entry, completing, onComplete }: { entry: TodayAgendaEntry; completing: boolean; onComplete: (entry: TodayAgendaEntry) => void }) {
  return <button type="button" className={`today-agenda-complete${completing ? " is-completing" : ""}`} onClick={() => onComplete(entry)} disabled={completing} aria-label={`Complete ${entry.title}`} title="Mark task complete">{completing ? <Check size={17} /> : <span aria-hidden="true" />}</button>;
}

function AgendaIdentity({ entry, timezone }: { entry: TodayAgendaEntry; timezone: string }) {
  return <div><b>{entry.title}</b><small><code>{entry.publicId}</code> · {entry.moduleCode ?? entry.workspaceName ?? modeLabel(entry.mode)}{entry.dueAt ? ` · ${formatDeadline(entry.dueAt, timezone)}` : ""}</small></div>;
}

function warningText(warnings: string[]): string | null {
  if (warnings.includes("STUDY_MODULE_REQUIRED")) return "Choose a module before saving.";
  if (warnings.includes("AMBIGUOUS_BARE_DATE")) return "Choose whether this date is the plan or the deadline.";
  if (warnings.includes("REMINDER_REQUIRES_CONFIRMATION")) return "Save the task first, then add a reminder separately.";
  return warnings.length ? "Review this detail before saving." : null;
}

function dateValue(value?: string | null): string { return value?.slice(0, 10) ?? ""; }
function localDateTimeValue(value: string | null | undefined, timezone: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)).replace(" ", "T");
}
function zonedInputToIso(value: string, timezone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Choose a valid date and time.");
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  let instant = desired;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const represented = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    const correction = desired - represented;
    if (!correction) break;
    instant += correction;
  }
  return new Date(instant).toISOString();
}
function formatDeadline(value: string, timezone: string): string { return new Intl.DateTimeFormat("en-SG", { timeZone: timezone, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function modeLabel(mode: TodayAgendaEntry["mode"]): string { return mode === "STUDY" ? "Study" : mode === "GROUP" ? "Group" : "Personal"; }
function removeDraftQuery() { const url = new URL(window.location.href); url.searchParams.delete("draft"); window.history.replaceState(null, "", url); }

async function todayApi<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/threadwise/${path}`, { method, credentials: "same-origin", cache: "no-store", headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = response.headers.get("content-type")?.includes("application/json") ? await response.json() : undefined;
  if (!response.ok) { const error = new Error(payload?.message || "Threadwise could not complete that request.") as ApiError; error.status = response.status; throw error; }
  return payload as T;
}
