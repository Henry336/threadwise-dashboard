"use client";
/* Authenticated image responses must stay on the browser's same-origin cookie path. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ArrowRight, Bell, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Cloud, Download, ExternalLink,
  FileText, Filter, Image as ImageIcon, Inbox, Lightbulb,
  ListChecks, LoaderCircle, LogOut, Menu, Moon, MoreHorizontal, Pencil,
  Pin, Plus, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Sun, Trash2, Unplug,
  Wifi, WifiOff, X, Zap,
  Activity, ClipboardList, UsersRound,
} from "lucide-react";
import { ThreadwiseMark } from "./threadwise-mark";
import { Ari } from "./ari";
import { GroupSchedulingView } from "./group-scheduling";
import { ActionMenu, useActionMenu } from "./action-menu";
import type { ActionMenuAction, ActionMenuState } from "./action-menu";
import {
  PhaseTwoExpensesView,
  PhaseTwoIdeaBriefDialog,
  PhaseTwoIdeasView,
  PhaseTwoImagesView,
  PhaseTwoNotesView,
} from "./phase-two-collections";
import {
  GroupActivityView,
  GroupOverview,
  GroupPeople,
  GroupProgress,
  GroupResources,
  GroupTasksView,
  TaskCollaborationSheet,
  type CollaborationPayload,
  type GroupTaskScope,
} from "./group-workspace";
import type {
  DashboardExpense, DashboardIdea, DashboardImage, DashboardNote, DashboardSettings,
  DashboardSnapshot, DashboardTask, EntityKind, IdeaStatus, IntegrationStatus, SearchResult,
  CaptureKind, CapturePreview, IdeaBrief, DashboardWorkspace,
} from "@/lib/types";

export type DashboardView = "today" | "tasks" | "schedule" | "people" | "progress" | "activity" | "library" | "notes" | "ideas" | "images" | "expenses" | "search" | "settings";
type EditableKind = Exclude<EntityKind, never>;
type EditorState = { kind: EditableKind; item?: DashboardTask | DashboardNote | DashboardIdea | DashboardExpense | DashboardImage; seed?: string };
type PaginationState = Record<"tasks" | "notes" | "ideas" | "expenses" | "images", { page: number; hasMore: boolean; loading: boolean }>;
type IdeaBriefState = { idea: DashboardIdea; brief?: IdeaBrief; loading: boolean; error?: string };

const ACCENTS = { iris: "#168b83", coral: "#dc6a52", mint: "#2aa889" } as const;
const PERSONAL_NAV: { id: DashboardView; label: string; icon: typeof Inbox }[] = [
  { id: "today", label: "Today", icon: Inbox },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "search", label: "Search", icon: Search },
  { id: "settings", label: "Settings", icon: Settings },
];
const GROUP_NAV: { id: DashboardView; label: string; icon: typeof Inbox }[] = [
  { id: "today", label: "Overview", icon: Inbox },
  { id: "tasks", label: "Work", icon: ListChecks },
  { id: "schedule", label: "Find a time", icon: CalendarDays },
  { id: "people", label: "People", icon: UsersRound },
  { id: "progress", label: "Progress", icon: ClipboardList },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "library", label: "Resources", icon: BookOpen },
  { id: "search", label: "Search", icon: Search },
  { id: "settings", label: "Manage group", icon: Settings },
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
function formatRelativeSync(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1_000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
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
function viewAllowed(value: DashboardView, workspace: DashboardWorkspace): boolean {
  if (workspace.kind === "PERSONAL") return PERSONAL_NAV.some((item) => item.id === value) || value === "library";
  if (value === "expenses") return false;
  if (value === "settings" && workspace.role === "MEMBER") return false;
  return GROUP_NAV.some((item) => item.id === value) || ["notes", "ideas", "images"].includes(value);
}
function initialView(value: string | undefined, workspace: DashboardWorkspace): DashboardView {
  const candidate = value === "standup" ? "progress" : value as DashboardView | undefined;
  return candidate && viewAllowed(candidate, workspace) ? candidate : "today";
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

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
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
    throw new ClientApiError(response.status, error.error ?? "request_failed", error.message ?? error.error ?? "That action could not be completed.");
  }
  return payload as T;
}

class ClientApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ClientApiError";
  }
}

export function DashboardApp({ initialData, workspaces, isDemo, initialView: requestedView, initialPoll, openScheduleCreate }: { initialData: DashboardSnapshot; workspaces: DashboardWorkspace[]; isDemo: boolean; initialView?: string; initialPoll?: string; openScheduleCreate?: boolean }) {
  const [data, setData] = useState(initialData);
  const [activeView, setActiveView] = useState<DashboardView>(initialView(requestedView, initialData.workspace));
  const [libraryTab, setLibraryTab] = useState<"notes" | "ideas" | "images">("notes");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [accent, setAccent] = useState<keyof typeof ACCENTS>(initialData.user.accent);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [ideaBrief, setIdeaBrief] = useState<IdeaBriefState | null>(null);
  const [groupTaskScope, setGroupTaskScope] = useState<GroupTaskScope>("all");
  const [collaborationTask, setCollaborationTask] = useState<DashboardTask | null>(null);
  const [syncState, setSyncState] = useState<"connecting" | "live" | "reconnecting" | "offline">(isDemo ? "live" : "connecting");
  const [lastSyncedAt, setLastSyncedAt] = useState(initialData.generatedAt);
  const [pagination, setPagination] = useState<PaginationState>({
    tasks: { page: 1, hasMore: initialData.tasks.length >= 50, loading: false },
    notes: { page: 1, hasMore: initialData.notes.length >= 50, loading: false },
    ideas: { page: 1, hasMore: initialData.ideas.length >= 50, loading: false },
    expenses: { page: 1, hasMore: initialData.expenses.length >= 50, loading: false },
    images: { page: 1, hasMore: initialData.images.length >= 50, loading: false },
  });
  const toastTimer = useRef<number | null>(null);
  const hydratedCollections = useRef(new Set<string>());
  const refreshInFlight = useRef(false);

  const announce = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  };
  const navigate = (view: DashboardView) => {
    if (!viewAllowed(view, data.workspace)) view = "today";
    setActiveView(view);
    setMoreOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const refreshSnapshot = useCallback(async (showError = false) => {
    if (isDemo || refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const snapshot = await api<DashboardSnapshot>("snapshot");
      setData(snapshot);
      setCollaborationTask((current) => current ? snapshot.tasks.find((task) => task.id === current.id) ?? null : null);
      setLastSyncedAt(snapshot.generatedAt);
      setSyncState("live");
      hydratedCollections.current.clear();
      setPagination({
        tasks: { page: 1, hasMore: snapshot.tasks.length >= 50, loading: false },
        notes: { page: 1, hasMore: snapshot.notes.length >= 50, loading: false },
        ideas: { page: 1, hasMore: snapshot.ideas.length >= 50, loading: false },
        expenses: { page: 1, hasMore: snapshot.expenses.length >= 50, loading: false },
        images: { page: 1, hasMore: snapshot.images.length >= 50, loading: false },
      });
    } catch {
      setSyncState("offline");
      if (showError) announce("Live sync is retrying. Your last loaded data is still here.");
    } finally {
      refreshInFlight.current = false;
    }
  }, [isDemo]);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    const provider = url.searchParams.get("integration");
    const result = url.searchParams.get("result");
    if (!provider || !result) return;
    url.searchParams.delete("integration");
    url.searchParams.delete("result");
    window.history.replaceState(null, "", url);
    const message = result === "connected" ? `${provider === "calendar" ? "Google Calendar" : "Excel"} connected.` : `${provider === "calendar" ? "Google Calendar" : "Excel"} could not connect.`;
    const timer = window.setTimeout(() => announce(message), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); }
      else if (!typing && event.key === "/") { event.preventDefault(); setPaletteOpen(true); }
      else if (!typing && event.key.toLowerCase() === "n") { event.preventDefault(); setCaptureOpen(true); }
      else if (event.key === "Escape") { setPaletteOpen(false); setEditor(null); setMoreOpen(false); setCaptureOpen(false); }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  useEffect(() => {
    if (isDemo) return;
    const events = new EventSource("/api/threadwise/events");
    const ready = () => setSyncState("live");
    const refresh = () => { setSyncState("live"); void refreshSnapshot(); };
    const retrying = () => setSyncState("reconnecting");
    events.addEventListener("ready", ready);
    events.addEventListener("refresh", refresh);
    events.addEventListener("sync-error", retrying);
    events.onerror = retrying;
    const reconcile = window.setInterval(() => void refreshSnapshot(), 60_000);
    const focus = () => void refreshSnapshot();
    const visibility = () => { if (document.visibilityState === "visible") void refreshSnapshot(); };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      events.close();
      window.clearInterval(reconcile);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [isDemo, refreshSnapshot]);

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
      else {
        const revision = item && ["task", "note", "idea", "image"].includes(kind) && "updatedAt" in item && item.updatedAt
          ? { expectedUpdatedAt: item.updatedAt }
          : {};
        saved = asPayload(await api(item ? `${plural}/${item.id}` : plural, item ? "PATCH" : "POST", { ...values, ...revision }), kind);
      }
      setData((current) => {
        const collection = current[plural] as Array<{ id: string }>;
        const next = item ? collection.map((entry) => entry.id === item.id ? saved : entry) : [saved, ...collection];
        return { ...current, [plural]: next } as DashboardSnapshot;
      });
      setEditor(null);
      setLastSyncedAt(new Date().toISOString());
      setSyncState("live");
      announce(`${kind[0].toUpperCase()}${kind.slice(1)} ${item ? "updated" : "saved"}.`);
      return true;
    } catch (error) {
      if (error instanceof ClientApiError && error.code === "revision_conflict") {
        void refreshSnapshot();
        announce("This item changed in Telegram or another tab. I refreshed it instead of overwriting it.");
      } else announce(error instanceof Error ? error.message : "Could not save that.");
      return false;
    }
    finally { setBusy(false); }
  };
  const removeEntity = async (kind: EditableKind, item: NonNullable<EditorState["item"]>) => {
    const archives = kind === "task" || kind === "note" || kind === "idea";
    const action = kind === "note" ? "Delete" : archives ? "Archive" : "Delete";
    const label = "title" in item ? item.title : "caption" in item ? item.caption ?? item.publicId : "description" in item ? item.description : item.publicId;
    const recovery = kind === "note" ? " It will move to Archive and can be restored later." : "";
    if (!window.confirm(`${action} “${label}”?${recovery}`)) return false;
    setBusy(true);
    const plural = `${kind}s` as "tasks" | "notes" | "ideas" | "expenses" | "images";
    try {
      if (!isDemo) await api(`${plural}/${item.id}`, "DELETE");
      setData((current) => ({ ...current, [plural]: (current[plural] as Array<{ id: string }>).filter((entry) => entry.id !== item.id) } as DashboardSnapshot));
      setEditor(null);
      setLastSyncedAt(new Date().toISOString());
      announce(`${kind[0].toUpperCase()}${kind.slice(1)} ${kind === "note" ? "deleted" : archives ? "archived" : "deleted"}.`);
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
  const removeNotes = async (notes: DashboardNote[]) => {
    if (!notes.length || !window.confirm(`Delete ${notes.length} selected ${notes.length === 1 ? "note" : "notes"}? They will move to Archive and can be restored later.`)) return false;
    setBusy(true);
    try {
      if (!isDemo) await Promise.all(notes.map((note) => api(`notes/${note.id}`, "DELETE")));
      const ids = new Set(notes.map((note) => note.id));
      setData((current) => ({ ...current, notes: current.notes.filter((note) => !ids.has(note.id)) }));
      setLastSyncedAt(new Date().toISOString());
      announce(`${notes.length} ${notes.length === 1 ? "note" : "notes"} deleted.`);
      return true;
    } catch (error) { announce(error instanceof Error ? error.message : "Could not delete the selected notes."); return false; }
    finally { setBusy(false); }
  };
  const patchTask = async (task: DashboardTask, patch: Partial<DashboardTask>, message?: string) => {
    setData((current) => ({ ...current, tasks: current.tasks.map((entry) => entry.id === task.id ? { ...entry, ...patch } : entry) }));
    if (isDemo) { if (message) announce(message); return; }
    try {
      const saved = asPayload<DashboardTask>(await api(`tasks/${task.id}`, "PATCH", { ...patch, ...(task.updatedAt ? { expectedUpdatedAt: task.updatedAt } : {}) }), "task");
      setData((current) => ({ ...current, tasks: current.tasks.map((entry) => entry.id === task.id ? saved : entry) }));
      setLastSyncedAt(new Date().toISOString());
      if (message) announce(message);
    } catch (error) {
      setData((current) => ({ ...current, tasks: current.tasks.map((entry) => entry.id === task.id ? task : entry) }));
      if (error instanceof ClientApiError && error.code === "revision_conflict") {
        void refreshSnapshot();
        announce("That task changed elsewhere. I refreshed it instead of overwriting it.");
      } else announce(error instanceof Error ? error.message : "Could not update that task.");
    }
  };
  const toggleTask = (task: DashboardTask) => patchTask(task, { status: task.status === "DONE" ? "OPEN" : "DONE" }, task.status === "DONE" ? "Task restored." : "Task completed.");
  const pinTask = (task: DashboardTask) => patchTask(task, { pinned: !task.pinned }, task.pinned ? "Task unpinned." : "Task pinned.");
  const snoozeTask = (task: DashboardTask) => {
    const snoozedUntil = new Date(Date.now() + 60 * 60_000).toISOString();
    return patchTask(task, { snoozedUntil }, "Task snoozed for one hour.");
  };
  const toggleCollectionPin = async (kind: "note" | "idea" | "image", item: DashboardNote | DashboardIdea | DashboardImage) => {
    const plural = `${kind}s` as "notes" | "ideas" | "images";
    const pinned = !item.pinned;
    const optimistic = { ...item, pinned };
    setData((current) => ({
      ...current,
      [plural]: (current[plural] as Array<DashboardNote | DashboardIdea | DashboardImage>).map((entry) => entry.id === item.id ? optimistic : entry),
    } as DashboardSnapshot));
    if (isDemo) {
      announce(`${kind === "image" ? "Image" : kind[0].toUpperCase() + kind.slice(1)} ${pinned ? "pinned" : "unpinned"}.`);
      return;
    }
    try {
      const saved = asPayload<DashboardNote | DashboardIdea | DashboardImage>(await api(`${plural}/${item.id}`, "PATCH", {
        pinned,
        ...(item.updatedAt ? { expectedUpdatedAt: item.updatedAt } : {}),
      }), kind);
      setData((current) => ({
        ...current,
        [plural]: (current[plural] as Array<DashboardNote | DashboardIdea | DashboardImage>).map((entry) => entry.id === item.id ? saved : entry),
      } as DashboardSnapshot));
      setLastSyncedAt(new Date().toISOString());
      announce(`${kind === "image" ? "Image" : kind[0].toUpperCase() + kind.slice(1)} ${pinned ? "pinned" : "unpinned"}.`);
    } catch (error) {
      setData((current) => ({
        ...current,
        [plural]: (current[plural] as Array<DashboardNote | DashboardIdea | DashboardImage>).map((entry) => entry.id === item.id ? item : entry),
      } as DashboardSnapshot));
      if (error instanceof ClientApiError && error.code === "revision_conflict") {
        void refreshSnapshot();
        announce("That item changed elsewhere. I refreshed it instead of overwriting it.");
      } else announce(error instanceof Error ? error.message : "Could not update that item.");
    }
  };
  const analyzeIdea = async (idea: DashboardIdea, refresh = false) => {
    if (idea.brief && !refresh) {
      setIdeaBrief({ idea, brief: idea.brief, loading: false });
      return;
    }
    setIdeaBrief({ idea, brief: idea.brief, loading: true });
    if (isDemo) {
      const brief: IdeaBrief = {
        buildability: 8, usefulness: 9, novelty: 7, portfolioValue: 8,
        monetization: 6, difficulty: 4, risk: 3,
        summary: "A focused concept with a clear user benefit and a practical first version.",
        marketNotes: "Validate the narrowest recurring pain first, then widen the audience only after retention is visible.",
        dos: ["Interview five target users.", "Prototype the smallest repeatable workflow.", "Choose one success metric before building."],
        donts: ["Build every integration at once.", "Treat early enthusiasm as proven retention."],
      };
      const updated = { ...idea, brief, updatedAt: new Date().toISOString() };
      window.setTimeout(() => {
        setData((current) => ({ ...current, ideas: current.ideas.map((entry) => entry.id === idea.id ? updated : entry) }));
        setIdeaBrief({ idea: updated, brief, loading: false });
      }, 450);
      return;
    }
    try {
      const result = await api<{ idea: DashboardIdea; brief: IdeaBrief }>(`ideas/${idea.id}/analyze`, "POST", {});
      setData((current) => ({ ...current, ideas: current.ideas.map((entry) => entry.id === idea.id ? result.idea : entry) }));
      setIdeaBrief({ idea: result.idea, brief: result.brief, loading: false });
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Threadwise could not analyze this idea.";
      setIdeaBrief({ idea, brief: idea.brief, loading: false, error: message });
      announce(message);
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
  const connectIntegration = async (provider: "calendar" | "excel", taskId?: string) => {
    if (isDemo) { announce(`${provider === "calendar" ? "Calendar" : "Excel"} connection is simulated in the demo.`); return; }
    try {
      const response = await api<{ url: string }>(`integrations/${provider}/connect`, "POST", taskId ? { taskId } : {});
      window.location.assign(response.url);
    } catch (error) {
      announce(error instanceof Error ? error.message : `Could not connect ${provider}.`);
    }
  };
  const syncCalendarTasks = async () => {
    if (isDemo) { announce("Demo dated tasks marked as synced."); return; }
    const result = await api<{ synced: number; failed: number }>("integrations/calendar/sync", "POST", {});
    await refreshSnapshot();
    announce(result.failed > 0 ? `${result.synced} synced; ${result.failed} need another try.` : `${result.synced} dated ${result.synced === 1 ? "task" : "tasks"} synced.`);
  };
  const createExcelWorkbook = async () => {
    if (isDemo) { announce("Demo workbook created."); return; }
    const result = await api<{ name: string; url?: string }>("integrations/excel/workbook", "POST", {});
    await refreshSnapshot();
    announce(`${result.name} is ready.`);
    if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
  };
  const setIntegrationAutoSync = async (provider: "calendar" | "excel", enabled: boolean) => {
    const key = provider === "calendar" ? "calendarAutoSync" : "excelAutoSync";
    const next = { ...data.settings, [key]: enabled };
    if (!isDemo) {
      const saved = asPayload<DashboardSettings>(await api("settings", "PATCH", { [key]: enabled }), "settings");
      setData((current) => ({ ...current, settings: saved }));
    } else setData((current) => ({ ...current, settings: next }));
    announce(`Automatic ${provider === "calendar" ? "Calendar" : "Excel"} sync ${enabled ? "on" : "off"}.`);
  };
  const updateTaskCalendar = async (task: DashboardTask, action: "sync" | "remove") => {
    const calendar = data.integrations.find((item) => item.provider === "calendar");
    if (action === "sync" && calendar?.state !== "connected") {
      await connectIntegration("calendar", task.id);
      return;
    }
    if (action === "remove" && !window.confirm(`Remove “${task.title}” from Google Calendar? The Threadwise task will stay here.`)) return;
    if (isDemo) {
      const patch = action === "sync" ? { calendarEventId: `demo-${task.id}`, calendarSyncedAt: new Date().toISOString() } : { calendarEventId: undefined, calendarEventUrl: undefined, calendarSyncedAt: undefined };
      setData((current) => ({ ...current, tasks: current.tasks.map((entry) => entry.id === task.id ? { ...entry, ...patch } : entry) }));
      announce(action === "sync" ? "Task added to the demo calendar." : "Task removed from the demo calendar.");
      return;
    }
    try {
      const response = await api<{ task: DashboardTask }>("integrations/calendar/task", "POST", { taskId: task.id, action });
      setData((current) => ({ ...current, tasks: current.tasks.map((entry) => entry.id === task.id ? response.task : entry) }));
      announce(action === "sync" ? "Task synced to Google Calendar." : "Calendar event removed; the task is unchanged.");
    } catch (error) {
      announce(error instanceof Error ? error.message : "Calendar could not be updated.");
    }
  };

  const openGroupTasks = (scope: GroupTaskScope) => {
    setGroupTaskScope(scope);
    navigate("tasks");
  };
  const updateCollaboration = async (task: DashboardTask, payload: CollaborationPayload) => {
    if (isDemo || data.workspace.kind !== "GROUP") return false;
    setBusy(true);
    try {
      await api(`tasks/${task.id}/collaboration`, "POST", payload);
      await refreshSnapshot();
      setCollaborationTask(null);
      announce(payload.action === "handoff" ? "Handoff shared with the group." : "Assignment updated.");
      return true;
    } catch (error) {
      announce(error instanceof Error ? error.message : "Could not update that assignment.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openTasks = data.tasks.filter((task) => task.status === "OPEN");
  const todayTasks = openTasks.filter((task) => isToday(task.dueAt, data.user.timezone));
  const overdueTasks = openTasks.filter((task) => isOverdue(task, data.user.timezone));
  const focusTask = overdueTasks[0] ?? todayTasks[0] ?? openTasks[0];
  const groupManager = data.workspace.role === "OWNER" || data.workspace.role === "ADMIN";
  const navItems = data.workspace.kind === "GROUP"
    ? GROUP_NAV.filter((item) => item.id !== "settings" || groupManager)
    : PERSONAL_NAV;
  const workspaceNav = navItems.filter((item) => item.id !== "search" && item.id !== "settings");
  const manageNav = navItems.filter((item) => item.id === "search" || item.id === "settings");
  const groupOwnHeading = data.workspace.kind === "GROUP" && (["today", "schedule", "people", "progress", "activity", "library"] as DashboardView[]).includes(activeView);
  const showCaptureLaunch = !(["search", "settings", "schedule", "people", "progress", "activity"] as DashboardView[]).includes(activeView)
    && !(data.workspace.kind === "GROUP" && (["today", "tasks", "library"] as DashboardView[]).includes(activeView));
  const profileView: DashboardView = data.workspace.kind === "GROUP" ? (groupManager ? "settings" : "people") : "settings";

  return (
    <div className="tw-shell" style={{ "--accent": ACCENTS[accent] } as React.CSSProperties}>
      <aside className="tw-sidebar">
        <div className="tw-brand-row"><ThreadwiseMark /></div>
        <WorkspaceSwitcher current={data.workspace} workspaces={workspaces} disabled={isDemo} />
        <button className="tw-quick-button" onClick={() => setCaptureOpen(true)}><Plus size={17} /> {data.workspace.kind === "GROUP" ? "Add to group" : "Quick capture"} <kbd>N</kbd></button>
        <nav aria-label="Dashboard">
          <p>Workspace</p>
          {workspaceNav.map(({ id, label, icon: Icon }) => <button key={id} className={activeView === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === "tasks" && <em>{openTasks.length}</em>}</button>)}
          {manageNav.length > 0 && <p>{data.workspace.kind === "GROUP" ? "Tools" : "Manage"}</p>}
          {manageNav.map(({ id, label, icon: Icon }) => <button key={id} className={activeView === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span></button>)}
        </nav>
        <div className="tw-sidebar-foot">
          <button className="tw-telegram-state" data-state={syncState} onClick={() => void refreshSnapshot(true)} disabled={isDemo}>
            {syncState === "live" ? <Wifi size={16} /> : syncState === "offline" ? <WifiOff size={16} /> : <RefreshCw className="spin" size={16} />}
            <span><b>{isDemo ? "Demo workspace" : syncState === "live" ? "Telegram in sync" : syncState === "offline" ? "Sync offline" : "Reconnecting"}</b><small>{isDemo ? "Changes stay in this browser" : syncState === "live" ? `Updated ${formatRelativeSync(lastSyncedAt)}` : "Your saved view remains available"}</small></span>
          </button>
          <button onClick={() => navigate(profileView)} className="tw-profile"><span>{data.workspace.name[0]}</span><div><b>{data.workspace.name}</b><small>{data.workspace.kind === "GROUP" ? `${data.workspace.role.toLowerCase()} · shared` : `@${data.user.username ?? "threadwise"}`}</small></div><ChevronRight size={16} /></button>
        </div>
      </aside>

      <main className="tw-main">
        <header className="tw-topbar">
          <button className="tw-icon-button tw-menu-button" onClick={() => setMoreOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <span className="tw-mobile-brand"><ThreadwiseMark compact /></span>
          <div className="tw-mobile-workspace"><WorkspaceSwitcher current={data.workspace} workspaces={workspaces} disabled={isDemo} /></div>
          <div className="tw-crumb"><span>{data.workspace.kind === "GROUP" ? data.workspace.name : "Personal"}</span><ChevronRight size={12} /><b>{navItems.find((entry) => entry.id === activeView)?.label ?? "Library"}</b></div>
          <div className="tw-top-actions">
            {isDemo && <span className="tw-demo-pill">Demo · changes stay here</span>}
            <button className="tw-search-button" onClick={() => setPaletteOpen(true)}><Search size={16} /><span>Find anything</span><kbd>⌘ K</kbd></button>
            <button className="tw-icon-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Toggle theme">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
            <button className="tw-icon-button tw-avatar" onClick={() => navigate(profileView)} aria-label={data.workspace.kind === "GROUP" ? "Open group profile" : "Open settings"}>{data.workspace.name[0]}</button>
          </div>
        </header>

        <div className="tw-content" key={activeView}>
          {!groupOwnHeading && <PageHeading view={activeView} workspace={data.workspace} name={data.user.firstName} timezone={data.user.timezone} onAdd={() => setEditor({ kind: activeView === "notes" ? "note" : activeView === "ideas" ? "idea" : activeView === "expenses" ? "expense" : "task" })} />}
          {showCaptureLaunch && <button className="tw-capture-launch" onClick={() => setCaptureOpen(true)}><span><Sparkles size={20} /></span><div><b>Capture in plain language</b><small>“Remind me at 1.30pm”, a note, or an idea</small></div><kbd>N</kbd><ArrowRight size={18} /></button>}

          {activeView === "today" && (data.workspace.kind === "GROUP"
            ? <GroupOverview data={data} onOpenTasks={openGroupTasks} onOpenPeople={() => navigate("people")} onOpenActivity={() => navigate("activity")} onOpenSchedule={() => navigate("schedule")} onManageTask={setCollaborationTask} />
            : <TodayView data={data} focusTask={focusTask} overdue={overdueTasks.length} today={todayTasks.length} onToggle={toggleTask} onNavigate={navigate} onEdit={(task) => setEditor({ kind: "task", item: task })} isDemo={isDemo} />)}
          {activeView === "tasks" && (data.workspace.kind === "GROUP" && data.collaboration
            ? <GroupTasksView tasks={data.tasks} meetings={(data.scheduling?.polls ?? []).filter((poll) => poll.status === "FINALIZED")} collaboration={data.collaboration} scope={groupTaskScope} onScope={setGroupTaskScope} timezone={data.user.timezone} onToggle={toggleTask} onEdit={(task) => setEditor({ kind: "task", item: task })} onManage={setCollaborationTask} onOpenSchedule={() => navigate("schedule")} onAdd={() => setEditor({ kind: "task" })} pagination={pagination.tasks} onLoadMore={() => loadMore("tasks")} />
            : <TasksView tasks={data.tasks} timezone={data.user.timezone} onToggle={toggleTask} onEdit={(task) => setEditor({ kind: "task", item: task })} onPin={pinTask} onSnooze={snoozeTask} onCalendar={updateTaskCalendar} onArchive={(task) => removeEntity("task", task)} onAdd={() => setEditor({ kind: "task" })} pagination={pagination.tasks} onLoadMore={() => loadMore("tasks")} />)}
          {activeView === "people" && <GroupPeople data={data} onOpenTasks={openGroupTasks} />}
          {activeView === "schedule" && data.workspace.kind === "GROUP" && <GroupSchedulingView polls={data.scheduling?.polls ?? []} timezone={data.user.timezone} generatedAt={data.generatedAt} manager={groupManager} isDemo={isDemo} initialPoll={initialPoll} openCreate={openScheduleCreate} onChanged={() => refreshSnapshot(true)} announce={announce} />}
          {activeView === "progress" && <GroupProgress data={data} onManageTask={setCollaborationTask} />}
          {activeView === "activity" && <GroupActivityView data={data} />}
          {activeView === "notes" && <PhaseTwoNotesView notes={data.notes} timezone={data.user.timezone} onEdit={(note) => setEditor({ kind: "note", item: note })} onPin={(note) => void toggleCollectionPin("note", note)} onDelete={(note) => removeEntity("note", note)} onBatchDelete={removeNotes} pagination={pagination.notes} onLoadMore={() => loadMore("notes")} />}
          {activeView === "ideas" && <PhaseTwoIdeasView ideas={data.ideas} timezone={data.user.timezone} onEdit={(idea) => setEditor({ kind: "idea", item: idea })} onPin={(idea) => void toggleCollectionPin("idea", idea)} onArchive={(idea) => removeEntity("idea", idea)} onAnalyze={(idea) => void analyzeIdea(idea)} onConvert={convertIdea} pagination={pagination.ideas} onLoadMore={() => loadMore("ideas")} />}
          {activeView === "images" && <PhaseTwoImagesView images={data.images} timezone={data.user.timezone} isDemo={isDemo} onEdit={(image) => setEditor({ kind: "image", item: image })} onPin={(image) => void toggleCollectionPin("image", image)} onDelete={(image) => removeEntity("image", image)} onBatchDelete={removeImages} onCreateNote={(image) => setEditor({ kind: "note", seed: image.ocrText || image.caption || "" })} pagination={pagination.images} onLoadMore={() => loadMore("images")} />}
          {activeView === "expenses" && data.workspace.kind === "PERSONAL" && <PhaseTwoExpensesView expenses={data.expenses} timezone={data.user.timezone} currency={data.settings.expenseCurrency} integration={data.integrations.find((item) => item.name === "Excel")} onConnect={() => void (data.integrations.find((item) => item.provider === "excel")?.state === "attention" ? createExcelWorkbook() : connectIntegration("excel"))} onSync={syncExpenses} onEdit={(expense) => setEditor({ kind: "expense", item: expense })} onAdd={() => setEditor({ kind: "expense" })} pagination={pagination.expenses} onLoadMore={() => loadMore("expenses")} announce={announce} />}
          {activeView === "library" && (data.workspace.kind === "GROUP"
            ? <GroupResources data={data} onOpen={(view) => navigate(view)} onAdd={() => setCaptureOpen(true)} />
            : <LibraryView data={data} tab={libraryTab} onTab={setLibraryTab} onNavigate={navigate} isDemo={isDemo} />)}
          {activeView === "search" && <SearchView data={data} isDemo={isDemo} allowExpenses={false} onOpen={(kind) => navigate(kind === "task" ? "tasks" : kind === "image" ? "images" : kind === "expense" ? "today" : `${kind}s` as DashboardView)} announce={announce} />}
          {activeView === "settings" && (data.workspace.kind === "GROUP"
            ? <GroupSettingsView data={data} workspace={data.workspace} onSave={(settings) => setData((current) => ({ ...current, settings }))} announce={announce} />
            : <SettingsView data={data} isDemo={isDemo} accent={accent} onAccent={setAccent} onSave={(settings) => setData((current) => ({ ...current, settings }))} onConnect={connectIntegration} onSyncCalendar={syncCalendarTasks} onSyncExcel={syncExpenses} onCreateExcel={createExcelWorkbook} onAutoSync={setIntegrationAutoSync} onRefresh={() => refreshSnapshot()} announce={announce} />)}
        </div>
      </main>

      <nav className="tw-mobile-nav" aria-label="Mobile dashboard">
        <button className={activeView === "today" ? "active" : ""} onClick={() => navigate("today")}><Inbox size={20} /><span>{data.workspace.kind === "GROUP" ? "Overview" : "Today"}</span></button>
        <button className={activeView === "tasks" ? "active" : ""} onClick={() => navigate("tasks")}><ListChecks size={20} /><span>{data.workspace.kind === "GROUP" ? "Work" : "Tasks"}</span></button>
        <button className="capture" onClick={() => setCaptureOpen(true)} aria-label="Capture something"><Plus size={25} /></button>
        {data.workspace.kind === "GROUP"
          ? <button className={activeView === "schedule" ? "active" : ""} onClick={() => navigate("schedule")}><CalendarDays size={20} /><span>Find time</span></button>
          : <button className={["library", "notes", "ideas", "images"].includes(activeView) ? "active" : ""} onClick={() => navigate("library")}><BookOpen size={20} /><span>Library</span></button>}
        <button className={moreOpen ? "active" : ""} onClick={() => setMoreOpen(true)}><Menu size={20} /><span>More</span></button>
      </nav>

      {editor && <EntityEditor state={editor} busy={busy} currency={data.settings.expenseCurrency} timezone={data.user.timezone} onClose={() => setEditor(null)} onSave={saveEntity} onDelete={removeEntity} onConvert={convertIdea} />}
      {captureOpen && <CaptureComposer isDemo={isDemo} timezone={data.user.timezone} currency={data.settings.expenseCurrency} allowExpenses={false} groupName={data.workspace.kind === "GROUP" ? data.workspace.name : undefined} onClose={() => setCaptureOpen(false)} onSave={saveEntity} announce={announce} />}
      {paletteOpen && <CommandPalette data={data} items={navItems} onClose={() => setPaletteOpen(false)} onNavigate={(view) => { navigate(view); setPaletteOpen(false); }} />}
      {moreOpen && <MobileMore activeView={activeView} items={navItems} onClose={() => setMoreOpen(false)} onNavigate={navigate} />}
      {ideaBrief && <PhaseTwoIdeaBriefDialog state={ideaBrief} onClose={() => setIdeaBrief(null)} onRefresh={() => void analyzeIdea(ideaBrief.idea, true)} />}
      {collaborationTask && data.collaboration && <TaskCollaborationSheet task={collaborationTask} collaboration={data.collaboration} manager={data.workspace.role !== "MEMBER"} busy={busy} onClose={() => setCollaborationTask(null)} onAction={(payload) => updateCollaboration(collaborationTask, payload)} />}
      {toast && <div className="tw-toast" role="status"><CheckCircle2 size={16} />{toast}</div>}
    </div>
  );
}

function WorkspaceSwitcher({ current, workspaces, disabled }: { current: DashboardWorkspace; workspaces: DashboardWorkspace[]; disabled?: boolean }) {
  const choices = workspaces.some((workspace) => workspace.id === current.id) ? workspaces : [current, ...workspaces];
  return <label className="tw-workspace-switcher">
    <span>{current.kind === "GROUP" ? "Shared group" : "Your workspace"}</span>
    <select
      value={current.id}
      disabled={disabled}
      aria-label="Switch Threadwise workspace"
      onChange={(event) => window.location.assign(`/api/workspace/select?workspace=${encodeURIComponent(event.target.value)}&next=/dashboard`)}
    >
      {choices.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.kind === "GROUP" ? "Group · " : "Personal · "}{workspace.name}</option>)}
    </select>
  </label>;
}

function PageHeading({ view, workspace, name, timezone, onAdd }: { view: DashboardView; workspace: DashboardWorkspace; name: string; timezone: string; onAdd: () => void }) {
  const hour = Number(new Intl.DateTimeFormat("en-SG", { hour: "2-digit", hour12: false, timeZone: timezone }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const copy: Record<DashboardView, [string, string]> = {
    today: workspace.kind === "GROUP" ? [workspace.name, "One live shared view of what the group is carrying."] : [`${greeting}, ${name}.`, "One calm view of what matters now."], tasks: [workspace.kind === "GROUP" ? "Work" : "Tasks", workspace.kind === "GROUP" ? "Shared work, assignees, and reminders in one thread." : "Things to do, reminders when they matter."],
    schedule: ["Find a time", "Agree on a time without leaving the group."],
    people: ["People", ""],
    progress: ["Progress", ""],
    activity: ["Activity", ""],
    library: [workspace.kind === "GROUP" ? "Resources" : "Library", workspace.kind === "GROUP" ? "Shared notes, ideas, and visual references in one place." : "Notes, ideas, and images—kept together."], notes: [workspace.kind === "GROUP" ? "Shared notes" : "Notes", "Useful things worth keeping."],
    ideas: [workspace.kind === "GROUP" ? "Shared ideas" : "Ideas", "Small sparks, ready when you are."], images: [workspace.kind === "GROUP" ? "Shared images" : "Images", "Every saved frame, easy to find again."],
    expenses: ["Expenses", "A clear view of what moved."], search: ["Search everything", "Tasks, notes, ideas, and images."],
    settings: workspace.kind === "GROUP" ? ["Manage group", "Shared defaults and role-gated controls."] : ["Settings", "Make Threadwise work the way you do."],
  };
  const canAdd = ["tasks", "notes", "ideas"].includes(view);
  return <div className="tw-heading"><div><p>{new Intl.DateTimeFormat("en-SG", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(new Date())}</p><h1>{copy[view][0]}</h1><span>{copy[view][1]}</span></div>{canAdd && <button className="tw-primary" onClick={onAdd}><Plus size={17} /> Add {view.slice(0, -1)}</button>}</div>;
}

function TodayView({ data, focusTask, overdue, today, onToggle, onNavigate, onEdit, isDemo }: { data: DashboardSnapshot; focusTask?: DashboardTask; overdue: number; today: number; onToggle: (task: DashboardTask) => void; onNavigate: (view: DashboardView) => void; onEdit: (task: DashboardTask) => void; isDemo: boolean }) {
  const open = data.tasks.filter((task) => task.status === "OPEN");
  const groups = threadlineBuckets(open, data.user.timezone);
  const recent = [...data.notes.map((item) => ({ ...item, kind: "note" as const })), ...data.ideas.map((item) => ({ ...item, kind: "idea" as const }))].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 4);
  const month = calendarKey(new Date(), data.user.timezone).slice(0, 7);
  const thisMonth = open.filter((task) => task.dueAt && calendarKey(task.dueAt, data.user.timezone).startsWith(month)).length;
  return <div className="tw-today-grid">
    <section className="tw-card tw-focus-card">
      <div className="tw-card-head"><span><span className="tw-thread-cue" aria-hidden="true"><i /><i /></span> One thing at a time</span><button onClick={() => onNavigate("tasks")}>Open tasks <ArrowRight size={15} /></button></div>
      {focusTask ? <div className="tw-focus-body"><div><span className={isOverdue(focusTask, data.user.timezone) ? "tw-overdue-chip" : "tw-soft-chip"}>{isOverdue(focusTask, data.user.timezone) ? "Overdue" : isToday(focusTask.dueAt, data.user.timezone) ? "Today" : "Next"}</span><h2>{focusTask.title}</h2>{focusTask.description && <p>{focusTask.description}</p>}<div className="tw-meta">{focusTask.dueAt && <span><Clock3 size={15} />{formatDate(focusTask.dueAt, data.user.timezone, { weekday: "short" })}, {formatTime(focusTask.dueAt, data.user.timezone)}</span>}{focusTask.nextReminderAt && <span><Bell size={15} />Reminder active</span>}</div></div><div><button className="tw-primary" onClick={() => onToggle(focusTask)}><Check size={18} /> Complete</button><button className="tw-quiet" onClick={() => onEdit(focusTask)}><Pencil size={16} /> Edit</button></div></div> : <Empty icon={CheckCircle2} mascot title="You are all clear." copy="Nothing needs your attention right now." />}
      <span className="tw-orbit" aria-hidden="true" />
    </section>
    <aside className="tw-day-pulse"><div><span>Overdue</span><b>{overdue}</b><small>{overdue ? "Needs a decision" : "Nothing trailing"}</small></div><div><span>Today</span><b>{today}</b><small>On today’s thread</small></div><div><span>This month</span><b>{thisMonth}</b><small>Dated ahead</small></div></aside>
    <Threadline groups={groups} timezone={data.user.timezone} onToggle={onToggle} onEdit={onEdit} onOpenTasks={() => onNavigate("tasks")} />
    <section className="tw-card tw-recent-cards"><div className="tw-section-head"><div><span>Recently captured</span><h3>Still warm</h3></div><button onClick={() => onNavigate("library")}>Open library <ArrowRight size={16} /></button></div><div>{recent.map((item, index) => <button key={item.id} style={{ "--recent-index": index } as React.CSSProperties} onClick={() => onNavigate(item.kind === "note" ? "notes" : "ideas")}><span className={item.kind}>{item.kind === "note" ? <FileText size={17} /> : <Lightbulb size={17} />}</span><small>{item.kind}</small><b>{item.title}</b><p>{item.kind === "note" ? item.summary : item.concept}</p><ArrowRight size={16} /></button>)}</div></section>
    <section className="tw-card tw-gallery-peek"><div className="tw-section-head"><div><span>Saved images</span><h3>Recent frames</h3></div><button onClick={() => onNavigate("images")}><ArrowRight size={17} /></button></div><div>{data.images.slice(0, 4).map((image, index) => <button key={image.id} onClick={() => onNavigate("images")}><img src={isDemo ? `/demo/${DEMO_IMAGES[index % DEMO_IMAGES.length]}` : `/api/threadwise/images/${encodeURIComponent(image.id)}/content`} alt={image.caption ?? image.fileName ?? "Saved image"} /></button>)}{!data.images.length && <Empty icon={ImageIcon} title="No saved images yet." copy="Send an image to Threadwise in Telegram." />}</div></section>
  </div>;
}

type ThreadlineGroup = { id: string; label: string; description: string; tasks: DashboardTask[] };

function threadlineBuckets(tasks: DashboardTask[], timezone: string): ThreadlineGroup[] {
  const todayKey = calendarKey(new Date(), timezone);
  const month = todayKey.slice(0, 7);
  const todayNumber = Date.UTC(...todayKey.split("-").map(Number).map((value, index) => index === 1 ? value - 1 : value) as [number, number, number]);
  const groups: ThreadlineGroup[] = [
    { id: "overdue", label: "Overdue", description: "Decide, reschedule, or clear", tasks: [] },
    { id: "today", label: "Today", description: "The active thread", tasks: [] },
    { id: "week", label: "Next 7 days", description: "Coming into view", tasks: [] },
    { id: "month", label: "Later this month", description: "Planned, not urgent", tasks: [] },
    { id: "later", label: "Later", description: "Beyond this month", tasks: [] },
    { id: "someday", label: "Someday", description: "No date yet", tasks: [] },
  ];
  for (const task of tasks) {
    if (!task.dueAt) { groups[5]!.tasks.push(task); continue; }
    const dueKey = calendarKey(task.dueAt, timezone);
    const dueNumber = Date.UTC(...dueKey.split("-").map(Number).map((value, index) => index === 1 ? value - 1 : value) as [number, number, number]);
    const days = Math.round((dueNumber - todayNumber) / 86_400_000);
    if (isOverdue(task, timezone)) groups[0]!.tasks.push(task);
    else if (dueKey === todayKey) groups[1]!.tasks.push(task);
    else if (days <= 7) groups[2]!.tasks.push(task);
    else if (dueKey.startsWith(month)) groups[3]!.tasks.push(task);
    else groups[4]!.tasks.push(task);
  }
  for (const group of groups) group.tasks.sort((a, b) => +(new Date(a.dueAt ?? a.createdAt ?? 0)) - +(new Date(b.dueAt ?? b.createdAt ?? 0)));
  return groups;
}

function Threadline({ groups, timezone, onToggle, onEdit, onOpenTasks }: { groups: ThreadlineGroup[]; timezone: string; onToggle: (task: DashboardTask) => void; onEdit: (task: DashboardTask) => void; onOpenTasks: () => void }) {
  const visible = groups.filter((group) => group.tasks.length);
  return <section className="tw-card tw-threadline"><div className="tw-section-head"><div><span>Your threadline</span><h3>From now to someday</h3><p>Tasks grouped by when they need your attention.</p></div><button onClick={onOpenTasks}>See every task <ArrowRight size={16} /></button></div>{visible.length ? <div className="tw-threadline-groups">{visible.map((group) => <section key={group.id} data-group={group.id}><header><div><h4>{group.label}</h4><small>{group.description}</small></div><em>{group.tasks.length}</em></header><div>{group.tasks.slice(0, 4).map((task) => <article key={task.id}><button className="tw-thread-check" onClick={() => onToggle(task)} aria-label={`Complete ${task.title}`}><Check size={14} /></button><button onClick={() => onEdit(task)}><b>{task.title}</b><small>{task.dueAt ? `${formatDate(task.dueAt, timezone, { weekday: "short" })} · ${formatTime(task.dueAt, timezone)}` : "No due date"}</small></button></article>)}</div>{group.tasks.length > 4 && <button className="tw-thread-more" onClick={onOpenTasks}>+{group.tasks.length - 4} more</button>}</section>)}</div> : <Empty icon={CalendarDays} title="Your threadline is clear." copy="Add a task with or without a due date; it will land in the right place." />}</section>;
}

function TasksView({ tasks, timezone, onToggle, onEdit, onPin, onSnooze, onCalendar, onArchive, onAdd, pagination, onLoadMore }: { tasks: DashboardTask[]; timezone: string; onToggle: (task: DashboardTask) => void; onEdit: (task: DashboardTask) => void; onPin: (task: DashboardTask) => void; onSnooze: (task: DashboardTask) => void; onCalendar: (task: DashboardTask, action: "sync" | "remove") => Promise<void>; onArchive: (task: DashboardTask) => Promise<boolean>; onAdd: () => void; pagination: PaginationState["tasks"]; onLoadMore: () => void }) {
  const [filter, setFilter] = useState<"today" | "upcoming" | "all" | "done">("all");
  const [sort, setSort] = useState<"newest" | "due" | "oldest">("newest");
  const [query, setQuery] = useState("");
  const menu = useActionMenu<DashboardTask>();
  const visible = tasks.filter((task) => {
    if (!`${task.title} ${task.description ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "done") return task.status === "DONE";
    if (task.status !== "OPEN") return false;
    if (filter === "today") return isToday(task.dueAt, timezone);
    if (filter === "upcoming") return Boolean(task.dueAt && !isToday(task.dueAt, timezone) && !isOverdue(task, timezone));
    return true;
  }).sort((a, b) => {
    const pinned = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinned) return pinned;
    if (sort === "due") return +(new Date(a.dueAt ?? "2999-12-31")) - +(new Date(b.dueAt ?? "2999-12-31"));
    const aCreated = +(new Date(a.createdAt ?? a.updatedAt ?? 0));
    const bCreated = +(new Date(b.createdAt ?? b.updatedAt ?? 0));
    return sort === "oldest" ? aCreated - bCreated : bCreated - aCreated;
  });
  return <section className="tw-task-board"><div className="tw-task-toolbar"><div className="tw-segmented">{(["today", "upcoming", "all", "done"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "done" ? "Completed" : item[0].toUpperCase() + item.slice(1)}</button>)}</div><label className="tw-task-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter tasks as you type" /></label><label className="tw-task-sort">Sort<select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="newest">Newest first</option><option value="due">Due date</option><option value="oldest">Oldest first</option></select></label></div><div className="tw-task-card-list">{visible.map((task, index) => <article className={`tw-task-card ${task.status === "DONE" ? "done" : ""}`} style={{ "--task-index": index } as React.CSSProperties} key={task.id} onContextMenu={(event) => menu.open(event, task)}><button className="tw-task-check" onClick={() => onToggle(task)} aria-label={task.status === "DONE" ? `Restore ${task.title}` : `Complete ${task.title}`}><Check size={17} /></button><button className="tw-task-copy" onClick={() => onEdit(task)}><span><em>{task.publicId}</em>{task.pinned && <i><Pin size={13} /> Pinned</i>}{task.snoozedUntil && <i><Clock3 size={13} /> Snoozed</i>}{task.calendarEventId && <i><CalendarDays size={13} /> Calendar</i>}</span><h3>{task.title}</h3><p>{task.description ?? (task.nextReminderAt ? "A reminder is active for this task." : "No extra details yet.")}</p></button><div className={`tw-task-date ${isOverdue(task, timezone) ? "overdue" : ""}`}><CalendarDays size={16} /><span><b>{task.dueAt ? formatDate(task.dueAt, timezone, { weekday: "short", year: "numeric" }) : "No due date"}</b><small>{task.dueAt ? formatTime(task.dueAt, timezone) : "Keep it flexible"}</small></span></div><button className="tw-task-menu" onClick={(event) => menu.open(event, task)} aria-label={`Actions for ${task.title}`} aria-haspopup="menu"><MoreHorizontal size={20} /></button></article>)}{!visible.length && <Empty icon={ListChecks} title="Nothing in this view." copy={filter === "done" ? "Completed tasks will collect here." : "Change the view or add a new task."} action="Add task" onAction={onAdd} />}</div><LoadMore state={pagination} onLoadMore={onLoadMore} />{menu.menu && <TaskContextMenu state={menu.menu} onClose={menu.close} onToggle={onToggle} onEdit={onEdit} onPin={onPin} onSnooze={onSnooze} onCalendar={onCalendar} onArchive={onArchive} />}</section>;
}

function TaskContextMenu({ state, onClose, onToggle, onEdit, onPin, onSnooze, onCalendar, onArchive }: { state: ActionMenuState<DashboardTask>; onClose: () => void; onToggle: (task: DashboardTask) => void; onEdit: (task: DashboardTask) => void; onPin: (task: DashboardTask) => void; onSnooze: (task: DashboardTask) => void; onCalendar: (task: DashboardTask, action: "sync" | "remove") => Promise<void>; onArchive: (task: DashboardTask) => Promise<boolean> }) {
  const task = state.item;
  const actions: ActionMenuAction[] = [
    { label: "Edit task", icon: <Pencil size={16} />, onSelect: () => onEdit(task) },
    { label: task.status === "DONE" ? "Restore task" : "Complete task", icon: <CheckCircle2 size={16} />, onSelect: () => onToggle(task) },
    { label: task.pinned ? "Unpin task" : "Pin to top", icon: <Pin size={16} />, onSelect: () => onPin(task) },
    ...(task.status === "OPEN" ? [{ label: "Snooze 1 hour", icon: <Clock3 size={16} />, onSelect: () => onSnooze(task) }] : []),
    ...(task.calendarEventUrl ? [{ label: "Open Calendar event", icon: <ExternalLink size={16} />, onSelect: () => window.open(task.calendarEventUrl, "_blank", "noopener,noreferrer") }] : []),
    ...(task.dueAt ? [{ label: task.calendarEventId ? "Remove from Calendar" : "Add to Calendar", icon: <CalendarDays size={16} />, onSelect: () => void onCalendar(task, task.calendarEventId ? "remove" : "sync") }] : []),
    { label: "separator", icon: null, onSelect: () => undefined },
    { label: "Archive task", icon: <Archive size={16} />, danger: true, onSelect: () => void onArchive(task) },
  ];
  return <ActionMenu state={state} label={task.publicId} actions={actions} onClose={onClose} />;
}

// Retained temporarily as a rollback reference until Phase 2 has completed its visual gate.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function NotesView({ notes, timezone, onEdit, pagination, onLoadMore }: { notes: DashboardNote[]; timezone: string; onEdit: (note: DashboardNote) => void; pagination: PaginationState["notes"]; onLoadMore: () => void }) {
  const [query, setQuery] = useState(""); const visible = notes.filter((note) => `${note.title} ${note.summary} ${note.body ?? ""} ${note.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="tw-collection"><CollectionSearch value={query} onChange={setQuery} placeholder="Search notes and tags" /><div className="tw-card-grid">{visible.map((note) => <button className="tw-note-card" key={note.id} onClick={() => onEdit(note)}>{note.pinned && <Pin className="tw-pin" size={15} />}<span><FileText size={14} /> Note</span><h3>{note.title}</h3><p>{note.body || note.summary}</p><div>{note.tags.map((tag) => <em key={tag}>#{tag}</em>)}</div><footer><time>{formatDate(note.createdAt, timezone, { year: "numeric" })}</time><span>Edit <ArrowRight size={14} /></span></footer></button>)}</div>{!visible.length && <Empty icon={FileText} title="No notes found." copy="Try a different phrase or capture a new note." />}<LoadMore state={pagination} onLoadMore={onLoadMore} /></section>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function IdeasView({ ideas, timezone, onEdit, onConvert, pagination, onLoadMore }: { ideas: DashboardIdea[]; timezone: string; onEdit: (idea: DashboardIdea) => void; onConvert: (idea: DashboardIdea) => void; pagination: PaginationState["ideas"]; onLoadMore: () => void }) {
  const [status, setStatus] = useState<"ALL" | IdeaStatus>("ALL"); const visible = ideas.filter((idea) => status === "ALL" || idea.status === status);
  return <section className="tw-collection"><div className="tw-toolbar"><div className="tw-segmented"><button className={status === "ALL" ? "active" : ""} onClick={() => setStatus("ALL")}>All</button>{["RAW", "PROTOTYPING", "BUILT"].map((item) => <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item as IdeaStatus)}>{item.toLowerCase()}</button>)}</div></div><div className="tw-card-grid">{visible.map((idea) => <article className="tw-idea-card" key={idea.id}><button className="tw-idea-main" onClick={() => onEdit(idea)}><div><span><Lightbulb size={14} /> Idea</span><em>{idea.status.toLowerCase()}</em></div><h3>{idea.title}</h3><p>{idea.concept}</p><div className="tw-tags">{idea.tags.map((tag) => <i key={tag}>#{tag}</i>)}</div><footer>{formatDate(idea.createdAt, timezone, { year: "numeric" })}<span>Edit <ArrowRight size={14} /></span></footer></button>{!(["BUILT", "REJECTED"] as IdeaStatus[]).includes(idea.status) && <button className="tw-convert" onClick={() => onConvert(idea)}><Zap size={14} /> Turn into task</button>}</article>)}</div>{!visible.length && <Empty icon={Lightbulb} title="No ideas in this stage." copy="Every useful project starts as a small spark." />}<LoadMore state={pagination} onLoadMore={onLoadMore} /></section>;
}

function imageSrc(image: DashboardImage, isDemo: boolean, index = 0) { return isDemo ? `/demo/${image.fileName && DEMO_IMAGES.includes(image.fileName) ? image.fileName : DEMO_IMAGES[index % DEMO_IMAGES.length]}` : `/api/threadwise/images/${encodeURIComponent(image.id)}/content`; }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

function SearchView({ data, isDemo, allowExpenses, onOpen, announce }: { data: DashboardSnapshot; isDemo: boolean; allowExpenses: boolean; onOpen: (kind: SearchResult["kind"]) => void; announce: (message: string) => void }) {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<SearchResult[]>([]); const [loading, setLoading] = useState(false); const [kind, setKind] = useState<"all" | SearchResult["kind"]>("all"); const searchRequest = useRef(0);
  const local = useMemo(() => { const q = query.toLowerCase().trim(); if (!q) return []; return [
    ...data.tasks.map((item) => ({ id: item.id, publicId: item.publicId, kind: "task" as const, title: item.title, excerpt: item.description })),
    ...data.notes.map((item) => ({ id: item.id, publicId: item.publicId, kind: "note" as const, title: item.title, excerpt: item.body || item.summary })),
    ...data.ideas.map((item) => ({ id: item.id, publicId: item.publicId, kind: "idea" as const, title: item.title, excerpt: item.concept })),
    ...data.images.map((item) => ({ id: item.id, publicId: item.publicId, kind: "image" as const, title: item.caption || item.fileName || "Saved image", excerpt: item.ocrText })),
    ...(allowExpenses ? data.expenses.map((item) => ({ id: item.id, publicId: item.publicId, kind: "expense" as const, title: item.merchant || item.description, excerpt: `${item.description} ${item.category ?? ""}` })) : []),
  ].filter((item) => `${item.title} ${item.excerpt ?? ""}`.toLowerCase().includes(q)).slice(0, 30); }, [allowExpenses, data, query]);
  useEffect(() => {
    const value = query.trim();
    const request = ++searchRequest.current;
    const timer = window.setTimeout(() => {
      if (!value) { setResults([]); setLoading(false); return; }
      if (isDemo) { setResults(local); setLoading(false); return; }
      setLoading(true);
      void api<{ results?: SearchResult[]; items?: SearchResult[] }>(`search?q=${encodeURIComponent(value)}&limit=50`)
        .then((body) => { if (request === searchRequest.current) setResults(body.results ?? body.items ?? []); })
        .catch((error) => { if (request === searchRequest.current) { setResults([]); announce(error instanceof Error ? error.message : "Search could not be completed."); } })
        .finally(() => { if (request === searchRequest.current) setLoading(false); });
    }, value ? 220 : 0);
    return () => window.clearTimeout(timer);
  // `announce` is intentionally omitted so a toast does not repeat the query.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isDemo, local]);
  const eligibleResults = allowExpenses ? results : results.filter((result) => result.kind !== "expense");
  const allShown = eligibleResults.length || !isDemo ? eligibleResults : local;
  const shown = kind === "all" ? allShown : allShown.filter((result) => result.kind === kind);
  const filters: Array<"all" | SearchResult["kind"]> = ["all", "task", "note", "idea", "image", ...(allowExpenses ? ["expense" as const] : [])];
  return <section className="tw-search-view tw-search-live">
    <div className="tw-search-live-box"><Search size={22} /><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setResults([]); }} placeholder="Search while you type…" />{loading ? <LoaderCircle className="spin" size={18} /> : query ? <span>{shown.length} {shown.length === 1 ? "match" : "matches"}</span> : <kbd>LIVE</kbd>}</div>
    <div className="tw-search-filters" aria-label="Filter search results">{filters.map((filter) => <button key={filter} className={kind === filter ? "active" : ""} onClick={() => setKind(filter)}>{filter === "all" ? "Everything" : `${filter}s`}</button>)}</div>
    <div className="tw-search-results" aria-live="polite">{query && shown.map((result) => <button key={`${result.kind}-${result.id}`} onClick={() => onOpen(result.kind)}><span className={result.kind}>{result.kind === "task" ? <ListChecks size={18} /> : result.kind === "note" ? <FileText size={18} /> : result.kind === "idea" ? <Lightbulb size={18} /> : result.kind === "image" ? <ImageIcon size={18} /> : <CircleDollarSign size={18} />}</span><div><b>{result.title}</b><small>{result.excerpt || result.publicId}</small></div><em>{result.kind}</em><ArrowRight size={17} /></button>)}{query && shown.length === 0 && !loading && <Empty icon={Search} title="Nothing matched." copy="Try fewer words, a filename, a tag, or text from an image." />}{!query && <div className="tw-search-prompt"><Search size={28} /><h2>Start typing to search.</h2></div>}</div>
  </section>;
}

/* Historical pre-tab settings view retained only as source context during this release.
function LegacySettingsView({ data, isDemo, accent, onAccent, onSave, onDisconnect, announce }: { data: DashboardSnapshot; isDemo: boolean; accent: keyof typeof ACCENTS; onAccent: (value: keyof typeof ACCENTS) => void; onSave: (value: DashboardSettings) => void; onDisconnect: (provider: "gmail" | "calendar" | "excel") => void; announce: (message: string) => void }) {
  const [settings, setSettings] = useState(data.settings); const [saving, setSaving] = useState(false); const [confirmation, setConfirmation] = useState("");
  const save = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { const payload = { ...settings, quietHoursStart: settings.quietHoursStart || null, quietHoursEnd: settings.quietHoursEnd || null }; const saved = isDemo ? settings : asPayload<DashboardSettings>(await api("settings", "PATCH", payload), "settings"); onSave(saved); announce("Settings saved."); } catch (error) { announce(error instanceof Error ? error.message : "Could not save settings."); } finally { setSaving(false); } };
  const disconnect = async (provider: "gmail" | "calendar" | "excel") => { try { if (!isDemo) await api(`integrations/${provider}/disconnect`, "POST", {}); onDisconnect(provider); announce(isDemo ? "Disconnected in this demo." : `${provider} disconnected.`); } catch (error) { announce(error instanceof Error ? error.message : "Could not disconnect."); } };
  const exportData = async () => { try { if (isDemo) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "threadwise-demo-export.json"; a.click(); URL.revokeObjectURL(url); } else { const response = await fetch("/api/threadwise/privacy/export", { cache: "no-store" }); if (!response.ok) throw new Error("Export could not be prepared."); const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "threadwise-export.json"; a.click(); URL.revokeObjectURL(url); } announce("Your export is ready."); } catch (error) { announce(error instanceof Error ? error.message : "Could not export data."); } };
  const deleteAccount = async () => { if (confirmation !== "DELETE MY THREADWISE DATA") return; if (!window.confirm("This permanently deletes your Threadwise account and saved content. Continue?")) return; try { if (!isDemo) await api("privacy/account", "DELETE", { confirmation }); if (isDemo) announce("Account deletion is disabled in the demo."); else window.location.assign("/"); } catch (error) { announce(error instanceof Error ? error.message : "Could not delete account."); } };
  return <div className="tw-settings-grid"><section className="tw-settings-main"><div className="tw-settings-section"><div><span>Preferences</span><h2>How Threadwise works</h2><p>These settings apply in Telegram and on the web.</p></div><form onSubmit={save}><label>Timezone<input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} /></label><div className="tw-form-row"><label>Default reminder interval<select value={settings.reminderIntervalMinutes} onChange={(e) => setSettings({ ...settings, reminderIntervalMinutes: Number(e.target.value) })}><option value="60">1 hour</option><option value="180">3 hours</option><option value="360">6 hours</option><option value="1440">1 day</option></select></label><label>Reminder style<select value={settings.reminderMode} onChange={(e) => setSettings({ ...settings, reminderMode: e.target.value as DashboardSettings["reminderMode"] })}><option value="INDIVIDUAL">Individual</option><option value="DIGEST">Digest</option></select></label></div><div className="tw-form-row"><label>Quiet hours start<input type="time" value={settings.quietHoursStart ?? ""} onChange={(e) => setSettings({ ...settings, quietHoursStart: e.target.value || undefined })} /></label><label>Quiet hours end<input type="time" value={settings.quietHoursEnd ?? ""} onChange={(e) => setSettings({ ...settings, quietHoursEnd: e.target.value || undefined })} /></label></div><label className="tw-switch"><span><b>Private assignee nudges</b><small>Send direct reminders only to the private chat of someone assigned to a task.</small></span><input type="checkbox" checked={settings.directNudgesEnabled} onChange={(e) => setSettings({ ...settings, directNudgesEnabled: e.target.checked })} /></label><button className="tw-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Save preferences</button></form></div><div className="tw-settings-section"><div><span>Integrations</span><h2>Connected services</h2><p>Provider tokens are encrypted before storage.</p></div><div className="tw-integration-list">{data.integrations.map((item) => { const provider = (item.provider ?? item.name.toLowerCase()) as "gmail" | "calendar" | "excel"; return <article key={item.name}><span>{item.name[0]}</span><div><b>{item.name}</b><small>{item.detail}</small></div><em className={item.state}>{item.state}</em>{item.state === "connected" ? <button onClick={() => disconnect(provider)}><Unplug size={15} /> Disconnect</button> : item.connectUrl ? <a href={item.connectUrl}>Connect <ExternalLink size={14} /></a> : <button disabled>Connect in Telegram</button>}</article>; })}</div></div><div className="tw-settings-section tw-danger-zone"><div><span>Data &amp; privacy</span><h2>Your data, your decision</h2><p>Export a readable copy or permanently remove your account.</p></div><button className="tw-secondary" onClick={exportData}><Download size={16} /> Export my data</button><label>To delete everything, type <b>DELETE MY THREADWISE DATA</b><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label><button className="tw-danger" disabled={confirmation !== "DELETE MY THREADWISE DATA"} onClick={deleteAccount}><Trash2 size={16} /> Delete account and data</button></div></section><aside className="tw-settings-side"><section><span>Appearance</span><h3>Make it yours</h3><div className="tw-accent-row">{(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((color) => <button key={color} className={accent === color ? "active" : ""} style={{ background: ACCENTS[color] }} onClick={() => onAccent(color)} aria-label={`Use ${color} accent`} />)}</div></section><section className="tw-privacy-card"><ShieldCheck size={23} /><h3>What “private” means here</h3><p>Telegram authenticates you; Threadwise never receives your Telegram password. Every request is scoped to your Telegram account.</p><p>Your content is <b>not end-to-end encrypted</b>. A small number of authorized production operators can technically access stored content when needed to run or secure the service.</p><p>OAuth tokens are encrypted before storage. If you use AI features, only the relevant content may be sent to the configured AI provider.</p><a href="/privacy">Read the full privacy explanation <ArrowRight size={14} /></a></section><form action="/api/auth/logout" method="post"><button className="tw-secondary" type="submit"><LogOut size={16} /> Sign out</button></form></aside></div>;
}

*/

function GroupSettingsView({ data, workspace, onSave, announce }: { data: DashboardSnapshot; workspace: DashboardWorkspace; onSave: (value: DashboardSettings) => void; announce: (message: string) => void }) {
  const [settings, setSettings] = useState(data.settings);
  const [saving, setSaving] = useState(false);
  const canManage = workspace.role === "OWNER" || workspace.role === "ADMIN";
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      const payload = { ...settings, quietHoursStart: settings.quietHoursStart || null, quietHoursEnd: settings.quietHoursEnd || null };
      const saved = asPayload<DashboardSettings>(await api("settings", "PATCH", payload), "settings");
      onSave(saved);
      announce("Shared settings updated for the group.");
    } catch (error) {
      announce(error instanceof Error ? error.message : "Could not save group settings.");
    } finally {
      setSaving(false);
    }
  };
  return <section className="tw-group-settings">
    <header className="tw-group-settings-hero"><div><span>Shared workspace</span><h2>{workspace.name}</h2><p>Changes here affect this Telegram group only. Personal notes, integrations, and account controls remain separate.</p></div><div><b>{workspace.memberCount ?? "—"}</b><span>known members</span><small>Your role · {workspace.role.toLowerCase()}</small></div></header>
    <div className="tw-group-settings-grid">
      <form onSubmit={save}>
        <header><span>Group defaults</span><h3>How this group is reminded</h3><p>{canManage ? "Telegram admins can tune these shared defaults." : "Only a Telegram group admin can change these values."}</p></header>
        <fieldset disabled={!canManage || saving}>
          <label>Group timezone<input value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} /></label>
          <div className="tw-form-row"><label>Reminder rhythm<select value={settings.reminderIntervalMinutes} onChange={(event) => setSettings({ ...settings, reminderIntervalMinutes: Number(event.target.value) })}><option value="60">Every hour</option><option value="180">Every 3 hours</option><option value="360">Every 6 hours</option><option value="1440">Daily</option></select></label><label>Delivery style<select value={settings.reminderMode} onChange={(event) => setSettings({ ...settings, reminderMode: event.target.value as DashboardSettings["reminderMode"] })}><option value="INDIVIDUAL">Individual cards</option><option value="DIGEST">Compact digest</option></select></label></div>
          <div className="tw-form-row"><label>Quiet hours begin<input type="time" value={settings.quietHoursStart ?? ""} onChange={(event) => setSettings({ ...settings, quietHoursStart: event.target.value || undefined })} /></label><label>Quiet hours end<input type="time" value={settings.quietHoursEnd ?? ""} onChange={(event) => setSettings({ ...settings, quietHoursEnd: event.target.value || undefined })} /></label></div>
          <label className="tw-switch"><span><b>Private assignee nudges</b><small>Members assigned to a shared task can receive its reminder privately.</small></span><input type="checkbox" checked={settings.directNudgesEnabled} onChange={(event) => setSettings({ ...settings, directNudgesEnabled: event.target.checked })} /></label>
          {canManage && <button className="tw-primary tw-settings-save" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Save group defaults</button>}
        </fieldset>
      </form>
      <aside><article><ShieldCheck size={22} /><div><h3>Separate by design</h3><p>This dashboard reads only the shared records owned by this group. It cannot open a member&apos;s personal Threadwise workspace.</p></div></article><article><Cloud size={22} /><div><h3>Personal controls stay personal</h3><p>Calendar connections, exports, and account deletion remain in each person&apos;s private workspace.</p></div></article><a className="tw-secondary" href="/api/workspace/select?workspace=personal&next=/dashboard">Switch to personal workspace</a></aside>
    </div>
  </section>;
}

function SettingsView({ data, isDemo, accent, onAccent, onSave, onConnect, onSyncCalendar, onSyncExcel, onCreateExcel, onAutoSync, onRefresh, announce }: { data: DashboardSnapshot; isDemo: boolean; accent: keyof typeof ACCENTS; onAccent: (value: keyof typeof ACCENTS) => void; onSave: (value: DashboardSettings) => void; onConnect: (provider: "calendar" | "excel") => Promise<void>; onSyncCalendar: () => Promise<void>; onSyncExcel: () => Promise<void>; onCreateExcel: () => Promise<void>; onAutoSync: (provider: "calendar" | "excel", enabled: boolean) => Promise<void>; onRefresh: () => Promise<void>; announce: (message: string) => void }) {
  type SettingsTab = "general" | "reminders" | "connections" | "privacy";
  const [settings, setSettings] = useState(data.settings);
  const [tab, setTab] = useState<SettingsTab>("general");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [integrationAction, setIntegrationAction] = useState<"calendar" | "excel" | null>(null);

  useEffect(() => {
    const requested = new URL(window.location.href).searchParams.get("tab");
    if (!["general", "reminders", "connections", "privacy"].includes(requested ?? "")) return;
    const timer = window.setTimeout(() => setTab(requested as SettingsTab), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const payload = { ...settings, quietHoursStart: settings.quietHoursStart || null, quietHoursEnd: settings.quietHoursEnd || null };
      const saved = isDemo ? settings : asPayload<DashboardSettings>(await api("settings", "PATCH", payload), "settings");
      setSettings(saved); onSave(saved); announce("Settings saved in Telegram and on the web.");
    } catch (error) { announce(error instanceof Error ? error.message : "Could not save settings."); }
    finally { setSaving(false); }
  };
  const runIntegration = async (provider: "calendar" | "excel", action: () => Promise<void>) => {
    setIntegrationAction(provider);
    try { await action(); }
    catch (error) { announce(error instanceof Error ? error.message : "That connection could not be updated."); }
    finally { setIntegrationAction(null); }
  };
  const disconnect = async (provider: "calendar" | "excel") => {
    const label = provider === "calendar" ? "Google Calendar" : "Excel";
    if (!window.confirm(`Disconnect ${label}? Your Threadwise data and existing ${provider === "calendar" ? "calendar events" : "workbook"} will stay intact.`)) return;
    await runIntegration(provider, async () => {
      if (!isDemo) await api(`integrations/${provider}/disconnect`, "POST", {});
      await onRefresh();
      announce(isDemo ? "Disconnected in this demo." : `${label} disconnected.`);
    });
  };
  const toggleAutoSync = async (provider: "calendar" | "excel", enabled: boolean) => {
    await runIntegration(provider, async () => {
      await onAutoSync(provider, enabled);
      setSettings((current) => ({ ...current, [provider === "calendar" ? "calendarAutoSync" : "excelAutoSync"]: enabled }));
    });
  };
  const exportData = async () => {
    try {
      let blob: Blob;
      if (isDemo) blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      else { const response = await fetch("/api/threadwise/privacy/export", { cache: "no-store" }); if (!response.ok) throw new Error("Export could not be prepared."); blob = await response.blob(); }
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = isDemo ? "threadwise-demo-export.json" : "threadwise-export.json"; link.click(); URL.revokeObjectURL(url); announce("Your export is ready.");
    } catch (error) { announce(error instanceof Error ? error.message : "Could not export data."); }
  };
  const deleteAccount = async () => {
    if (confirmation !== "DELETE MY THREADWISE DATA" || !window.confirm("This permanently deletes your Threadwise account and saved content. Continue?")) return;
    try { if (!isDemo) await api("privacy/account", "DELETE", { confirmation }); if (isDemo) announce("Account deletion is disabled in the demo."); else window.location.assign("/"); }
    catch (error) { announce(error instanceof Error ? error.message : "Could not delete account."); }
  };
  const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Settings }> = [
    { id: "general", label: "General", icon: Settings },
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "connections", label: "Connections", icon: Cloud },
    { id: "privacy", label: "Privacy", icon: ShieldCheck },
  ];
  const saveButton = <button className="tw-primary tw-settings-save" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Save changes</button>;
  const activeIntegrations = data.integrations.filter((item) => item.provider === "calendar");

  return <section className="tw-settings-workspace">
    <nav className="tw-settings-tabs" aria-label="Settings sections">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={18} /><span>{label}</span><ChevronRight size={15} /></button>)}</nav>
    <div className="tw-settings-panel">
      {tab === "general" && <><header><span>General</span><h2>Your Threadwise defaults</h2><p>Shared instantly by the dashboard and Telegram bot.</p></header><form onSubmit={save}><label>Timezone<input value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} /></label><label>Image text languages<input value={settings.ocrLanguages} onChange={(event) => setSettings({ ...settings, ocrLanguages: event.target.value })} /><small>Language codes used when making saved images searchable.</small></label><fieldset className="tw-appearance-field"><legend>Accent</legend><div className="tw-accent-row">{(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((color) => <button type="button" key={color} className={accent === color ? "active" : ""} style={{ background: ACCENTS[color] }} onClick={() => onAccent(color)} aria-label={`Use ${color} accent`}><Check size={14} /></button>)}</div></fieldset>{saveButton}</form></>}
      {tab === "reminders" && <><header><span>Reminders</span><h2>Helpful, never noisy</h2><p>These controls govern bot reminders as well as dashboard-created tasks.</p></header><form onSubmit={save}><div className="tw-form-row"><label>Default rhythm<select value={settings.reminderIntervalMinutes} onChange={(event) => setSettings({ ...settings, reminderIntervalMinutes: Number(event.target.value) })}><option value="60">Every hour</option><option value="180">Every 3 hours</option><option value="360">Every 6 hours</option><option value="1440">Daily</option></select></label><label>Delivery style<select value={settings.reminderMode} onChange={(event) => setSettings({ ...settings, reminderMode: event.target.value as DashboardSettings["reminderMode"] })}><option value="INDIVIDUAL">Individual cards</option><option value="DIGEST">Compact digest</option></select></label></div><div className="tw-form-row"><label>Due-time nudge<select value={settings.dueNudgeMinutes} onChange={(event) => setSettings({ ...settings, dueNudgeMinutes: Number(event.target.value) })}><option value="0">At the due time</option><option value="15">15 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option></select></label><label>Daily reminder cap<input type="number" min="1" max="50" value={settings.maxRemindersPerDay} onChange={(event) => setSettings({ ...settings, maxRemindersPerDay: Number(event.target.value) })} /></label></div><div className="tw-form-row"><label>Quiet hours begin<input type="time" value={settings.quietHoursStart ?? ""} onChange={(event) => setSettings({ ...settings, quietHoursStart: event.target.value || undefined })} /></label><label>Quiet hours end<input type="time" value={settings.quietHoursEnd ?? ""} onChange={(event) => setSettings({ ...settings, quietHoursEnd: event.target.value || undefined })} /></label></div><label className="tw-switch"><span><b>Private assignee nudges</b><small>Send a task nudge only to the assigned person’s private chat.</small></span><input type="checkbox" checked={settings.directNudgesEnabled} onChange={(event) => setSettings({ ...settings, directNudgesEnabled: event.target.checked })} /></label>{saveButton}</form></>}
      {tab === "connections" && <><header><span>Connection</span><h2>Google Calendar</h2><p>Calendar is optional. Threadwise remains the source of truth.</p></header><div className="tw-integration-cards">{activeIntegrations.map((item) => { const busy = integrationAction === item.provider; return <article className="tw-integration-card" data-provider={item.provider} key={item.provider}><header><span>{item.provider === "calendar" ? <CalendarDays size={21} /> : <FileText size={21} />}</span><div><h3>{item.name}</h3><p>{item.accountEmail ?? item.detail}</p></div><em className={item.state}>{item.state === "connected" ? "Connected" : item.state === "attention" ? "Needs setup" : "Not connected"}</em></header><div className="tw-integration-metrics"><span><b>{item.syncedCount}</b><small>synced</small></span><span><b>{item.unsyncedCount}</b><small>waiting</small></span>{item.provider === "excel" && item.workbookName && <span className="wide"><b>{item.workbookName}</b><small>workbook</small></span>}</div>{item.state !== "available" && <label className="tw-switch tw-integration-switch"><span><b>Automatic sync</b><small>{item.provider === "calendar" ? "New and edited dated tasks" : "New confirmed expenses"}</small></span><input type="checkbox" checked={item.provider === "calendar" ? settings.calendarAutoSync : settings.excelAutoSync} disabled={busy} onChange={(event) => void toggleAutoSync(item.provider, event.target.checked)} /></label>}<footer>{item.state === "available" ? <button className="tw-primary" disabled={busy} onClick={() => void runIntegration(item.provider, () => onConnect(item.provider))}>{busy ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Connect {item.name}</button> : <>{item.provider === "calendar" && <button className="tw-primary" disabled={busy} onClick={() => void runIntegration("calendar", onSyncCalendar)}>{busy ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />} Sync dated tasks</button>}{item.provider === "excel" && item.state === "attention" && <button className="tw-primary" disabled={busy} onClick={() => void runIntegration("excel", onCreateExcel)}>{busy ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Create workbook</button>}{item.provider === "excel" && item.state === "connected" && <button className="tw-primary" disabled={busy} onClick={() => void runIntegration("excel", onSyncExcel)}>{busy ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />} Sync expenses</button>}{item.workbookUrl && <a href={item.workbookUrl} target="_blank" rel="noreferrer">Open workbook <ExternalLink size={14} /></a>}<button className="tw-secondary" disabled={busy} onClick={() => void disconnect(item.provider)}><Unplug size={15} /> Disconnect</button></>}</footer></article>; })}</div><p className="tw-integration-note"><ShieldCheck size={15} /> Provider tokens are encrypted. A failed sync never deletes the Threadwise copy.</p></>}
      {tab === "privacy" && <><header><span>Privacy</span><h2>Your data, your decision</h2><p>Clear controls without a wall of legal text.</p></header><div className="tw-settings-privacy"><article><ShieldCheck size={22} /><div><h3>How access works</h3><p>Telegram verifies your identity; Threadwise never receives your Telegram password. Dashboard requests are scoped to that same account.</p><a href="/privacy">Read the complete explanation <ArrowRight size={14} /></a></div></article><article><Download size={22} /><div><h3>Take a copy with you</h3><p>Download tasks, notes, ideas, and image metadata in a readable export.</p><button className="tw-secondary" onClick={() => void exportData()}>Export my data</button></div></article><article className="danger"><Trash2 size={22} /><div><h3>Delete everything</h3><p>This is permanent. Type the exact phrase below before the final confirmation.</p><label><span>DELETE MY THREADWISE DATA</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="tw-danger" disabled={confirmation !== "DELETE MY THREADWISE DATA"} onClick={() => void deleteAccount()}>Delete account and data</button></div></article><form action="/api/auth/logout" method="post"><button className="tw-secondary" type="submit"><LogOut size={16} /> Sign out</button></form></div></>}
    </div>
  </section>;
}

function CaptureComposer({ isDemo, timezone, currency, allowExpenses, groupName, onClose, onSave, announce }: {
  isDemo: boolean;
  timezone: string;
  currency: string;
  allowExpenses: boolean;
  groupName?: string;
  onClose: () => void;
  onSave: (kind: EditableKind, values: Record<string, unknown>) => Promise<boolean>;
  announce: (message: string) => void;
}) {
  const [text, setText] = useState("");
  const [preferredKind, setPreferredKind] = useState<"auto" | CaptureKind>("auto");
  const [preview, setPreview] = useState<CapturePreview | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  useModalFocus(dialogRef, inputRef, onClose);

  const understand = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const parsed = isDemo
        ? demoCapturePreview(text, preferredKind, currency)
        : asPayload<CapturePreview>(await api("capture/preview", "POST", { text, preferredKind }), "preview");
      if (!allowExpenses && parsed.kind === "expense") {
        announce("Quick capture currently supports tasks, notes, and ideas.");
        return;
      }
      setPreview(parsed);
      setDraft(parsed.payload);
    } catch (error) {
      announce(error instanceof Error ? error.message : "Threadwise could not understand that capture.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!preview) { await understand(); return; }
    setLoading(true);
    try {
      if (await onSave(preview.kind, draft)) onClose();
    } finally {
      setLoading(false);
    }
  };
  const changeKind = (kind: "auto" | CaptureKind) => { setPreferredKind(kind); setPreview(null); setDraft({}); };
  const field = (key: string, value: unknown) => setDraft((current) => ({ ...current, [key]: value }));
  const kinds: Array<"auto" | CaptureKind> = ["auto", "task", "note", "idea", ...(allowExpenses ? ["expense" as const] : [])];

  return <div className="tw-modal-overlay tw-capture-overlay" onMouseDown={onClose}><section ref={dialogRef} className="tw-capture-dialog" role="dialog" aria-modal="true" aria-label="Quick capture" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><span><Sparkles size={16} /> {groupName ? `Add to ${groupName}` : "Quick capture"}</span><h2>{groupName ? "Turn the chat into shared context." : "Drop the thought. We’ll untangle it."}</h2><p>{groupName ? "Add shared work, a note, or an idea. Threadwise will structure it before anything is saved." : "Write naturally—Threadwise will find the type, details, and time before anything is saved."}</p></div><button onClick={onClose} aria-label="Close quick capture"><X size={20} /></button></header>
    <form onSubmit={submit}>
      <div className="tw-capture-type-row" aria-label="Capture type">{kinds.map((kind) => <button type="button" key={kind} className={preferredKind === kind ? "active" : ""} onClick={() => changeKind(kind)}>{kind === "auto" ? <Sparkles size={14} /> : kind === "task" ? <ListChecks size={14} /> : kind === "note" ? <FileText size={14} /> : kind === "idea" ? <Lightbulb size={14} /> : <CircleDollarSign size={14} />}{kind}</button>)}</div>
      <label className="tw-capture-text"><span>What’s on your mind?</span><textarea ref={inputRef} rows={4} maxLength={20_000} value={text} onChange={(event) => { setText(event.target.value); setPreview(null); }} placeholder="Remind me to call Mum tomorrow at 1.30pm…" /></label>
      {!preview && <div className="tw-capture-hints"><span>Try</span><button type="button" onClick={() => setText("Remind me to review the proposal tomorrow at 1.30pm")}>A reminder</button><button type="button" onClick={() => setText("Idea: a weekly digest that groups related notes")}>An idea</button>{allowExpenses && <button type="button" onClick={() => setText("Spent $12.80 on lunch today")}>An expense</button>}</div>}
      {preview && <div className="tw-capture-preview">
        <div className="tw-capture-preview-head"><span className={preview.kind}>{preview.kind}</span><div><b>Threadwise understood this as {preview.kind === "expense" ? "an" : "a"} {preview.kind}.</b><small>{preview.reason}</small></div><em>{Math.round(preview.confidence * 100)}% match</em></div>
        {(preview.kind === "task" || preview.kind === "note" || preview.kind === "idea") && <label>Title<input value={String(draft.title ?? "")} onChange={(event) => field("title", event.target.value)} required /></label>}
        {preview.kind === "task" && <><label>Details<textarea rows={3} value={String(draft.description ?? "")} onChange={(event) => field("description", event.target.value || undefined)} /></label><label>Due date &amp; time<input type="datetime-local" value={zonedInputDate(typeof draft.dueAt === "string" ? draft.dueAt : undefined, timezone)} onChange={(event) => field("dueAt", event.target.value ? zonedInputToIso(event.target.value, timezone) : null)} /></label></>}
        {preview.kind === "note" && <label>Note<textarea rows={5} value={String(draft.body ?? "")} onChange={(event) => field("body", event.target.value)} required /></label>}
        {preview.kind === "idea" && <label>Concept<textarea rows={5} value={String(draft.concept ?? "")} onChange={(event) => field("concept", event.target.value)} required /></label>}
        {preview.kind === "expense" && <><div className="tw-form-row"><label>Merchant<input value={String(draft.merchant ?? "")} onChange={(event) => field("merchant", event.target.value || undefined)} /></label><label>Total<input type="number" min="0" step="0.01" value={String(draft.total ?? "")} onChange={(event) => field("total", Number(event.target.value))} required /></label></div><label>Description<input value={String(draft.description ?? "")} onChange={(event) => field("description", event.target.value || undefined)} /></label><div className="tw-form-row"><label>Currency<input minLength={3} maxLength={3} value={String(draft.currency ?? currency)} onChange={(event) => field("currency", event.target.value.toUpperCase())} required /></label><label>Date &amp; time<input type="datetime-local" value={zonedInputDate(typeof draft.transactionAt === "string" ? draft.transactionAt : new Date().toISOString(), timezone)} onChange={(event) => field("transactionAt", zonedInputToIso(event.target.value, timezone))} required /></label></div></>}
      </div>}
      <footer><span>{preview ? "Review the details before saving." : "Nothing is saved until you confirm."}</span><button type="button" className="tw-secondary" onClick={onClose}>Cancel</button><button className="tw-primary" disabled={loading || !text.trim()}>{loading ? <LoaderCircle className="spin" size={17} /> : preview ? <Check size={17} /> : <Sparkles size={17} />}{preview ? `Save ${preview.kind}` : "Understand"}</button></footer>
    </form>
  </section></div>;
}

function demoCapturePreview(text: string, preferred: "auto" | CaptureKind, currency: string): CapturePreview {
  const kind: CaptureKind = preferred !== "auto"
    ? preferred
    : /(?:spent|paid|expense|\$\s*\d)/i.test(text) ? "expense"
      : /(?:idea|concept|what if)/i.test(text) ? "idea"
        : /(?:remind|task|todo|need to|tomorrow|today|at \d)/i.test(text) ? "task" : "note";
  const title = text.replace(/^(?:idea|note|task|remind me to)\s*[:,-]?\s*/i, "").slice(0, 90);
  const payload = kind === "task" ? { title }
    : kind === "note" ? { title, body: text, tags: [] }
      : kind === "idea" ? { title, concept: text, tags: [], status: "RAW" }
        : { description: text, total: Number(text.match(/\d+(?:\.\d{1,2})?/)?.[0] ?? 0), currency, transactionAt: new Date().toISOString() };
  return { kind, confidence: .92, reason: "Demo classification based on the words you used.", sourceText: text, payload };
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
    <footer>{item && <button type="button" className="tw-danger-quiet" onClick={() => onDelete(state.kind, item)}><Trash2 size={16} /> {state.kind === "note" ? "Delete" : ["task", "idea"].includes(state.kind) ? "Archive" : "Delete"}</button>}{state.kind === "idea" && item && <button type="button" className="tw-secondary" onClick={() => onConvert(item as DashboardIdea)}><Zap size={15} /> Make task</button>}<span /><button type="button" className="tw-secondary" onClick={onClose}>Cancel</button><button className="tw-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Save</button></footer>
  </form></section></div>;
}

function CommandPalette({ data, items, onClose, onNavigate }: { data: DashboardSnapshot; items: typeof PERSONAL_NAV; onClose: () => void; onNavigate: (view: DashboardView) => void }) {
  const [query, setQuery] = useState(""); const input = useRef<HTMLInputElement>(null); const dialogRef = useRef<HTMLElement | null>(null); useModalFocus(dialogRef, input, onClose);
  const results = useMemo(() => { const q = query.toLowerCase().trim(); if (!q) return []; return [
    ...data.tasks.map((item) => ({ title: item.title, detail: item.description, view: "tasks" as DashboardView, icon: ListChecks })),
    ...data.notes.map((item) => ({ title: item.title, detail: item.summary, view: "notes" as DashboardView, icon: FileText })),
    ...data.ideas.map((item) => ({ title: item.title, detail: item.concept, view: "ideas" as DashboardView, icon: Lightbulb })),
    ...data.images.map((item) => ({ title: item.caption || item.fileName || "Saved image", detail: item.ocrText, view: "images" as DashboardView, icon: ImageIcon })),
  ].filter((item) => `${item.title} ${item.detail ?? ""}`.toLowerCase().includes(q)).slice(0, 8); }, [data, query]);
  return <div className="tw-command-overlay" onMouseDown={onClose}><section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Find anything" onMouseDown={(event) => event.stopPropagation()}><header><Search size={20} /><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find anything…" /><kbd>ESC</kbd></header><div>{!query && <><p>Go somewhere</p>{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onNavigate(id)}><span><Icon size={17} /></span><b>{label}</b><ArrowRight size={15} /></button>)}</>}{query && results.map(({ title, detail, view, icon: Icon }, index) => <button key={`${title}-${index}`} onClick={() => onNavigate(view)}><span><Icon size={17} /></span><div><b>{title}</b><small>{detail}</small></div><ArrowRight size={15} /></button>)}{query && !results.length && <Empty icon={Search} title="No threads found." copy="Open full search for deeper results." action="Open search" onAction={() => onNavigate("search")} />}</div><footer><span><kbd>⌘ K</kbd> anywhere</span><button onClick={onClose}>Close</button></footer></section></div>;
}

function MobileMore({ activeView, items, onClose, onNavigate }: { activeView: DashboardView; items: typeof PERSONAL_NAV; onClose: () => void; onNavigate: (view: DashboardView) => void }) { const dialogRef = useRef<HTMLElement | null>(null); const closeRef = useRef<HTMLButtonElement | null>(null); useModalFocus(dialogRef, closeRef, onClose); return <div className="tw-mobile-sheet-overlay" onMouseDown={onClose}><section ref={dialogRef} role="dialog" aria-modal="true" aria-label="More navigation" onMouseDown={(event) => event.stopPropagation()}><header><span>Threadwise</span><button ref={closeRef} onClick={onClose} aria-label="Close navigation"><X size={20} /></button></header>{items.map(({ id, label, icon: Icon }) => <button key={id} className={activeView === id ? "active" : ""} onClick={() => onNavigate(id)}><Icon size={19} /><span>{label}</span><ChevronRight size={16} /></button>)}</section></div>; }
function CollectionSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) { return <div className="tw-toolbar"><label><Search size={15} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label></div>; }
function LoadMore({ state, onLoadMore }: { state: { hasMore: boolean; loading: boolean }; onLoadMore: () => void }) { return state.hasMore ? <button className="tw-load-more" onClick={onLoadMore} disabled={state.loading}>{state.loading ? <LoaderCircle className="spin" size={17} /> : <ChevronDown size={17} />} Load more</button> : null; }
function Empty({ icon: Icon, mascot = false, title, copy, action, onAction }: { icon: typeof Inbox; mascot?: boolean; title: string; copy: string; action?: string; onAction?: () => void }) { return <div className="tw-empty">{mascot ? <Ari variant="full" className="tw-empty-ari" decorative /> : <Icon size={27} />}<b>{title}</b><span>{copy}</span>{action && <button onClick={onAction}>{action}</button>}</div>; }
