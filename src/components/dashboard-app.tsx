"use client";
/* Authenticated image responses must stay on the browser's same-origin cookie path. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Bell, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Cloud, Download, ExternalLink,
  FileText, Filter, Image as ImageIcon, Inbox, Lightbulb,
  ListChecks, LoaderCircle, LogOut, Menu, Moon, MoreHorizontal, Pencil,
  Pin, Plus, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Sun, Trash2, Unplug,
  X, Zap,
} from "lucide-react";
import { ThreadwiseMark } from "./threadwise-mark";
import type {
  DashboardExpense, DashboardIdea, DashboardImage, DashboardNote, DashboardSettings,
  DashboardSnapshot, DashboardTask, EntityKind, IdeaStatus, IntegrationStatus, SearchResult,
} from "@/lib/types";

export type DashboardView = "today" | "tasks" | "library" | "notes" | "ideas" | "images" | "expenses" | "search" | "settings";
type EditableKind = Exclude<EntityKind, never>;
type EditorState = { kind: EditableKind; item?: DashboardTask | DashboardNote | DashboardIdea | DashboardExpense | DashboardImage; seed?: string };
type PaginationState = Record<"tasks" | "notes" | "ideas" | "expenses" | "images", { page: number; hasMore: boolean; loading: boolean }>;

const ACCENTS = { iris: "#6d5bd0", coral: "#dc6a52", mint: "#148b74" } as const;
const NAV: { id: DashboardView; label: string; icon: typeof Inbox }[] = [
  { id: "today", label: "Today", icon: Inbox },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "expenses", label: "Expenses", icon: CircleDollarSign },
  { id: "search", label: "Search", icon: Search },
  { id: "settings", label: "Settings", icon: Settings },
];
const DEMO_IMAGES = ["garden-light.svg", "launch-board.svg", "morning-cafe.svg", "receipt.svg", "city-rain.svg", "book-stack.svg"];
const IDEA_STATUSES: IdeaStatus[] = ["RAW", "CLARIFIED", "SELECTED", "PROTOTYPING", "BUILT", "PAUSED", "REJECTED"];

function calendarKey(value: string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function isToday(value: string | undefined, timezone: string) {
  return Boolean(value && calendarKey(value, timezone) === calendarKey(new Date(), timezone));
}
function isOverdue(task: DashboardTask, timezone: string) {
  void timezone;
  return task.status === "OPEN" && Boolean(task.dueAt && new Date(task.dueAt).getTime() < Date.now());
}
function formatDate(value: string, timezone: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: timezone, ...options }).format(new Date(value));
}
function formatTime(value: string | undefined, timezone: string) {
  if (!value) return "Any time";
  return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(value));
}
function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency }).format(value);
}
function zonedInputDate(value: string | undefined, timezone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
function zonedInputToIso(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Choose a valid date and time.");
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
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
function uniq<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
function asPayload<T>(body: unknown, key: string): T {
  const value = body as Record<string, unknown>;
  return (value[key] ?? body) as T;
}
function initialView(value?: string): DashboardView {
  return NAV.some((item) => item.id === value) ? value as DashboardView : value === "library" ? "library" : "today";
}
function useModalFocus<T extends HTMLElement, U extends HTMLElement>(
  container: React.RefObject<T | null>,
  initial: React.RefObject<U | null> | undefined,
  onClose: () => void,
) {
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      const fallback = container.current?.querySelector<HTMLElement>("[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      (initial?.current ?? fallback)?.focus();
    });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !container.current) return;
      const focusable = Array.from(container.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [container, initial, onClose]);
}

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/threadwise/${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = payload as { message?: string; error?: string };
    throw new Error(error.message ?? error.error ?? "That action could not be completed.");
  }
  return payload as T;
}

export function DashboardApp({ initialData, isDemo, initialView: requestedView }: { initialData: DashboardSnapshot; isDemo: boolean; initialView?: string }) {
  const [data, setData] = useState(initialData);
  const [activeView, setActiveView] = useState<DashboardView>(initialView(requestedView));
  const [libraryTab, setLibraryTab] = useState<"notes" | "ideas" | "images">("notes");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [accent, setAccent] = useState<keyof typeof ACCENTS>(initialData.user.accent);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [capture, setCapture] = useState("");
  const [captureKind, setCaptureKind] = useState<"task" | "note" | "idea">("task");
  const [pagination, setPagination] = useState<PaginationState>({
    tasks: { page: 1, hasMore: initialData.tasks.length >= 50, loading: false },
    notes: { page: 1, hasMore: initialData.notes.length >= 50, loading: false },
    ideas: { page: 1, hasMore: initialData.ideas.length >= 50, loading: false },
    expenses: { page: 1, hasMore: initialData.expenses.length >= 50, loading: false },
    images: { page: 1, hasMore: initialData.images.length >= 50, loading: false },
  });
  const toastTimer = useRef<number | null>(null);
  const hydratedCollections = useRef(new Set<string>());

  const announce = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  };
  const navigate = (view: DashboardView) => {
    setActiveView(view);
    setMoreOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); }
      else if (!typing && event.key === "/") { event.preventDefault(); setPaletteOpen(true); }
      else if (!typing && event.key.toLowerCase() === "n") { event.preventDefault(); document.getElementById("quick-capture")?.focus(); }
      else if (event.key === "Escape") { setPaletteOpen(false); setEditor(null); setMoreOpen(false); }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  useEffect(() => {
    const key = ({ tasks: "tasks", notes: "notes", ideas: "ideas", images: "images", expenses: "expenses" } as Partial<Record<DashboardView, keyof PaginationState>>)[activeView];
    if (!key || isDemo || hydratedCollections.current.has(key)) return;
    hydratedCollections.current.add(key);
    setPagination((current) => ({ ...current, [key]: { ...current[key], loading: true } }));
    void api<Record<string, { items: unknown[]; hasMore: boolean; page: number }>>(`${key}?page=1&limit=50`)
      .then((body) => {
        const page = body[key];
        if (!page) throw new Error("The collection response was incomplete.");
        setData((current) => ({ ...current, [key]: page.items } as DashboardSnapshot));
        setPagination((current) => ({ ...current, [key]: { page: page.page, hasMore: page.hasMore, loading: false } }));
      })
      .catch(() => {
        hydratedCollections.current.delete(key);
        setPagination((current) => ({ ...current, [key]: { ...current[key], loading: false } }));
        announce("Showing the latest snapshot; the full collection could not be loaded.");
      });
  // `announce` intentionally stays out so a transient toast does not refetch a collection.
  }, [activeView, isDemo]);

  const saveEntity = async (kind: EditableKind, values: Record<string, unknown>, item?: EditorState["item"]) => {
    setBusy(true);
    const plural = `${kind}s` as "tasks" | "notes" | "ideas" | "expenses" | "images";
    try {
      let saved: DashboardTask | DashboardNote | DashboardIdea | DashboardExpense | DashboardImage;
      if (isDemo) {
        const base = { ...item, ...values, id: item?.id ?? crypto.randomUUID(), publicId: item && "publicId" in item ? item.publicId : "DEMO", createdAt: item && "createdAt" in item ? item.createdAt : new Date().toISOString() };
        if (kind === "task") saved = { status: "OPEN", ...base } as DashboardTask;
        else if (kind === "note") saved = { summary: String(values.body ?? values.title ?? ""), tags: [], ...base } as DashboardNote;
        else if (kind === "idea") saved = { status: "RAW", tags: [], ...base } as DashboardIdea;
        else if (kind === "expense") saved = { description: "Expense", total: 0, currency: data.settings.expenseCurrency, transactionAt: new Date().toISOString(), ...base } as DashboardExpense;
        else saved = base as DashboardImage;
      }
      else saved = asPayload(await api(item ? `${plural}/${item.id}` : plural, item ? "PATCH" : "POST", values), kind);
      setData((current) => {
        const collection = current[plural] as Array<{ id: string }>;
        const next = item ? collection.map((entry) => entry.id === item.id ? saved : entry) : [saved, ...collection];
        return { ...current, [plural]: next } as DashboardSnapshot;
      });
      setEditor(null);
      announce(`${kind[0].toUpperCase()}${kind.slice(1)} ${item ? "updated" : "saved"}.`);
      return true;
    } catch (error) { announce(error instanceof Error ? error.message : "Could not save that."); return false; }
    finally { setBusy(false); }
  };
  const removeEntity = async (kind: EditableKind, item: NonNullable<EditorState["item"]>) => {
    const archives = kind === "task" || kind === "note" || kind === "idea";
    const action = archives ? "Archive" : "Delete";
    if (!window.confirm(`${action} “${"title" in item ? item.title : "caption" in item ? item.caption ?? item.publicId : "description" in item ? item.description : item.publicId}”?`)) return false;
    setBusy(true);
    const plural = `${kind}s` as "tasks" | "notes" | "ideas" | "expenses" | "images";
    try {
      if (!isDemo) await api(`${plural}/${item.id}`, "DELETE");
      setData((current) => ({ ...current, [plural]: (current[plural] as Array<{ id: string }>).filter((entry) => entry.id !== item.id) } as DashboardSnapshot));
      setEditor(null);
      announce(`${kind[0].toUpperCase()}${kind.slice(1)} ${archives ? "archived" : "deleted"}.`);
      return true;
    } catch (error) { announce(error instanceof Error ? error.message : `Could not ${action.toLowerCase()} that.`); return false; }
    finally { setBusy(false); }
  };
  const removeImages = async (images: DashboardImage[]) => {
    if (!images.length || !window.confirm(`Delete ${images.length} selected ${images.length === 1 ? "image" : "images"}?`)) return false;
    setBusy(true);
    try {
      if (!isDemo) await Promise.all(images.map((image) => api(`images/${image.id}`, "DELETE")));
      const ids = new Set(images.map((image) => image.id));
      setData((current) => ({ ...current, images: current.images.filter((image) => !ids.has(image.id)) }));
      announce(`${images.length} ${images.length === 1 ? "image" : "images"} deleted.`);
      return true;
    } catch (error) { announce(error instanceof Error ? error.message : "Could not delete the selected images."); return false; }
    finally { setBusy(false); }
  };
  const toggleTask = async (task: DashboardTask) => {
    const status = task.status === "DONE" ? "OPEN" : "DONE";
    setData((current) => ({ ...current, tasks: current.tasks.map((entry) => entry.id === task.id ? { ...entry, status } : entry) }));
    if (isDemo) { announce(status === "DONE" ? "Task completed." : "Task restored."); return; }
    try {
      const saved = asPayload<DashboardTask>(await api(`tasks/${task.id}`, "PATCH", { status }), "task");
      setData((current) => ({ ...current, tasks: current.tasks.map((entry) => entry.id === task.id ? saved : entry) }));
    } catch (error) {
      setData((current) => ({ ...current, tasks: current.tasks.map((entry) => entry.id === task.id ? task : entry) }));
      announce(error instanceof Error ? error.message : "Could not update that task.");
    }
  };
  const convertIdea = async (idea: DashboardIdea) => {
    setBusy(true);
    try {
      const task = isDemo
        ? { id: crypto.randomUUID(), publicId: "DEMO", title: idea.title, description: idea.concept, status: "OPEN" as const }
        : asPayload<DashboardTask>(await api(`ideas/${idea.id}/convert-to-task`, "POST", {}), "task");
      setData((current) => ({ ...current, tasks: [task, ...current.tasks] }));
      setEditor(null); navigate("tasks"); announce("Idea moved into action.");
    } catch (error) { announce(error instanceof Error ? error.message : "Could not convert that idea."); }
    finally { setBusy(false); }
  };
  const quickCapture = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = capture.trim(); if (!value) return;
    const saved = captureKind === "task"
      ? await saveEntity("task", { title: value })
      : captureKind === "note"
        ? await saveEntity("note", { title: value.slice(0, 80), body: value, tags: [] })
        : await saveEntity("idea", { title: value.slice(0, 80), concept: value, tags: [], status: "RAW" });
    if (saved) setCapture("");
  };
  const loadMore = async (kind: keyof PaginationState) => {
    if (isDemo || pagination[kind].loading || !pagination[kind].hasMore) return;
    const nextPage = pagination[kind].page + 1;
    setPagination((current) => ({ ...current, [kind]: { ...current[kind], loading: true } }));
    try {
      const body = await api<Record<string, { items: unknown[]; hasMore: boolean; page: number }>>(`${kind}?page=${nextPage}&limit=50`);
      const page = body[kind] ?? body as unknown as { items: unknown[]; hasMore: boolean; page: number };
      setData((current) => ({
        ...current,
        [kind]: uniq([...(current[kind] as Array<{ id: string }>), ...(page.items as Array<{ id: string }>)])
      } as DashboardSnapshot));
      setPagination((current) => ({ ...current, [kind]: { page: page.page, hasMore: page.hasMore, loading: false } }));
    } catch (error) {
      setPagination((current) => ({ ...current, [kind]: { ...current[kind], loading: false } }));
      announce(error instanceof Error ? error.message : "Could not load more.");
    }
  };
  const syncExpenses = async () => {
    if (isDemo) {
      const now = new Date().toISOString();
      setData((current) => ({ ...current, expenses: current.expenses.map((expense) => ({ ...expense, excelSyncedAt: now })) }));
      announce("Demo expenses marked as synced.");
      return;
    }
    await api("integrations/excel/sync", "POST", {});
    const body = await api<Record<string, { items: DashboardExpense[]; hasMore: boolean; page: number }>>("expenses?page=1&limit=50");
    if (body.expenses) {
      setData((current) => ({ ...current, expenses: body.expenses.items }));
      setPagination((current) => ({ ...current, expenses: { page: body.expenses.page, hasMore: body.expenses.hasMore, loading: false } }));
    }
    announce("Expenses synced to Excel.");
  };

  const openTasks = data.tasks.filter((task) => task.status === "OPEN");
  const todayTasks = openTasks.filter((task) => isToday(task.dueAt, data.user.timezone));
  const overdueTasks = openTasks.filter((task) => isOverdue(task, data.user.timezone));
  const focusTask = overdueTasks[0] ?? todayTasks[0] ?? openTasks[0];

  return (
    <div className="tw-shell" style={{ "--accent": ACCENTS[accent] } as React.CSSProperties}>
      <aside className="tw-sidebar">
        <div className="tw-brand-row"><ThreadwiseMark /><span className="live-dot"><i /> live</span></div>
        <button className="tw-quick-button" onClick={() => document.getElementById("quick-capture")?.focus()}><Plus size={17} /> Quick capture <kbd>N</kbd></button>
        <nav aria-label="Dashboard">
          <p>Workspace</p>
          {NAV.slice(0, 6).map(({ id, label, icon: Icon }) => <button key={id} className={activeView === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === "tasks" && <em>{openTasks.length}</em>}</button>)}
          <p>Manage</p>
          {NAV.slice(6).map(({ id, label, icon: Icon }) => <button key={id} className={activeView === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span></button>)}
        </nav>
        <div className="tw-sidebar-foot">
          <div className="tw-telegram-state"><Zap size={14} /><span><b>Live with Telegram</b><small>Everything stays in step</small></span></div>
          <button onClick={() => navigate("settings")} className="tw-profile"><span>{data.user.firstName[0]}</span><div><b>{data.user.fullName}</b><small>@{data.user.username ?? "threadwise"}</small></div><ChevronRight size={16} /></button>
        </div>
      </aside>

      <main className="tw-main">
        <header className="tw-topbar">
          <button className="tw-icon-button tw-menu-button" onClick={() => setMoreOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="tw-crumb"><span>Personal</span><ChevronRight size={12} /><b>{NAV.find((entry) => entry.id === activeView)?.label ?? "Library"}</b></div>
          <div className="tw-top-actions">
            {isDemo && <span className="tw-demo-pill">Demo · changes stay here</span>}
            <button className="tw-search-button" onClick={() => setPaletteOpen(true)}><Search size={16} /><span>Find anything</span><kbd>⌘ K</kbd></button>
            <button className="tw-icon-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Toggle theme">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
            <button className="tw-icon-button tw-avatar" onClick={() => navigate("settings")} aria-label="Open settings">{data.user.firstName[0]}</button>
          </div>
        </header>

        <div className="tw-content" key={activeView}>
          <PageHeading view={activeView} name={data.user.firstName} timezone={data.user.timezone} onAdd={() => setEditor({ kind: activeView === "notes" ? "note" : activeView === "ideas" ? "idea" : activeView === "expenses" ? "expense" : "task" })} />
          {activeView !== "settings" && activeView !== "search" && activeView !== "images" && (
            <form className="tw-capture" onSubmit={quickCapture}>
              <div className="tw-capture-kinds">{(["task", "note", "idea"] as const).map((kind) => <button key={kind} type="button" className={captureKind === kind ? "active" : ""} onClick={() => setCaptureKind(kind)}>{kind}</button>)}</div>
              <div><Sparkles size={19} /><input id="quick-capture" value={capture} onChange={(event) => setCapture(event.target.value)} placeholder={captureKind === "task" ? "What needs doing?" : captureKind === "note" ? "Keep a useful thought…" : "Capture a spark…"} /><button type="submit" disabled={busy || !capture.trim()}><ArrowRight size={18} /></button></div>
            </form>
          )}

          {activeView === "today" && <TodayView data={data} focusTask={focusTask} overdue={overdueTasks.length} today={todayTasks.length} onToggle={toggleTask} onNavigate={navigate} onEdit={(task) => setEditor({ kind: "task", item: task })} isDemo={isDemo} />}
          {activeView === "tasks" && <TasksView tasks={data.tasks} timezone={data.user.timezone} onToggle={toggleTask} onEdit={(task) => setEditor({ kind: "task", item: task })} onAdd={() => setEditor({ kind: "task" })} pagination={pagination.tasks} onLoadMore={() => loadMore("tasks")} />}
          {activeView === "notes" && <NotesView notes={data.notes} timezone={data.user.timezone} onEdit={(note) => setEditor({ kind: "note", item: note })} pagination={pagination.notes} onLoadMore={() => loadMore("notes")} />}
          {activeView === "ideas" && <IdeasView ideas={data.ideas} timezone={data.user.timezone} onEdit={(idea) => setEditor({ kind: "idea", item: idea })} onConvert={convertIdea} pagination={pagination.ideas} onLoadMore={() => loadMore("ideas")} />}
          {activeView === "images" && <ImagesView images={data.images} timezone={data.user.timezone} isDemo={isDemo} onEdit={(image) => setEditor({ kind: "image", item: image })} onDelete={(image) => removeEntity("image", image)} onBatchDelete={removeImages} onCreateNote={(image) => setEditor({ kind: "note", seed: image.ocrText || image.caption || "" })} pagination={pagination.images} onLoadMore={() => loadMore("images")} />}
          {activeView === "expenses" && <ExpensesView expenses={data.expenses} timezone={data.user.timezone} currency={data.settings.expenseCurrency} integration={data.integrations.find((item) => item.name === "Excel")} onSync={syncExpenses} onEdit={(expense) => setEditor({ kind: "expense", item: expense })} onAdd={() => setEditor({ kind: "expense" })} pagination={pagination.expenses} onLoadMore={() => loadMore("expenses")} announce={announce} />}
          {activeView === "library" && <LibraryView data={data} tab={libraryTab} onTab={setLibraryTab} onNavigate={navigate} isDemo={isDemo} />}
          {activeView === "search" && <SearchView data={data} isDemo={isDemo} onOpen={(kind) => navigate(kind === "task" ? "tasks" : kind === "image" ? "images" : kind === "expense" ? "expenses" : `${kind}s` as DashboardView)} announce={announce} />}
          {activeView === "settings" && <SettingsView data={data} isDemo={isDemo} accent={accent} onAccent={setAccent} onSave={(settings) => setData((current) => ({ ...current, settings }))} onDisconnect={(provider) => setData((current) => ({ ...current, integrations: current.integrations.map((item) => (item.provider ?? item.name.toLowerCase()) === provider ? { ...item, state: "available", detail: "Disconnected" } : item) }))} announce={announce} />}
        </div>
      </main>

      <nav className="tw-mobile-nav" aria-label="Mobile dashboard">
        <button className={activeView === "today" ? "active" : ""} onClick={() => navigate("today")}><Inbox size={20} /><span>Today</span></button>
        <button className={activeView === "tasks" ? "active" : ""} onClick={() => navigate("tasks")}><ListChecks size={20} /><span>Tasks</span></button>
        <button className="capture" onClick={() => setEditor({ kind: "task" })} aria-label="Capture something"><Plus size={25} /></button>
        <button className={["library", "notes", "ideas", "images"].includes(activeView) ? "active" : ""} onClick={() => navigate("library")}><BookOpen size={20} /><span>Library</span></button>
        <button className={moreOpen ? "active" : ""} onClick={() => setMoreOpen(true)}><Menu size={20} /><span>More</span></button>
      </nav>

      {editor && <EntityEditor state={editor} busy={busy} currency={data.settings.expenseCurrency} timezone={data.user.timezone} onClose={() => setEditor(null)} onSave={saveEntity} onDelete={removeEntity} onConvert={convertIdea} />}
      {paletteOpen && <CommandPalette data={data} onClose={() => setPaletteOpen(false)} onNavigate={(view) => { navigate(view); setPaletteOpen(false); }} />}
      {moreOpen && <MobileMore activeView={activeView} onClose={() => setMoreOpen(false)} onNavigate={navigate} />}
      {toast && <div className="tw-toast" role="status"><CheckCircle2 size={16} />{toast}</div>}
    </div>
  );
}

function PageHeading({ view, name, timezone, onAdd }: { view: DashboardView; name: string; timezone: string; onAdd: () => void }) {
  const hour = Number(new Intl.DateTimeFormat("en-SG", { hour: "2-digit", hour12: false, timeZone: timezone }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const copy: Record<DashboardView, [string, string]> = {
    today: [`${greeting}, ${name}.`, "One calm view of what matters now."], tasks: ["Tasks", "Things to do, reminders when they matter."],
    library: ["Library", "Notes, ideas, and images—kept together."], notes: ["Notes", "Useful things you wanted to keep."],
    ideas: ["Ideas", "Small sparks, ready when you are."], images: ["Images", "Every saved frame, easy to find again."],
    expenses: ["Expenses", "A clear view of what moved."], search: ["Search everything", "Titles, words, receipts, and remembered fragments."],
    settings: ["Settings", "Make Threadwise work the way you do."],
  };
  const canAdd = ["tasks", "notes", "ideas", "expenses"].includes(view);
  return <div className="tw-heading"><div><p>{new Intl.DateTimeFormat("en-SG", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(new Date())}</p><h1>{copy[view][0]}</h1><span>{copy[view][1]}</span></div>{canAdd && <button className="tw-primary" onClick={onAdd}><Plus size={17} /> Add {view.slice(0, -1)}</button>}</div>;
}

function TodayView({ data, focusTask, overdue, today, onToggle, onNavigate, onEdit, isDemo }: { data: DashboardSnapshot; focusTask?: DashboardTask; overdue: number; today: number; onToggle: (task: DashboardTask) => void; onNavigate: (view: DashboardView) => void; onEdit: (task: DashboardTask) => void; isDemo: boolean }) {
  const upcoming = data.tasks.filter((task) => task.status === "OPEN" && task.dueAt).sort((a, b) => +new Date(a.dueAt!) - +new Date(b.dueAt!)).slice(0, 5);
  const recent = [...data.notes.map((item) => ({ ...item, kind: "note" as const })), ...data.ideas.map((item) => ({ ...item, kind: "idea" as const }))].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 3);
  const month = calendarKey(new Date(), data.user.timezone).slice(0, 7);
  const monthlyExpenses = data.expenses.filter((item) => calendarKey(item.transactionAt, data.user.timezone).startsWith(month));
  const spend = monthlyExpenses.filter((item) => item.currency === data.settings.expenseCurrency).reduce((sum, item) => sum + item.total, 0);
  return <div className="tw-bento">
    <section className="tw-card tw-focus-card">
      <div className="tw-card-head"><span><i className="tw-pulse" /> Needs attention</span><button onClick={() => onNavigate("tasks")}>All tasks <ArrowRight size={14} /></button></div>
      {focusTask ? <div className="tw-focus-body"><div><span className={isOverdue(focusTask, data.user.timezone) ? "tw-overdue-chip" : "tw-soft-chip"}>{isOverdue(focusTask, data.user.timezone) ? "Overdue" : isToday(focusTask.dueAt, data.user.timezone) ? "Today" : "Next"}</span><h2>{focusTask.title}</h2>{focusTask.description && <p>{focusTask.description}</p>}<div className="tw-meta">{focusTask.dueAt && <span><Clock3 size={14} />{formatDate(focusTask.dueAt, data.user.timezone, { weekday: "short" })}, {formatTime(focusTask.dueAt, data.user.timezone)}</span>}{focusTask.nextReminderAt && <span><Bell size={14} />Reminder set</span>}</div></div><div><button className="tw-primary" onClick={() => onToggle(focusTask)}><Check size={17} /> Complete</button><button className="tw-quiet" onClick={() => onEdit(focusTask)}><Pencil size={15} /> Edit</button></div></div> : <Empty icon={CheckCircle2} title="You are all clear." copy="Nothing needs your attention right now." />}
      <span className="tw-orbit" aria-hidden="true" />
    </section>
    <section className="tw-card tw-metric"><span>Overdue</span><b>{overdue}</b><small>{overdue ? "worth a decision" : "nothing trailing behind"}</small></section>
    <section className="tw-card tw-metric"><span>Today</span><b>{today}</b><small>{today === 1 ? "planned moment" : "planned moments"}</small></section>
    <section className="tw-card tw-timeline"><div className="tw-section-head"><div><span>Your threadline</span><h3>What comes next</h3></div><button onClick={() => onNavigate("tasks")}><MoreHorizontal size={18} /></button></div>{upcoming.length ? <ol>{upcoming.map((task) => <li key={task.id}><button onClick={() => onToggle(task)} aria-label={`Complete ${task.title}`}><Check size={13} /></button><time><b>{formatTime(task.dueAt, data.user.timezone)}</b><small>{isToday(task.dueAt, data.user.timezone) ? "Today" : formatDate(task.dueAt!, data.user.timezone)}</small></time><div><b>{task.title}</b><small>{task.description ?? (task.nextReminderAt ? "Reminder ready" : "Saved in Threadwise")}</small></div></li>)}</ol> : <Empty icon={CalendarDays} title="No dated tasks yet." copy="Add a time when you want something to reappear." />}</section>
    <section className="tw-card tw-recent"><div className="tw-section-head"><div><span>Recently captured</span><h3>Still warm</h3></div><button onClick={() => onNavigate("library")}><ArrowRight size={17} /></button></div>{recent.map((item) => <button key={item.id} onClick={() => onNavigate(item.kind === "note" ? "notes" : "ideas")}><span className={item.kind}><>{item.kind === "note" ? <FileText size={15} /> : <Lightbulb size={15} />}</></span><div><b>{item.title}</b><small>{item.kind === "note" ? item.summary : item.concept}</small></div><ChevronRight size={15} /></button>)}</section>
    <section className="tw-card tw-gallery-peek"><div className="tw-section-head"><div><span>Saved images</span><h3>Your recent frames</h3></div><button onClick={() => onNavigate("images")}><ArrowRight size={17} /></button></div><div>{data.images.slice(0, 4).map((image, index) => <button key={image.id} onClick={() => onNavigate("images")}><img src={isDemo ? `/demo/${DEMO_IMAGES[index % DEMO_IMAGES.length]}` : `/api/threadwise/images/${encodeURIComponent(image.id)}/content`} alt={image.caption ?? image.fileName ?? "Saved image"} /></button>)}{!data.images.length && <Empty icon={ImageIcon} title="No saved images yet." copy="Send an image to Threadwise in Telegram." />}</div></section>
    <section className="tw-card tw-spend"><div className="tw-section-head"><div><span>This month</span><h3>{money(spend, data.settings.expenseCurrency)}</h3></div><button onClick={() => onNavigate("expenses")}><ArrowRight size={17} /></button></div><p>{monthlyExpenses.filter((item) => item.currency === data.settings.expenseCurrency).length} {data.settings.expenseCurrency} expenses captured</p><div className="tw-spend-line"><i /></div></section>
    <section className="tw-card tw-connections"><div className="tw-section-head"><div><span>Connections</span><h3>Quietly in sync</h3></div><Cloud size={17} /></div>{data.integrations.map((item) => <div key={item.name}><span>{item.name[0]}</span><p><b>{item.name}</b><small>{item.detail}</small></p><i className={item.state} /></div>)}</section>
  </div>;
}

function TasksView({ tasks, timezone, onToggle, onEdit, onAdd, pagination, onLoadMore }: { tasks: DashboardTask[]; timezone: string; onToggle: (task: DashboardTask) => void; onEdit: (task: DashboardTask) => void; onAdd: () => void; pagination: PaginationState["tasks"]; onLoadMore: () => void }) {
  const [filter, setFilter] = useState<"open" | "done" | "all">("open"); const [query, setQuery] = useState("");
  const visible = tasks.filter((task) => (filter === "all" || (filter === "open" ? task.status === "OPEN" : task.status === "DONE")) && `${task.title} ${task.description ?? ""}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || +(new Date(a.dueAt ?? "2999")) - +(new Date(b.dueAt ?? "2999")));
  return <section className="tw-collection"><div className="tw-toolbar"><div className="tw-segmented">{(["open", "done", "all"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "done" ? "Completed" : item[0].toUpperCase() + item.slice(1)}</button>)}</div><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter tasks" /></label></div><div className="tw-list-card">{visible.map((task) => <article className={task.status === "DONE" ? "done" : ""} key={task.id}><button className="tw-check" onClick={() => onToggle(task)}>{task.status === "DONE" && <Check size={14} />}</button><button className="tw-row-copy" onClick={() => onEdit(task)}><b>{task.title}</b><small>{task.description ?? (task.nextReminderAt ? "Reminder scheduled" : "Saved in Threadwise")}</small></button><span className={isOverdue(task, timezone) ? "overdue" : ""}><b>{task.dueAt ? formatDate(task.dueAt, timezone, { weekday: "short" }) : "No date"}</b><small>{formatTime(task.dueAt, timezone)}</small></span><div className="tw-row-flags">{task.pinned && <Pin size={14} />}{task.nextReminderAt && <Bell size={14} />}</div><button className="tw-row-action" onClick={() => onEdit(task)}><MoreHorizontal size={18} /></button></article>)}{!visible.length && <Empty icon={ListChecks} title="Nothing here." copy={filter === "done" ? "Completed tasks will collect here." : "Add a task or tell Threadwise what needs doing."} action="Add task" onAction={onAdd} />}</div><LoadMore state={pagination} onLoadMore={onLoadMore} /></section>;
}

function NotesView({ notes, timezone, onEdit, pagination, onLoadMore }: { notes: DashboardNote[]; timezone: string; onEdit: (note: DashboardNote) => void; pagination: PaginationState["notes"]; onLoadMore: () => void }) {
  const [query, setQuery] = useState(""); const visible = notes.filter((note) => `${note.title} ${note.summary} ${note.body ?? ""} ${note.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="tw-collection"><CollectionSearch value={query} onChange={setQuery} placeholder="Search notes and tags" /><div className="tw-card-grid">{visible.map((note) => <button className="tw-note-card" key={note.id} onClick={() => onEdit(note)}>{note.pinned && <Pin className="tw-pin" size={15} />}<span><FileText size={14} /> Note</span><h3>{note.title}</h3><p>{note.body || note.summary}</p><div>{note.tags.map((tag) => <em key={tag}>#{tag}</em>)}</div><footer><time>{formatDate(note.createdAt, timezone, { year: "numeric" })}</time><span>Edit <ArrowRight size={14} /></span></footer></button>)}</div>{!visible.length && <Empty icon={FileText} title="No notes found." copy="Try a different phrase or capture a new note." />}<LoadMore state={pagination} onLoadMore={onLoadMore} /></section>;
}

function IdeasView({ ideas, timezone, onEdit, onConvert, pagination, onLoadMore }: { ideas: DashboardIdea[]; timezone: string; onEdit: (idea: DashboardIdea) => void; onConvert: (idea: DashboardIdea) => void; pagination: PaginationState["ideas"]; onLoadMore: () => void }) {
  const [status, setStatus] = useState<"ALL" | IdeaStatus>("ALL"); const visible = ideas.filter((idea) => status === "ALL" || idea.status === status);
  return <section className="tw-collection"><div className="tw-toolbar"><div className="tw-segmented"><button className={status === "ALL" ? "active" : ""} onClick={() => setStatus("ALL")}>All</button>{["RAW", "PROTOTYPING", "BUILT"].map((item) => <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item as IdeaStatus)}>{item.toLowerCase()}</button>)}</div></div><div className="tw-card-grid">{visible.map((idea) => <article className="tw-idea-card" key={idea.id}><button className="tw-idea-main" onClick={() => onEdit(idea)}><div><span><Lightbulb size={14} /> Idea</span><em>{idea.status.toLowerCase()}</em></div><h3>{idea.title}</h3><p>{idea.concept}</p><div className="tw-tags">{idea.tags.map((tag) => <i key={tag}>#{tag}</i>)}</div><footer>{formatDate(idea.createdAt, timezone, { year: "numeric" })}<span>Edit <ArrowRight size={14} /></span></footer></button>{!(["BUILT", "REJECTED"] as IdeaStatus[]).includes(idea.status) && <button className="tw-convert" onClick={() => onConvert(idea)}><Zap size={14} /> Turn into task</button>}</article>)}</div>{!visible.length && <Empty icon={Lightbulb} title="No ideas in this stage." copy="Every useful project starts as a small spark." />}<LoadMore state={pagination} onLoadMore={onLoadMore} /></section>;
}

function imageSrc(image: DashboardImage, isDemo: boolean, index = 0) { return isDemo ? `/demo/${image.fileName && DEMO_IMAGES.includes(image.fileName) ? image.fileName : DEMO_IMAGES[index % DEMO_IMAGES.length]}` : `/api/threadwise/images/${encodeURIComponent(image.id)}/content`; }
function ImagesView({ images, timezone, isDemo, onEdit, onDelete, onBatchDelete, onCreateNote, pagination, onLoadMore }: { images: DashboardImage[]; timezone: string; isDemo: boolean; onEdit: (image: DashboardImage) => void; onDelete: (image: DashboardImage) => Promise<boolean>; onBatchDelete: (images: DashboardImage[]) => Promise<boolean>; onCreateNote: (image: DashboardImage) => void; pagination: PaginationState["images"]; onLoadMore: () => void }) {
  const [query, setQuery] = useState(""); const [documents, setDocuments] = useState(false); const [active, setActive] = useState<DashboardImage | null>(null); const [selected, setSelected] = useState<Set<string>>(new Set());
  const visible = images.filter((image) => (!documents || image.mediaKind.toLowerCase() === "document") && `${image.caption ?? ""} ${image.ocrText ?? ""} ${image.fileName ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const grouped = visible.reduce<Record<string, DashboardImage[]>>((result, image) => { const key = calendarKey(image.createdAt, timezone); (result[key] ??= []).push(image); return result; }, {});
  const toggleSelect = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const deleteSelection = async () => { const chosen = images.filter((image) => selected.has(image.id)); if (await onBatchDelete(chosen)) setSelected(new Set()); };
  return <section className="tw-images"><div className="tw-gallery-toolbar"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search captions, filenames, or extracted text" /></label><button className={documents ? "active" : ""} onClick={() => setDocuments(!documents)}><Filter size={15} /> Documents</button>{selected.size > 0 && <><span>{selected.size} selected</span><button onClick={deleteSelection}><Trash2 size={15} /> Delete</button></>}</div>{Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([day, items]) => <div className="tw-image-day" key={day}><div><h2>{day === calendarKey(new Date(), timezone) ? "Today" : formatDate(zonedInputToIso(`${day}T12:00`, timezone), timezone, { weekday: "long" })}</h2><span>{items.length} {items.length === 1 ? "image" : "images"}</span></div><div className="tw-photo-grid">{items.map((image) => <article key={image.id} className={selected.has(image.id) ? "selected" : ""}><button className="tw-photo" onClick={() => setActive(image)}><img loading="lazy" src={imageSrc(image, isDemo, images.indexOf(image))} alt={image.caption ?? image.fileName ?? "Saved image"} /><span>{image.caption || image.fileName || "Untitled image"}</span></button><button className="tw-select-image" onClick={() => toggleSelect(image.id)} aria-label={`Select ${image.caption ?? image.publicId}`}>{selected.has(image.id) ? <Check size={14} /> : <Plus size={14} />}</button>{image.ocrText && <span className="tw-ocr-badge">Text found</span>}</article>)}</div></div>)}{!visible.length && <Empty icon={ImageIcon} title="No images found." copy="Send a photo or document to Threadwise in Telegram; it will appear here." />}<LoadMore state={pagination} onLoadMore={onLoadMore} />{active && <ImageLightbox image={active} images={visible} isDemo={isDemo} onClose={() => setActive(null)} onMove={(direction) => { const index = visible.findIndex((image) => image.id === active.id); setActive(visible[(index + direction + visible.length) % visible.length]); }} onEdit={() => { onEdit(active); setActive(null); }} onDelete={async () => { if (await onDelete(active)) setActive(null); }} onCreateNote={() => { onCreateNote(active); setActive(null); }} />}</section>;
}

function ImageLightbox({ image, images, isDemo, onClose, onMove, onEdit, onDelete, onCreateNote }: { image: DashboardImage; images: DashboardImage[]; isDemo: boolean; onClose: () => void; onMove: (direction: number) => void; onEdit: () => void; onDelete: () => Promise<void>; onCreateNote: () => void }) {
  const pointerStart = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") onMove(-1);
      if (event.key === "ArrowRight") onMove(1);
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", listener);
    return () => { window.removeEventListener("keydown", listener); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [onMove, onClose]);
  return <div ref={dialogRef} className="tw-lightbox" role="dialog" aria-modal="true" aria-label={image.caption ?? "Image preview"}><header><span>{images.findIndex((item) => item.id === image.id) + 1} of {images.length}</span><div><button onClick={onEdit}><Pencil size={17} /> Edit caption</button><button onClick={onCreateNote}><FileText size={17} /> Make note</button><button onClick={onDelete} aria-label="Delete image"><Trash2 size={17} /></button><button ref={closeRef} onClick={onClose} aria-label="Close preview"><X size={20} /></button></div></header><button className="tw-lightbox-arrow left" onClick={() => onMove(-1)} aria-label="Previous image"><ChevronLeft size={28} /></button><figure onPointerDown={(event) => { pointerStart.current = event.clientX; }} onPointerUp={(event) => { if (pointerStart.current === null) return; const delta = event.clientX - pointerStart.current; if (Math.abs(delta) > 55) onMove(delta > 0 ? -1 : 1); pointerStart.current = null; }}><img draggable={false} src={imageSrc(image, isDemo, images.indexOf(image))} alt={image.caption ?? image.fileName ?? "Saved image"} /><figcaption><b>{image.caption || image.fileName || "Untitled image"}</b>{image.ocrText && <p>{image.ocrText}</p>}</figcaption></figure><button className="tw-lightbox-arrow right" onClick={() => onMove(1)} aria-label="Next image"><ChevronRight size={28} /></button></div>;
}

function ExpensesView({ expenses, timezone, currency, integration, onSync, onEdit, onAdd, pagination, onLoadMore, announce }: { expenses: DashboardExpense[]; timezone: string; currency: string; integration?: IntegrationStatus; onSync: () => Promise<void>; onEdit: (expense: DashboardExpense) => void; onAdd: () => void; pagination: PaginationState["expenses"]; onLoadMore: () => void; announce: (message: string) => void }) {
  const [syncing, setSyncing] = useState(false);
  const month = calendarKey(new Date(), timezone).slice(0, 7); const monthly = expenses.filter((expense) => calendarKey(expense.transactionAt, timezone).startsWith(month)); const current = monthly.filter((expense) => expense.currency === currency); const total = current.reduce((sum, expense) => sum + expense.total, 0);
  const categories = Object.entries(current.reduce<Record<string, number>>((result, expense) => ({ ...result, [expense.category || "Other"]: (result[expense.category || "Other"] ?? 0) + expense.total }), {})).sort((a, b) => b[1] - a[1]);
  const exportCsv = () => { const rows = [["Date", "Merchant", "Description", "Category", "Total", "Currency"], ...expenses.map((e) => [e.transactionAt, e.merchant ?? "", e.description, e.category ?? "", String(e.total), e.currency])]; const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "threadwise-expenses.csv"; link.click(); URL.revokeObjectURL(link.href); announce("Expense CSV downloaded."); };
  const sync = async () => { setSyncing(true); try { await onSync(); } catch (error) { announce(error instanceof Error ? error.message : "Excel sync could not be completed."); } finally { setSyncing(false); } };
  return <section className="tw-expenses"><div className="tw-card tw-expense-summary"><span>This month · {currency}</span><h2>{money(total, currency)}</h2><p>{current.length} captured {currency} {current.length === 1 ? "expense" : "expenses"}{monthly.length > current.length ? ` · ${monthly.length - current.length} in other currencies` : ""}</p><div>{categories.slice(0, 5).map(([category, value]) => <span key={category}><i><em style={{ width: `${Math.max(8, value / Math.max(categories[0]?.[1] ?? 1, 1) * 100)}%` }} /></i><b>{category}</b><small>{money(value, currency)}</small></span>)}</div>{integration && <div className="tw-sync-card"><Cloud size={16} /><span><b>{integration.state === "connected" ? "Excel connected" : "Excel sync available"}</b><small>{integration.detail}</small></span>{integration.state === "connected" ? <button onClick={sync} disabled={syncing}>{syncing ? <LoaderCircle className="spin" size={13} /> : <RefreshCw size={13} />} Sync now</button> : <a href="https://t.me/threadwise_1_bot" target="_blank" rel="noreferrer">Connect in Telegram <ExternalLink size={13} /></a>}</div>}</div><div className="tw-card tw-expense-list"><div className="tw-section-head"><div><span>Latest</span><h3>Recent expenses</h3></div><div><button onClick={exportCsv}><Download size={15} /> Export CSV</button><button className="tw-primary" onClick={onAdd}><Plus size={15} /> Add</button></div></div>{expenses.map((expense) => <button key={expense.id} onClick={() => onEdit(expense)}><span>{(expense.merchant || "E")[0]}</span><div><b>{expense.merchant || expense.description}</b><small>{expense.description} · {expense.category || "Other"}</small></div><p><b>{money(expense.total, expense.currency)}</b><small>{formatDate(expense.transactionAt, timezone)}</small></p>{expense.excelSyncedAt ? <Cloud size={15} /> : <MoreHorizontal size={16} />}</button>)}{!expenses.length && <Empty icon={CircleDollarSign} title="No expenses yet." copy="Capture one in Telegram or add it here." action="Add expense" onAction={onAdd} />}<LoadMore state={pagination} onLoadMore={onLoadMore} /></div></section>;
}

function LibraryView({ data, tab, onTab, onNavigate, isDemo }: { data: DashboardSnapshot; tab: "notes" | "ideas" | "images"; onTab: (tab: "notes" | "ideas" | "images") => void; onNavigate: (view: DashboardView) => void; isDemo: boolean }) {
  return <section className="tw-library"><div className="tw-library-tabs">{(["notes", "ideas", "images"] as const).map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => onTab(item)}>{item === "notes" ? <FileText size={16} /> : item === "ideas" ? <Lightbulb size={16} /> : <ImageIcon size={16} />}{item}<span>{data[item].length}</span></button>)}</div>{tab === "images" ? <div className="tw-library-photo-strip">{data.images.slice(0, 8).map((image, index) => <button key={image.id} onClick={() => onNavigate("images")}><img src={imageSrc(image, isDemo, index)} alt={image.caption ?? "Saved image"} /><span>{image.caption ?? image.fileName}</span></button>)}</div> : <div className="tw-library-rows">{(tab === "notes" ? data.notes : data.ideas).slice(0, 20).map((item) => <button key={item.id} onClick={() => onNavigate(tab)}><span>{tab === "notes" ? <FileText size={16} /> : <Lightbulb size={16} />}</span><div><b>{item.title}</b><small>{"summary" in item ? item.summary : item.concept}</small></div><time>{formatDate(item.createdAt, data.user.timezone)}</time><ChevronRight size={16} /></button>)}</div>}<button className="tw-library-all" onClick={() => onNavigate(tab)}>Open all {tab}<ArrowRight size={15} /></button></section>;
}

function SearchView({ data, isDemo, onOpen, announce }: { data: DashboardSnapshot; isDemo: boolean; onOpen: (kind: SearchResult["kind"]) => void; announce: (message: string) => void }) {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<SearchResult[]>([]); const [loading, setLoading] = useState(false);
  const local = useMemo(() => { const q = query.toLowerCase().trim(); if (!q) return []; return [
    ...data.tasks.map((item) => ({ id: item.id, publicId: item.publicId, kind: "task" as const, title: item.title, excerpt: item.description })),
    ...data.notes.map((item) => ({ id: item.id, publicId: item.publicId, kind: "note" as const, title: item.title, excerpt: item.body || item.summary })),
    ...data.ideas.map((item) => ({ id: item.id, publicId: item.publicId, kind: "idea" as const, title: item.title, excerpt: item.concept })),
    ...data.images.map((item) => ({ id: item.id, publicId: item.publicId, kind: "image" as const, title: item.caption || item.fileName || "Saved image", excerpt: item.ocrText })),
    ...data.expenses.map((item) => ({ id: item.id, publicId: item.publicId, kind: "expense" as const, title: item.merchant || item.description, excerpt: `${item.description} ${item.category ?? ""}` })),
  ].filter((item) => `${item.title} ${item.excerpt ?? ""}`.toLowerCase().includes(q)).slice(0, 30); }, [data, query]);
  const search = async (event: React.FormEvent) => { event.preventDefault(); if (!query.trim()) return; if (isDemo) { setResults(local); return; } setLoading(true); try { const body = await api<{ results?: SearchResult[]; items?: SearchResult[] }>(`search?q=${encodeURIComponent(query)}&limit=50`); setResults(body.results ?? body.items ?? []); } catch (error) { setResults([]); announce(error instanceof Error ? error.message : "Search could not be completed."); } finally { setLoading(false); } };
  const shown = results.length || !isDemo ? results : local;
  return <section className="tw-search-view"><form onSubmit={search}><Search size={22} /><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setResults([]); }} placeholder="Search everything you have captured…" /><button className="tw-primary" disabled={!query.trim() || loading}>{loading ? <LoaderCircle className="spin" size={18} /> : "Search"}</button></form><div>{query && shown.map((result) => <button key={`${result.kind}-${result.id}`} onClick={() => onOpen(result.kind)}><span className={result.kind}>{result.kind === "task" ? <ListChecks size={17} /> : result.kind === "note" ? <FileText size={17} /> : result.kind === "idea" ? <Lightbulb size={17} /> : result.kind === "image" ? <ImageIcon size={17} /> : <CircleDollarSign size={17} />}</span><div><b>{result.title}</b><small>{result.excerpt || result.publicId}</small></div><em>{result.kind}</em><ArrowRight size={16} /></button>)}{query && shown.length === 0 && !loading && <Empty icon={Search} title="Nothing matched." copy="Try fewer words, a filename, a tag, or text from an image." />}{!query && <div className="tw-search-prompt"><Sparkles size={28} /><h2>Remember a fragment.</h2><p>Threadwise searches tasks, notes, ideas, image text, and expenses together.</p></div>}</div></section>;
}

function SettingsView({ data, isDemo, accent, onAccent, onSave, onDisconnect, announce }: { data: DashboardSnapshot; isDemo: boolean; accent: keyof typeof ACCENTS; onAccent: (value: keyof typeof ACCENTS) => void; onSave: (value: DashboardSettings) => void; onDisconnect: (provider: "gmail" | "calendar" | "excel") => void; announce: (message: string) => void }) {
  const [settings, setSettings] = useState(data.settings); const [saving, setSaving] = useState(false); const [confirmation, setConfirmation] = useState("");
  const save = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { const payload = { ...settings, quietHoursStart: settings.quietHoursStart || null, quietHoursEnd: settings.quietHoursEnd || null }; const saved = isDemo ? settings : asPayload<DashboardSettings>(await api("settings", "PATCH", payload), "settings"); onSave(saved); announce("Settings saved."); } catch (error) { announce(error instanceof Error ? error.message : "Could not save settings."); } finally { setSaving(false); } };
  const disconnect = async (provider: "gmail" | "calendar" | "excel") => { try { if (!isDemo) await api(`integrations/${provider}/disconnect`, "POST", {}); onDisconnect(provider); announce(isDemo ? "Disconnected in this demo." : `${provider} disconnected.`); } catch (error) { announce(error instanceof Error ? error.message : "Could not disconnect."); } };
  const exportData = async () => { try { if (isDemo) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "threadwise-demo-export.json"; a.click(); URL.revokeObjectURL(url); } else { const response = await fetch("/api/threadwise/privacy/export", { cache: "no-store" }); if (!response.ok) throw new Error("Export could not be prepared."); const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "threadwise-export.json"; a.click(); URL.revokeObjectURL(url); } announce("Your export is ready."); } catch (error) { announce(error instanceof Error ? error.message : "Could not export data."); } };
  const deleteAccount = async () => { if (confirmation !== "DELETE MY THREADWISE DATA") return; if (!window.confirm("This permanently deletes your Threadwise account and saved content. Continue?")) return; try { if (!isDemo) await api("privacy/account", "DELETE", { confirmation }); if (isDemo) announce("Account deletion is disabled in the demo."); else window.location.assign("/"); } catch (error) { announce(error instanceof Error ? error.message : "Could not delete account."); } };
  return <div className="tw-settings-grid"><section className="tw-settings-main"><div className="tw-settings-section"><div><span>Preferences</span><h2>How Threadwise works</h2><p>These settings apply in Telegram and on the web.</p></div><form onSubmit={save}><label>Timezone<input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} /></label><div className="tw-form-row"><label>Default reminder interval<select value={settings.reminderIntervalMinutes} onChange={(e) => setSettings({ ...settings, reminderIntervalMinutes: Number(e.target.value) })}><option value="60">1 hour</option><option value="180">3 hours</option><option value="360">6 hours</option><option value="1440">1 day</option></select></label><label>Reminder style<select value={settings.reminderMode} onChange={(e) => setSettings({ ...settings, reminderMode: e.target.value as DashboardSettings["reminderMode"] })}><option value="INDIVIDUAL">Individual</option><option value="DIGEST">Digest</option></select></label></div><div className="tw-form-row"><label>Quiet hours start<input type="time" value={settings.quietHoursStart ?? ""} onChange={(e) => setSettings({ ...settings, quietHoursStart: e.target.value || undefined })} /></label><label>Quiet hours end<input type="time" value={settings.quietHoursEnd ?? ""} onChange={(e) => setSettings({ ...settings, quietHoursEnd: e.target.value || undefined })} /></label></div><label className="tw-switch"><span><b>Private assignee nudges</b><small>Send direct reminders only to the private chat of someone assigned to a task.</small></span><input type="checkbox" checked={settings.directNudgesEnabled} onChange={(e) => setSettings({ ...settings, directNudgesEnabled: e.target.checked })} /></label><button className="tw-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Save preferences</button></form></div><div className="tw-settings-section"><div><span>Integrations</span><h2>Connected services</h2><p>Provider tokens are encrypted before storage.</p></div><div className="tw-integration-list">{data.integrations.map((item) => { const provider = (item.provider ?? item.name.toLowerCase()) as "gmail" | "calendar" | "excel"; return <article key={item.name}><span>{item.name[0]}</span><div><b>{item.name}</b><small>{item.detail}</small></div><em className={item.state}>{item.state}</em>{item.state === "connected" ? <button onClick={() => disconnect(provider)}><Unplug size={15} /> Disconnect</button> : item.connectUrl ? <a href={item.connectUrl}>Connect <ExternalLink size={14} /></a> : <button disabled>Connect in Telegram</button>}</article>; })}</div></div><div className="tw-settings-section tw-danger-zone"><div><span>Data &amp; privacy</span><h2>Your data, your decision</h2><p>Export a readable copy or permanently remove your account.</p></div><button className="tw-secondary" onClick={exportData}><Download size={16} /> Export my data</button><label>To delete everything, type <b>DELETE MY THREADWISE DATA</b><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label><button className="tw-danger" disabled={confirmation !== "DELETE MY THREADWISE DATA"} onClick={deleteAccount}><Trash2 size={16} /> Delete account and data</button></div></section><aside className="tw-settings-side"><section><span>Appearance</span><h3>Make it yours</h3><div className="tw-accent-row">{(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((color) => <button key={color} className={accent === color ? "active" : ""} style={{ background: ACCENTS[color] }} onClick={() => onAccent(color)} aria-label={`Use ${color} accent`} />)}</div></section><section className="tw-privacy-card"><ShieldCheck size={23} /><h3>What “private” means here</h3><p>Telegram authenticates you; Threadwise never receives your Telegram password. Every request is scoped to your Telegram account.</p><p>Your content is <b>not end-to-end encrypted</b>. A small number of authorized production operators can technically access stored content when needed to run or secure the service.</p><p>OAuth tokens are encrypted before storage. If you use AI features, only the relevant content may be sent to the configured AI provider.</p><a href="/privacy">Read the full privacy explanation <ArrowRight size={14} /></a></section><form action="/api/auth/logout" method="post"><button className="tw-secondary" type="submit"><LogOut size={16} /> Sign out</button></form></aside></div>;
}

function EntityEditor({ state, busy, currency, timezone, onClose, onSave, onDelete, onConvert }: { state: EditorState; busy: boolean; currency: string; timezone: string; onClose: () => void; onSave: (kind: EditableKind, values: Record<string, unknown>, item?: EditorState["item"]) => void; onDelete: (kind: EditableKind, item: NonNullable<EditorState["item"]>) => void; onConvert: (idea: DashboardIdea) => void }) {
  const item = state.item; const title = `${item ? "Edit" : "Add"} ${state.kind}`;
  const dialogRef = useRef<HTMLElement | null>(null);
  useModalFocus(dialogRef, undefined, onClose);
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); let values: Record<string, unknown> = {};
    if (state.kind === "task") values = { title: form.get("title"), description: form.get("description") || undefined, dueAt: form.get("dueAt") ? zonedInputToIso(String(form.get("dueAt")), timezone) : null, reminderIntervalMinutes: form.get("reminder") ? Number(form.get("reminder")) : undefined };
    if (state.kind === "note") values = { title: form.get("title"), body: form.get("body"), tags: String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean), pinned: form.get("pinned") === "on" };
    if (state.kind === "idea") values = { title: form.get("title"), concept: form.get("concept"), tags: String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean), status: form.get("status"), pinned: form.get("pinned") === "on" };
    if (state.kind === "expense") values = { merchant: form.get("merchant") || undefined, description: form.get("description"), total: Number(form.get("total")), currency: form.get("currency"), category: form.get("category") || undefined, transactionAt: zonedInputToIso(String(form.get("transactionAt")), timezone), paymentMethod: form.get("paymentMethod") || undefined, notes: form.get("notes") || undefined };
    if (state.kind === "image") values = { caption: form.get("caption") };
    onSave(state.kind, values, item);
  };
  return <div className="tw-modal-overlay" onMouseDown={onClose}><section ref={dialogRef} className="tw-sheet" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><header><div><span>{state.kind}</span><h2>{title}</h2></div><button onClick={onClose} aria-label="Close"><X size={20} /></button></header><form onSubmit={submit}>
    {state.kind === "task" && <><label>Task title<input name="title" required maxLength={500} autoFocus defaultValue={(item as DashboardTask | undefined)?.title ?? state.seed ?? ""} /></label><label>Details<textarea name="description" maxLength={5000} defaultValue={(item as DashboardTask | undefined)?.description ?? ""} /></label><div className="tw-form-row"><label>Due date &amp; time<input name="dueAt" type="datetime-local" defaultValue={zonedInputDate((item as DashboardTask | undefined)?.dueAt, timezone)} /></label><label>Reminder rhythm<select name="reminder" defaultValue={(item as DashboardTask | undefined)?.reminderIntervalMinutes ?? ""}><option value="">Use my default</option><option value="60">Every hour</option><option value="180">Every 3 hours</option><option value="360">Every 6 hours</option><option value="1440">Daily</option></select></label></div><p className="tw-form-help"><Bell size={14} /> Times use your Threadwise timezone ({timezone}). A task can have a due time; reminders bring it back when useful.</p></>}
    {state.kind === "note" && <><label>Title<input name="title" required maxLength={500} autoFocus defaultValue={(item as DashboardNote | undefined)?.title ?? (state.seed ? state.seed.slice(0, 80) : "")} /></label><label>Note<textarea name="body" required maxLength={50000} rows={8} defaultValue={(item as DashboardNote | undefined)?.body ?? (item as DashboardNote | undefined)?.summary ?? state.seed ?? ""} /></label><label>Tags <small>comma-separated</small><input name="tags" defaultValue={(item as DashboardNote | undefined)?.tags.join(", ") ?? ""} /></label><label className="tw-checkbox"><input type="checkbox" name="pinned" defaultChecked={(item as DashboardNote | undefined)?.pinned} /> Pin this note</label></>}
    {state.kind === "idea" && <><label>Idea title<input name="title" required maxLength={500} autoFocus defaultValue={(item as DashboardIdea | undefined)?.title ?? state.seed ?? ""} /></label><label>Concept<textarea name="concept" required maxLength={20000} rows={7} defaultValue={(item as DashboardIdea | undefined)?.concept ?? state.seed ?? ""} /></label><div className="tw-form-row"><label>Stage<select name="status" defaultValue={(item as DashboardIdea | undefined)?.status ?? "RAW"}>{IDEA_STATUSES.map((status) => <option key={status} value={status}>{status.toLowerCase()}</option>)}</select></label><label>Tags<input name="tags" defaultValue={(item as DashboardIdea | undefined)?.tags.join(", ") ?? ""} /></label></div><label className="tw-checkbox"><input type="checkbox" name="pinned" defaultChecked={(item as DashboardIdea | undefined)?.pinned} /> Pin this idea</label></>}
    {state.kind === "expense" && <><div className="tw-form-row"><label>Merchant<input name="merchant" autoFocus defaultValue={(item as DashboardExpense | undefined)?.merchant ?? ""} /></label><label>Total<input name="total" type="number" required min="0" step="0.01" defaultValue={(item as DashboardExpense | undefined)?.total ?? ""} /></label></div><label>Description<input name="description" required maxLength={5000} defaultValue={(item as DashboardExpense | undefined)?.description ?? ""} /></label><div className="tw-form-row"><label>Date &amp; time<input name="transactionAt" required type="datetime-local" defaultValue={zonedInputDate((item as DashboardExpense | undefined)?.transactionAt ?? new Date().toISOString(), timezone)} /></label><label>Currency<input name="currency" required minLength={3} maxLength={3} defaultValue={(item as DashboardExpense | undefined)?.currency ?? currency} /></label></div><div className="tw-form-row"><label>Category<input name="category" defaultValue={(item as DashboardExpense | undefined)?.category ?? ""} /></label><label>Payment method<input name="paymentMethod" defaultValue={(item as DashboardExpense | undefined)?.paymentMethod ?? ""} /></label></div><label>Notes<textarea name="notes" defaultValue={(item as DashboardExpense | undefined)?.notes ?? ""} /></label></>}
    {state.kind === "image" && <><div className="tw-image-form-preview"><ImageIcon size={25} /><span>{(item as DashboardImage).fileName ?? (item as DashboardImage).publicId}</span></div><label>Caption<textarea name="caption" rows={4} autoFocus defaultValue={(item as DashboardImage).caption ?? ""} /></label>{(item as DashboardImage).ocrText && <div className="tw-ocr-copy"><span>Text found in this image</span><p>{(item as DashboardImage).ocrText}</p></div>}</>}
    <footer>{item && <button type="button" className="tw-danger-quiet" onClick={() => onDelete(state.kind, item)}><Trash2 size={16} /> {["task", "note", "idea"].includes(state.kind) ? "Archive" : "Delete"}</button>}{state.kind === "idea" && item && <button type="button" className="tw-secondary" onClick={() => onConvert(item as DashboardIdea)}><Zap size={15} /> Make task</button>}<span /><button type="button" className="tw-secondary" onClick={onClose}>Cancel</button><button className="tw-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Save</button></footer>
  </form></section></div>;
}

function CommandPalette({ data, onClose, onNavigate }: { data: DashboardSnapshot; onClose: () => void; onNavigate: (view: DashboardView) => void }) {
  const [query, setQuery] = useState(""); const input = useRef<HTMLInputElement>(null); const dialogRef = useRef<HTMLElement | null>(null); useModalFocus(dialogRef, input, onClose);
  const results = useMemo(() => { const q = query.toLowerCase().trim(); if (!q) return []; return [
    ...data.tasks.map((item) => ({ title: item.title, detail: item.description, view: "tasks" as DashboardView, icon: ListChecks })),
    ...data.notes.map((item) => ({ title: item.title, detail: item.summary, view: "notes" as DashboardView, icon: FileText })),
    ...data.ideas.map((item) => ({ title: item.title, detail: item.concept, view: "ideas" as DashboardView, icon: Lightbulb })),
    ...data.images.map((item) => ({ title: item.caption || item.fileName || "Saved image", detail: item.ocrText, view: "images" as DashboardView, icon: ImageIcon })),
    ...data.expenses.map((item) => ({ title: item.merchant || item.description, detail: item.description, view: "expenses" as DashboardView, icon: CircleDollarSign })),
  ].filter((item) => `${item.title} ${item.detail ?? ""}`.toLowerCase().includes(q)).slice(0, 8); }, [data, query]);
  return <div className="tw-command-overlay" onMouseDown={onClose}><section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Find anything" onMouseDown={(event) => event.stopPropagation()}><header><Search size={20} /><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find anything…" /><kbd>ESC</kbd></header><div>{!query && <><p>Go somewhere</p>{NAV.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onNavigate(id)}><span><Icon size={17} /></span><b>{label}</b><ArrowRight size={15} /></button>)}</>}{query && results.map(({ title, detail, view, icon: Icon }, index) => <button key={`${title}-${index}`} onClick={() => onNavigate(view)}><span><Icon size={17} /></span><div><b>{title}</b><small>{detail}</small></div><ArrowRight size={15} /></button>)}{query && !results.length && <Empty icon={Search} title="No threads found." copy="Open full search for deeper results." action="Open search" onAction={() => onNavigate("search")} />}</div><footer><span><kbd>⌘ K</kbd> anywhere</span><button onClick={onClose}>Close</button></footer></section></div>;
}

function MobileMore({ activeView, onClose, onNavigate }: { activeView: DashboardView; onClose: () => void; onNavigate: (view: DashboardView) => void }) { const dialogRef = useRef<HTMLElement | null>(null); const closeRef = useRef<HTMLButtonElement | null>(null); useModalFocus(dialogRef, closeRef, onClose); return <div className="tw-mobile-sheet-overlay" onMouseDown={onClose}><section ref={dialogRef} role="dialog" aria-modal="true" aria-label="More navigation" onMouseDown={(event) => event.stopPropagation()}><header><span>Threadwise</span><button ref={closeRef} onClick={onClose} aria-label="Close navigation"><X size={20} /></button></header>{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={activeView === id ? "active" : ""} onClick={() => onNavigate(id)}><Icon size={19} /><span>{label}</span><ChevronRight size={16} /></button>)}</section></div>; }
function CollectionSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) { return <div className="tw-toolbar"><label><Search size={15} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label></div>; }
function LoadMore({ state, onLoadMore }: { state: { hasMore: boolean; loading: boolean }; onLoadMore: () => void }) { return state.hasMore ? <button className="tw-load-more" onClick={onLoadMore} disabled={state.loading}>{state.loading ? <LoaderCircle className="spin" size={17} /> : <ChevronDown size={17} />} Load more</button> : null; }
function Empty({ icon: Icon, title, copy, action, onAction }: { icon: typeof Inbox; title: string; copy: string; action?: string; onAction?: () => void }) { return <div className="tw-empty"><Icon size={27} /><b>{title}</b><span>{copy}</span>{action && <button onClick={onAction}>{action}</button>}</div>; }
