"use client";
/* Telegram-hosted resource previews stay on the authenticated same-origin proxy. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, AlertTriangle, Archive, ArrowRight, BookOpen, Brain, CalendarDays, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Cloud, ExternalLink,
  File, FileText, Image as ImageIcon, Library, Link as LinkIcon, ListChecks,
  LoaderCircle, MapPin, Menu, Moon, MoreHorizontal, Pin, Play, Plus,
  RefreshCw, Search, Settings, Square, Sun, Target, TimerReset, Trash2, Undo2, X,
} from "lucide-react";
import { Ari, AriWorkspaceLoader } from "./ari";
import { IntegerInput } from "./integer-input";
import { ThreadwiseMark } from "./threadwise-mark";
import { StudyTimetable } from "./study-timetable";
import { scheduleBlockPlaceId, StudyPlaceCombobox } from "./study-place-combobox";
import { StudyChoicePicker } from "./study-choice-picker";
import type { DashboardSnapshot, DashboardWorkspace } from "@/lib/types";
import type {
  StudyAnalysisEvidence, StudyAnalysisFinding, StudyAnalysisMode, StudyAnalysisQuizItem, StudyItem, StudyItemType, StudyMistake, StudyModule, StudyModuleAnalysisResponse, StudyNoteEditSuggestion,
  StudyResource, StudyResourceKind, StudySession, StudySnapshot, StudyTrafficLight, StudyView,
} from "@/lib/study-types";
import { studyAnalysisAction, studyAnalysisEvidenceNumbers, studyAnalysisInitialModuleId, studyAnalysisModules, studyAnalysisReason } from "@/lib/study-analysis";
import { studyWeekLabel } from "@/lib/study-week";
import { loadStudyImage, StudyImageLoadError } from "@/lib/study-image";
import { clampInteger } from "@/lib/numeric-input";
import {
  FOCUS_STRUCTURES, STUDY_TECHNIQUES, type FocusStructureId,
  sessionCustomMethod, sessionElapsedSeconds, sessionMethodSummary, sessionResourceIds,
} from "@/lib/study-session";

type Props = { initialData: DashboardSnapshot; workspaces: DashboardWorkspace[]; initialView?: string };
type SyncState = "connecting" | "live" | "reconnecting" | "offline";
type Toast = {
  message: string;
  tone: "success" | "error" | "info";
  action?: { label: string; run: () => void };
};
type Confirmation = { message: string; action: () => unknown };
const STUDY_CONFIRM_EVENT = "threadwise:study-confirm";
type Editor =
  | { kind: "item"; value?: StudyItem }
  | { kind: "resource"; value?: StudyResource; resourceKind?: "NOTE" | "LINK" | "QUESTION" }
  | { kind: "module"; value?: StudyModule }
  | { kind: "mistake"; item?: StudyItem }
  | null;

const NAV_SECTIONS: Array<{ label: string; items: Array<{ id: StudyView; label: string; icon: typeof BookOpen }> }> = [
  { label: "Today", items: [
    { id: "study-overview", label: "Overview", icon: Target },
    { id: "study-timetable", label: "Timetable", icon: CalendarDays },
    { id: "study-work", label: "Work", icon: ListChecks },
    { id: "study-focus", label: "Deep Work", icon: TimerReset },
  ] },
  { label: "Organize", items: [
    { id: "study-modules", label: "Modules", icon: BookOpen },
    { id: "study-library", label: "Library", icon: Library },
    { id: "study-search", label: "Search", icon: Search },
  ] },
  { label: "Reflect", items: [
    { id: "study-review", label: "Review", icon: Brain },
  ] },
  { label: "Manage", items: [
    { id: "study-settings", label: "Settings", icon: Settings },
  ] },
];
const NAV = NAV_SECTIONS.flatMap((section) => section.items);
const MOBILE_NAV = NAV.filter((item) => ["study-overview", "study-timetable", "study-work", "study-focus"].includes(item.id));
const ITEM_TYPES: StudyItemType[] = ["LECTURE", "TUTORIAL", "LAB", "ASSIGNMENT", "PROJECT", "REVISION", "TIMED_PRACTICE", "READING", "ADMINISTRATIVE"];
const MASTERY: StudyTrafficLight[] = ["GREEN", "AMBER", "RED", "UNASSESSED"];

export function StudyDashboardApp({ initialData, workspaces, initialView }: Props) {
  const [study, setStudy] = useState<StudySnapshot | null>(null);
  const [view, setView] = useState<StudyView>(validView(initialView));
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeReady, setThemeReady] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [workspaceMenu, setWorkspaceMenu] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>("connecting");
  const [moduleFilter, setModuleFilter] = usePersistentState<string>("threadwise-study-module-filter", "all");
  const [focusItemId, setFocusItemId] = useState<string | undefined>();
  const [focusOutcome, setFocusOutcome] = useState<StudySession | null>(null);
  const refreshRunning = useRef(false);
  const mutationRunning = useRef(false);
  const hasSnapshot = useRef(false);
  const navChord = useRef(0);
  const toastTimer = useRef<number | null>(null);

  const announce = useCallback((message: string, tone: Toast["tone"] = "success", action?: Toast["action"]) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, tone, action });
    toastTimer.current = window.setTimeout(() => setToast(null), tone === "error" || action ? 7000 : 3200);
  }, []);

  const refresh = useCallback(async (quiet = true) => {
    if (refreshRunning.current) return;
    refreshRunning.current = true;
    if (!quiet) {
      setSync("connecting");
      if (!hasSnapshot.current) setBootError(null);
    }
    try {
      const response = await studyApi<{ study: StudySnapshot }>("study/snapshot");
      setStudy(response.study);
      hasSnapshot.current = true;
      setBootError(null);
      setSync("live");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Study Mode could not refresh.";
      setSync("offline");
      if (!hasSnapshot.current) setBootError(message);
      else if (!quiet) announce(message, "error");
    } finally {
      refreshRunning.current = false;
    }
  }, [announce]);

  const mutate = useCallback(async <T,>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown, success?: string): Promise<T | undefined> => {
    if (mutationRunning.current) {
      announce("Another change is still saving.", "info");
      return undefined;
    }
    mutationRunning.current = true;
    setBusy(true);
    try {
      const result = await studyApi<T>(path, method, body);
      await refresh();
      if (success) announce(success, "success");
      return result;
    } catch (error) {
      announce(error instanceof Error ? error.message : "That change could not be saved.", "error");
      return undefined;
    } finally {
      mutationRunning.current = false;
      setBusy(false);
    }
  }, [announce, refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(false), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    const stored = window.localStorage.getItem("threadwise-theme");
    const preferred = stored === "dark" || stored === "light"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = preferred;
    const timer = window.setTimeout(() => {
      setTheme(preferred);
      setThemeReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("threadwise-theme", theme);
  }, [theme, themeReady]);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);
  useEffect(() => {
    const openConfirmation = (event: Event) => setConfirmation((event as CustomEvent<Confirmation>).detail);
    window.addEventListener(STUDY_CONFIRM_EVENT, openConfirmation);
    return () => window.removeEventListener(STUDY_CONFIRM_EVENT, openConfirmation);
  }, []);
  useEffect(() => {
    const events = new EventSource("/api/threadwise/events");
    const ready = () => setSync("live");
    const update = () => { setSync("live"); void refresh(); };
    const retry = () => setSync("reconnecting");
    events.addEventListener("ready", ready);
    events.addEventListener("refresh", update);
    events.addEventListener("sync-error", retry);
    events.onerror = retry;
    const reconcile = window.setInterval(() => void refresh(), 60_000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { events.close(); window.clearInterval(reconcile); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);

  const navigate = useCallback((next: StudyView) => {
    setView(next);
    setMobileNav(false);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  const openModule = (moduleId: string, destination: StudyView = "study-work") => {
    setModuleFilter(moduleId);
    navigate(destination);
    void mutate(`study/modules/${moduleId}`, "PATCH", { selected: true });
  };

  useEffect(() => {
    const shortcuts: Record<string, StudyView> = {
      o: "study-overview", t: "study-timetable", m: "study-modules", w: "study-work", l: "study-library",
      r: "study-review", s: "study-search", f: "study-focus", ",": "study-settings",
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable='true']");
      if (target?.closest("[role='dialog']")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        navigate("study-search");
        return;
      }
      if (event.key === "Escape") {
        setMobileNav(false);
        setWorkspaceMenu(false);
        return;
      }
      if (typing) return;
      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (event.key.toLowerCase() === "g") {
        navChord.current = Date.now();
        return;
      }
      if (Date.now() - navChord.current < 900) {
        const destination = shortcuts[event.key.toLowerCase()];
        navChord.current = 0;
        if (destination) {
          event.preventDefault();
          navigate(destination);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const completeItem = async (item: StudyItem) => {
    const completed = await mutate<{ item: StudyItem }>(`study/items/${item.id}/complete`, "POST", {});
    if (!completed) return;
    announce("Marked complete.", "success", {
      label: "Undo",
      run: () => { void mutate(`study/items/${item.id}`, "PATCH", { status: "OPEN" }, "Restored to open work."); },
    });
  };

  if (!study) {
    if (!bootError) return <AriWorkspaceLoader />;

    return <main className="study-boot">
      <ThreadwiseMark />
      <section className="study-boot-error" role="alert">
        <Ari variant={theme === "dark" ? "avatar-dark" : "avatar-light"} decorative />
        <h1>Study Mode could not reconnect.</h1>
        <p>{bootError}</p>
        <div><button className="study-primary" onClick={() => void refresh(false)}><RefreshCw size={16} /> Retry</button><a className="study-secondary" href="/dashboard">Back to dashboard</a></div>
      </section>
    </main>;
  }

  const activeLabel = NAV.find((item) => item.id === view)?.label ?? "Overview";
  const openCount = study.items.filter((item) => item.status === "OPEN" || item.status === "IN_PROGRESS").length;
  const selectedWorkspace = initialData.workspace;
  const ownerName = initialData.user.firstName?.trim() || initialData.user.fullName?.trim() || "there";
  const ownerInitial = ownerName.slice(0, 1).toUpperCase();
  const activeSession = study.sessions.find((session) => !session.endedAt) ?? null;

  const stopSession = async (body: unknown) => {
    const stopped = await mutate<{ session: StudySession }>("study/sessions/stop", "POST", body, "Session recorded.");
    if (stopped?.session) {
      setFocusOutcome(stopped.session);
      navigate("study-focus");
    }
    return stopped;
  };

  const updateSession = async (sessionId: string, body: unknown) => {
    const updated = await mutate<{ session: StudySession }>(`study/sessions/${sessionId}`, "PATCH", body, "Session updated.");
    if (updated?.session && focusOutcome?.id === sessionId) setFocusOutcome(updated.session);
    return updated;
  };

  return <div className={`study-shell${activeSession ? " focus-active-session" : ""}`}>
    <aside className={`study-sidebar ${mobileNav ? "open" : ""}`}>
      <div className="study-brand"><ThreadwiseMark /><button onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={19} /></button></div>
      <StudyWorkspaceSwitcher current={selectedWorkspace} workspaces={workspaces} open={workspaceMenu} setOpen={setWorkspaceMenu} />
      <div className="study-context"><span className="study-context-mark" aria-hidden="true"><BookOpen size={22} /></span><div><span>Private Study</span><b>{study.workspace.semesterName}</b><small>{studyWeekLabel(study)}</small></div></div>
      <nav aria-label="Study Mode">
        {NAV_SECTIONS.map((section) => <div className="study-nav-group" key={section.label}><p>{section.label}</p>{section.items.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} aria-current={view === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === "study-work" && <em>{openCount}</em>}</button>)}</div>)}
      </nav>
      <button className="study-sync" data-state={sync} onClick={() => void refresh(false)}><Cloud size={16} /><span><b>{sync === "live" ? "Telegram in sync" : sync === "offline" ? "Connection paused" : sync === "connecting" ? "Checking changes" : "Reconnecting"}</b><small>{sync === "live" ? "Shared source of truth" : "Tap to retry"}</small></span><RefreshCw size={14} className={sync === "connecting" || sync === "reconnecting" ? "spin" : ""} /></button>
    </aside>
    {mobileNav && <button className="study-nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main className="study-main">
      <header className="study-topbar">
        <button className="study-icon mobile" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
        <span className="study-crumb">{selectedWorkspace.name}<ChevronRight size={13} /><b>{activeLabel}</b></span>
        <div><button className="study-search-jump" onClick={() => navigate("study-search")}><Search size={16} /><span>Search this semester</span><kbd>Ctrl K</kbd></button><button className="study-icon" onClick={() => setHelpOpen(true)} aria-label="Study Mode help"><CircleHelp size={18} /></button><button className="study-icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button><span className="study-owner" aria-label={`${ownerName}'s private Study workspace`}>{ownerInitial}</span></div>
      </header>
      <div className="study-content" key={view}>
        {sync === "offline" && <section className="study-status-banner" role="alert"><AlertCircle size={18} /><div><b>Live sync is paused.</b><p>Your current view is preserved. Retry when the connection is ready.</p></div><button onClick={() => void refresh(false)}>Retry</button></section>}
        {view === "study-overview" && <Overview study={study} ownerName={ownerName} onOpenModule={openModule} onNavigate={navigate} onEditItem={(item) => setEditor({ kind: "item", value: item })} onComplete={(item) => void completeItem(item)} onFocus={(item) => { setFocusItemId(item.id); setModuleFilter(item.moduleId); navigate("study-focus"); }} />}
        {view === "study-timetable" && <StudyTimetable study={study} busy={busy} onImportNusmods={(url) => mutate("study/nusmods/import", "POST", { url }, "NUSMods timetable imported.")} onAddBlock={(body) => mutate("study/schedule", "POST", body, "Timetable updated.")} onUpdateBlock={(id, body) => mutate(`study/schedule/${id}`, "PATCH", body, "Timetable updated.")} onDeleteBlock={(id) => mutate(`study/schedule/${id}`, "DELETE", undefined, "Schedule block removed.")} onEditItem={(item) => setEditor({ kind: "item", value: item })} onFocusItem={(item) => { setFocusItemId(item.id); setModuleFilter(item.moduleId); navigate("study-focus"); }} />}
        {view === "study-modules" && <Modules study={study} onOpen={openModule} onEdit={(module) => setEditor({ kind: "module", value: module })} onAdd={() => setEditor({ kind: "module" })} onArchive={(module) => confirmAction(`Archive ${module.code}? Canvas sync will keep it archived until you restore it.`, () => { void (async () => { const saved = await mutate(`study/modules/${module.id}`, "PATCH", { active: false }); if (saved !== undefined) announce(`${module.code} archived.`, "success", { label: "Undo", run: () => void mutate(`study/modules/${module.id}`, "PATCH", { active: true }, `${module.code} restored.`) }); })(); })} onRestore={(module) => void mutate(`study/modules/${module.id}`, "PATCH", { active: true }, `${module.code} restored.`)} />}
        {view === "study-work" && <Work study={study} moduleFilter={moduleFilter} onModuleFilter={setModuleFilter} onEdit={(item) => setEditor({ kind: "item", value: item })} onAdd={() => setEditor({ kind: "item" })} onComplete={(item) => void completeItem(item)} onArchive={(item) => confirmAction(`Archive ${item.publicId}?`, () => mutate(`study/items/${item.id}`, "DELETE", undefined, "Work item archived."))} />}
        {view === "study-library" && <LibraryView study={study} moduleFilter={moduleFilter} activeSession={activeSession} onModuleFilter={setModuleFilter} onAdd={(kind) => setEditor({ kind: "resource", resourceKind: kind })} onEdit={async (resource) => { const detail = await studyApi<{ resource: StudyResource }>(`study/resources/${resource.id}`); setEditor({ kind: "resource", value: detail.resource }); }} onPin={(resource) => void mutate(`study/resources/${resource.id}`, "PATCH", { pinned: !resource.pinnedAt }, resource.pinnedAt ? "Unpinned." : "Pinned.")} onArchive={(resource) => confirmAction(`Archive “${resource.title}”?`, () => mutate(`study/resources/${resource.id}`, "DELETE", undefined, "Resource archived."))} onToggleSessionResource={(resource) => { if (!activeSession) return; const current = sessionResourceIds(activeSession); const resourceIds = current.includes(resource.id) ? current.filter((id) => id !== resource.id) : [...current, resource.id]; void updateSession(activeSession.id, { resourceIds }); }} />}
        {view === "study-review" && <Review study={study} busy={busy} onMastery={(module, mastery, reason) => void mutate(`study/modules/${module.id}`, "PATCH", { mastery, masteryReason: reason }, `${module.code} updated.`)} onResolveMistake={(mistake) => void mutate(`study/mistakes/${mistake.id}/resolve`, "POST", {}, "Mistake resolved.")} onAddMistake={() => setEditor({ kind: "mistake" })} onSavePlan={(body) => mutate("study/weekly-plan", "PATCH", body, "Week plan saved.")} onSaveReview={(body) => mutate("study/review", "POST", body, "Weekly review saved.")} />}
        {view === "study-search" && <StudySearch study={study} onNavigate={navigate} onEditItem={(item) => setEditor({ kind: "item", value: item })} onEditResource={async (resource) => { const detail = await studyApi<{ resource: StudyResource }>(`study/resources/${resource.id}`); setEditor({ kind: "resource", value: detail.resource }); }} />}
        {view === "study-focus" && <DeepWorkPhaseOne key={focusItemId || "module-session"} study={study} busy={busy} initialItemId={focusItemId} activeSession={activeSession} outcome={focusOutcome} onDismissOutcome={() => setFocusOutcome(null)} onStart={(body) => mutate("study/sessions/start", "POST", body, "Session started.")} onStop={stopSession} onUpdate={updateSession} onArchive={async (session) => { const archived = await mutate<{ session: StudySession }>(`study/sessions/${session.id}`, "DELETE", undefined, "Session removed."); if (archived && focusOutcome?.id === session.id) setFocusOutcome(null); return archived; }} onComplete={(item) => completeItem(item)} onRecordMistake={(item) => setEditor({ kind: "mistake", item })} onOpenLibrary={(id) => { setModuleFilter(id); navigate("study-library"); }} />}
        {view === "study-settings" && <StudySettings study={study} busy={busy} onSave={(body) => mutate("study/settings", "PATCH", body, "Study settings saved.")} onSync={() => mutate("study/canvas/sync", "POST", {}, "Canvas sync complete.")} onCanvasReview={(id, action) => mutate(`study/canvas/assignments/${id}`, "PATCH", { action }, action === "keep" ? "Assignment kept." : "Assignment archived.")} onAddOrigin={(body) => mutate("study/origins", "POST", body, "Origin saved.")} onOrigin={(id, body) => mutate(`study/origins/${id}`, "PATCH", body, "Origin updated.")} onDeleteOrigin={(id) => mutate(`study/origins/${id}`, "DELETE", undefined, "Origin removed.")} onAddBlock={(body) => mutate("study/schedule", "POST", body, "Schedule block saved.")} onUpdateBlock={(id, body) => mutate(`study/schedule/${id}`, "PATCH", body, "Class travel updated.")} onDeleteBlock={(id) => mutate(`study/schedule/${id}`, "DELETE", undefined, "Schedule block removed.")} />}
      </div>
    </main>
    <nav className="study-mobile-dock" aria-label="Primary Study navigation">{MOBILE_NAV.map(({ id, label, icon: Icon }) => <button key={id} aria-current={view === id ? "page" : undefined} className={view === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={19} /><span>{label === "Deep Work" ? "Focus" : label}</span></button>)}<button aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><MoreHorizontal size={20} /><span>More</span></button></nav>
    {activeSession && view !== "study-focus" && <StudySessionCompanion session={activeSession} timezone={study.workspace.timezone} busy={busy} onOpen={() => navigate("study-focus")} onStop={stopSession} />}
    {editor && <StudyEditor state={editor} study={study} busy={busy} onClose={() => setEditor(null)} onSave={async (path, method, body, message) => { const saved = await mutate(path, method, body, message); if (saved) setEditor(null); }} />}
    {helpOpen && <StudyGuideSheet onClose={() => setHelpOpen(false)} />}
    {confirmation && <StudyConfirmationDialog message={confirmation.message} onCancel={() => setConfirmation(null)} onConfirm={() => { const action = confirmation.action; setConfirmation(null); void action(); }} />}
    {toast && <div className="study-toast" data-tone={toast.tone} role={toast.tone === "error" ? "alert" : "status"}>{toast.tone === "error" ? <AlertCircle size={18} /> : toast.tone === "info" ? <Cloud size={18} /> : <CheckCircle2 size={18} />}<span>{toast.message}</span>{toast.action && <button onClick={() => { setToast(null); toast.action?.run(); }}><Undo2 size={15} /> {toast.action.label}</button>}<button className="study-toast-close" onClick={() => setToast(null)} aria-label="Dismiss message"><X size={15} /></button></div>}
  </div>;
}

function Overview({ study, ownerName, onOpenModule, onNavigate, onEditItem, onComplete, onFocus }: { study: StudySnapshot; ownerName: string; onOpenModule: (id: string, view?: StudyView) => void; onNavigate: (view: StudyView) => void; onEditItem: (item: StudyItem) => void; onComplete: (item: StudyItem) => void; onFocus: (item: StudyItem) => void }) {
  const attention = study.overview.attention;
  const first = attention.items[0];
  const firstItem = first ? study.items.find((item) => item.id === first.id) : undefined;
  return <>
    <section className="study-overview-hero"><div><span>{studyWeekLabel(study)}</span><h1>{greeting()}, {ownerName}.</h1><p>{attention.overdue ? `${attention.overdue} overdue item${attention.overdue === 1 ? "" : "s"} need a decision.` : attention.dueToday ? `${attention.dueToday} item${attention.dueToday === 1 ? "" : "s"} due today.` : "Your semester is in view."}</p></div></section>
    <div className="study-overview-grid">
      <section className="study-next-card"><header><span>Next move</span><button onClick={() => onNavigate("study-work")}>All work <ArrowRight size={15} /></button></header>{first && firstItem ? <><div className="study-next-meta"><Mastery value={firstItem.module.id ? study.modules.find((module) => module.id === firstItem.module.id)?.currentMastery ?? "UNASSESSED" : "UNASSESSED"} /><b>{first.moduleCode}</b><span>{first.reasons[0]}</span></div><h2>{first.title}</h2><p>{first.recommendedAction}</p><footer>{first.dueAt && <span><CalendarDays size={16} />{formatDateTime(first.dueAt, study.workspace.timezone)}</span>}<div><button className="study-secondary" onClick={() => onEditItem(firstItem)}>Edit</button><button className="study-secondary" onClick={() => onFocus(firstItem)}><Play size={15} /> Focus</button><button className="study-primary" onClick={() => onComplete(firstItem)}><Check size={16} /> Complete</button></div></footer></> : <Empty title="Nothing needs attention." copy="The next Canvas sync or Telegram capture will appear here." />}</section>
      <aside className="study-pulse"><span>This week</span><div><b>{attention.dueToday}</b><small>due today</small></div><div><b>{attention.dueThisWeek}</b><small>due in 7 days</small></div><div><b>{attention.undated}</b><small>without a date</small></div><button onClick={() => onNavigate("study-review")}>Open review <ArrowRight size={15} /></button></aside>
    </div>
    <section className="study-module-strip"><header><div><span>Module shelf</span><h2>Where the semester stands</h2></div><button onClick={() => onNavigate("study-modules")}>All modules <ArrowRight size={15} /></button></header><div>{study.modules.map((module) => <button key={module.id} style={{ "--module-color": module.color ?? "#168b83" } as React.CSSProperties} onClick={() => onOpenModule(module.id)}><Mastery value={module.summary?.status ?? module.currentMastery} /><span>{module.code}</span><h3>{module.name}</h3><small>{module.summary?.open ?? 0} open · {module.summary?.actualMinutes ?? 0} min this week</small><ChevronRight size={17} /></button>)}</div></section>
    {(study.canvas.missingAssignments.length > 0 || study.canvas.state?.status === "ERROR") && <section className="study-inline-alert"><AlertTriangle size={19} /><div><b>Canvas needs a quick check</b><p>{study.canvas.missingAssignments.length ? `${study.canvas.missingAssignments.length} assignment${study.canvas.missingAssignments.length === 1 ? "" : "s"} disappeared from Canvas.` : study.canvas.state?.lastError}</p></div><button onClick={() => onNavigate("study-settings")}>Review</button></section>}
  </>;
}

function Modules({ study, onOpen, onEdit, onAdd, onArchive, onRestore }: { study: StudySnapshot; onOpen: (id: string, view?: StudyView) => void; onEdit: (module: StudyModule) => void; onAdd: () => void; onArchive: (module: StudyModule) => void; onRestore: (module: StudyModule) => void }) {
  return <section className="study-page"><PageHead kicker="Modules" title="Modules" action={<button className="study-primary" onClick={onAdd}><Plus size={16} /> Add module</button>} /><div className="study-module-grid">{study.modules.map((module, index) => <article key={module.id} style={{ "--module-color": module.color ?? "#168b83", "--module-index": index } as React.CSSProperties}><header><span>{module.code}</span><Mastery value={module.summary?.status ?? module.currentMastery} /><div className="study-module-actions"><button onClick={() => onEdit(module)} aria-label={`Edit ${module.code}`}><MoreHorizontal size={19} /></button><button className="study-module-archive" onClick={() => onArchive(module)} aria-label={`Archive ${module.code}`}><Archive size={17} /></button></div></header><h2>{module.name}</h2><p>{module.masteryReason || (module.canvasCourseId ? "Connected to Canvas" : "Module-owned work and references")}</p><div className="study-module-stats"><span><b>{module.summary?.open ?? 0}</b><small>open</small></span><span><b>{module.summary?.overdue ?? 0}</b><small>overdue</small></span><span><b>{module.summary?.actualMinutes ?? 0}</b><small>minutes</small></span></div><footer><button onClick={() => onOpen(module.id, "study-work")}>Open work</button><button onClick={() => onOpen(module.id, "study-library")}>Open library <ArrowRight size={15} /></button></footer></article>)}</div>{study.inactiveModules.length > 0 && <section className="study-inactive-modules"><header><div><span>Archived</span><h2>Archived modules</h2></div></header><div>{study.inactiveModules.map((module) => <article key={module.id}><div><b>{module.code}</b><span>{module.name}</span><small>{module.userArchivedAt ? "Archived by you" : "Waiting for review"}</small></div><button className="study-secondary" onClick={() => onRestore(module)}>{module.userArchivedAt ? "Restore" : "Activate"}</button></article>)}</div></section>}</section>;
}

function Work({ study, moduleFilter, onModuleFilter, onEdit, onAdd, onComplete, onArchive }: { study: StudySnapshot; moduleFilter: string; onModuleFilter: (id: string) => void; onEdit: (item: StudyItem) => void; onAdd: () => void; onComplete: (item: StudyItem) => void; onArchive: (item: StudyItem) => void }) {
  const [status, setStatus] = usePersistentState<"active" | "done" | "all">("threadwise-study-work-status", "active");
  const [query, setQuery] = usePersistentState("threadwise-study-work-query", "");
  const visible = study.items.filter((item) => (moduleFilter === "all" || item.moduleId === moduleFilter)
    && (status === "all" || (status === "done" ? item.status === "DONE" : item.status === "OPEN" || item.status === "IN_PROGRESS"))
    && (!query || `${item.title} ${item.notes ?? ""}`.toLowerCase().includes(query.toLowerCase())));
  return <section className="study-page">
    <PageHead title="Work" action={<button className="study-primary" onClick={onAdd}><Plus size={16} /> Add work</button>} />
    <div className="study-toolbar study-work-toolbar">
      <ModuleSelect modules={study.modules} value={moduleFilter} onChange={onModuleFilter} />
      <div className="study-segmented" role="group" aria-label="Work status">{(["active", "done", "all"] as const).map((value) => <button key={value} aria-pressed={status === value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{value === "active" ? "Open" : value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      <label><Search size={16} /><span className="sr-only">Filter work</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter work" /></label>
    </div>
    <div className="study-work-list">{visible.map((item) => <article key={item.id} className={item.status === "DONE" ? "done" : ""}><button className="study-work-check" onClick={() => onComplete(item)} aria-label={`Complete ${item.title}`}><Check size={17} /></button><button className="study-work-copy" onClick={() => onEdit(item)}><span><b>{item.module.code}</b><em>{item.publicId}</em><i>{humanize(item.type)}</i>{item.source === "CANVAS" && <i>Canvas</i>}</span><h3>{item.title}</h3><p>{item.source === "CANVAS" ? attentionCopy(item) : item.notes || attentionCopy(item)}</p></button><div className="study-work-date"><b>{item.dueAt ? formatDate(item.dueAt, study.workspace.timezone) : "No date"}</b><small>{item.dueAt ? formatTime(item.dueAt, study.workspace.timezone) : "Add one when useful"}</small></div><button className="study-row-menu study-archive-action" onClick={() => onArchive(item)} aria-label={`Archive ${item.title}`}><Archive size={17} /></button></article>)}{!visible.length && <Empty title="Nothing in this view." copy="Change the filters or add work." />}</div>
  </section>;
}

function LibraryView({ study, moduleFilter, activeSession, onModuleFilter, onAdd, onEdit, onPin, onArchive, onToggleSessionResource }: { study: StudySnapshot; moduleFilter: string; activeSession: StudySession | null; onModuleFilter: (id: string) => void; onAdd: (kind: "NOTE" | "LINK" | "QUESTION") => void; onEdit: (resource: StudyResource) => void; onPin: (resource: StudyResource) => void; onArchive: (resource: StudyResource) => void; onToggleSessionResource: (resource: StudyResource) => void }) {
  const [kind, setKind] = usePersistentState<"ALL" | StudyResourceKind>("threadwise-study-library-kind", "ALL"); const [query, setQuery] = usePersistentState("threadwise-study-library-query", "");
  const [openImage, setOpenImage] = useState<StudyResource | null>(null);
  const linkedResourceIds = sessionResourceIds(activeSession);
  const visible = study.resources.filter((resource) => (moduleFilter === "all" || resource.moduleId === moduleFilter) && (kind === "ALL" || resource.kind === kind) && (!query || `${resource.title} ${resource.body ?? ""} ${resource.caption ?? ""} ${resource.ocrText ?? ""}`.toLowerCase().includes(query.toLowerCase())));
  return <section className="study-page">
    <PageHead kicker="Library" title="Library" action={<div className="study-add-cluster"><button onClick={() => onAdd("NOTE")}><FileText size={16} /> Note</button><button onClick={() => onAdd("LINK")}><LinkIcon size={16} /> Link</button><button onClick={() => onAdd("QUESTION")}><CircleHelp size={16} /> Question</button></div>} />
    <div className="study-toolbar study-library-toolbar"><ModuleSelect modules={study.modules} value={moduleFilter} onChange={onModuleFilter} /><select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="ALL">All resources</option>{(["NOTE", "IMAGE", "LINK", "FILE", "QUESTION"] as StudyResourceKind[]).map((value) => <option key={value}>{humanize(value)}</option>)}</select><label><Search size={16} /><span className="sr-only">Search library</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search library" /></label></div>
    <div className="study-resource-grid">{visible.map((resource) => { const caption = imageCaption(resource); const linked = linkedResourceIds.includes(resource.id); const canLink = activeSession?.moduleId === resource.moduleId; return <article key={resource.id} className={`kind-${resource.kind.toLowerCase()}`}><header><span>{resourceIcon(resource.kind)}{resource.module.code}</span><div>{resource.pinnedAt && <Pin size={14} />}{canLink && <button className={`study-resource-session-link${linked ? " active" : ""}`} aria-pressed={linked} onClick={() => onToggleSessionResource(resource)} title={linked ? "Remove from active session" : "Use in active session"} aria-label={linked ? "Remove from active session" : "Use in active session"}><LinkIcon size={16} /></button>}<button onClick={() => onPin(resource)} aria-label={resource.pinnedAt ? "Unpin resource" : "Pin resource"}><Pin size={16} /></button><button className="study-archive-action" onClick={() => onArchive(resource)} aria-label="Archive resource"><Archive size={16} /></button></div></header>{resource.kind === "IMAGE" ? <><button className="study-resource-image" onClick={() => setOpenImage(resource)} aria-label={`View ${caption || "saved image"}`}><img src={`/api/threadwise/study/resources/${resource.id}/content`} alt={caption || `Saved image for ${resource.module.code}`} /></button>{caption && <button className="study-resource-copy study-image-caption" onClick={() => setOpenImage(resource)}><p>{caption}</p></button>}</> : <button className="study-resource-copy" onClick={() => onEdit(resource)}><h3>{resource.title}</h3><p>{resource.body || resource.caption || resource.url || resource.fileName || "Open resource"}</p></button>}<footer><span>{resource.publicId}</span>{resource.tags.slice(0, 2).map((tag) => <i key={tag}>#{tag}</i>)}{linked && <i>In session</i>}{resource.kind === "IMAGE" && <button className="study-resource-open" onClick={() => setOpenImage(resource)}>View <ExternalLink size={13} /></button>}{resource.kind === "FILE" && <a href={`/api/threadwise/study/resources/${resource.id}/content`} target="_blank" rel="noreferrer">Open <ExternalLink size={13} /></a>}</footer></article>; })}{!visible.length && <Empty title="No resources here yet." copy="Capture one in Telegram or add a note, link, or question here." />}</div>
    {openImage && <StudyImageViewer key={openImage.id} resource={openImage} timezone={study.workspace.timezone} onEdit={() => { onEdit(openImage); setOpenImage(null); }} onArchive={() => { onArchive(openImage); setOpenImage(null); }} onClose={() => setOpenImage(null)} />}
  </section>;
}

function StudyImageViewer({ resource, timezone, onEdit, onArchive, onClose }: { resource: StudyResource; timezone: string; onEdit: () => void; onArchive: () => void; onClose: () => void }) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; src?: string; message?: string; retryable?: boolean }>({ status: "loading" });
  const closeRef = useRef<HTMLButtonElement>(null);
  const caption = imageCaption(resource);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void loadStudyImage(resource.id, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setState({ status: "ready", src: objectUrl });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "The image could not be loaded.",
          retryable: error instanceof StudyImageLoadError ? error.retryable : true,
        });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resource.id, revision]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", keydown);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", keydown);
  }, [onClose]);

  return <div className="study-image-lightbox" role="dialog" aria-modal="true" aria-labelledby="study-image-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <article>
      <header><div><span>{resource.module.code} · {resource.publicId}</span><h2 id="study-image-title">{caption || "Saved image"}</h2></div><div className="study-image-header-actions"><button onClick={onEdit}>Edit</button><button className="study-danger-quiet" onClick={onArchive}>Archive</button><button ref={closeRef} onClick={onClose} aria-label="Close image"><X size={20} /></button></div></header>
      <div className="study-image-stage" aria-live="polite">
        {state.status === "loading" && <div><LoaderCircle className="spin" size={25} /><b>Loading image…</b></div>}
        {state.status === "ready" && state.src && <img src={state.src} alt={resource.caption || resource.title} />}
        {state.status === "error" && <div><AlertCircle size={25} /><b>Image unavailable</b><p>{state.message}</p><span className="study-image-error-actions">{state.retryable && <button className="study-secondary" onClick={() => { setState({ status: "loading" }); setRevision((value) => value + 1); }}><RefreshCw size={15} /> Try again</button>}<button className="study-secondary" onClick={onClose}>Close</button></span></div>}
      </div>
      <div className="study-image-context">
        {caption && <p>{caption}</p>}
        <div className="study-image-meta"><span>{resource.module.code}</span><span>{formatDate(resource.createdAt, timezone)}</span>{resource.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
        {resource.ocrText && <details><summary>Searchable text</summary><p>{resource.ocrText}</p></details>}
      </div>
    </article>
  </div>;
}

function Review({ study, busy, onMastery, onResolveMistake, onAddMistake, onSavePlan, onSaveReview }: { study: StudySnapshot; busy: boolean; onMastery: (module: StudyModule, mastery: StudyTrafficLight, reason?: string) => void; onResolveMistake: (mistake: StudyMistake) => void; onAddMistake: () => void; onSavePlan: (body: unknown) => Promise<unknown>; onSaveReview: (body: unknown) => Promise<unknown> }) {
  const initialPriorities = study.week?.topPriorities ?? [];
  const [priorities, setPriorities] = useState<[string, string, string]>([initialPriorities[0] ?? "", initialPriorities[1] ?? "", initialPriorities[2] ?? ""]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const updatePriority = (index: number, value: string) => setPriorities((current) => current.map((entry, entryIndex) => entryIndex === index ? value : entry) as [string, string, string]);
  return <section className="study-page"><PageHead kicker="Review" title="Close the loop." copy="Mastery, mistakes, and next-week priorities." action={<button className="study-primary" onClick={() => setReviewOpen(true)}><Brain size={16} /> Weekly review</button>} /><div className="study-review-layout"><section className="study-mastery-board"><header><h2>Module mastery</h2><span>Set the current signal</span></header>{study.modules.map((module) => <article key={module.id}><div><b>{module.code}</b><span>{module.name}</span></div><div className="study-mastery-buttons" role="group" aria-label={`${module.code} mastery`}>{MASTERY.map((value) => <button key={value} aria-pressed={module.currentMastery === value} data-mastery={value} className={module.currentMastery === value ? "active" : ""} onClick={() => onMastery(module, value)}>{masteryLabel(value)}</button>)}</div></article>)}</section><aside className="study-plan"><form onSubmit={(event) => { event.preventDefault(); void onSavePlan({ priorities: priorities.map((value) => value.trim()).filter(Boolean) }); }}><header><h2>Top three</h2><p>Three explicit outcomes. Nothing is silently discarded.</p></header><div className="study-priority-fields">{priorities.map((priority, index) => <label key={index}>Priority {index + 1}<input value={priority} onChange={(event) => updatePriority(index, event.target.value)} maxLength={500} placeholder={index === 0 ? "The outcome that matters most" : "Optional"} /></label>)}</div><footer><button type="submit" className="study-primary" disabled={busy || priorities.every((value) => !value.trim())}>Save week plan</button></footer></form></aside></div><section className="study-mistake-ledger"><header><div><span>Mistake ledger</span><h2>Patterns worth revisiting</h2></div><button className="study-secondary" onClick={onAddMistake}><Plus size={15} /> Record mistake</button></header><div>{study.mistakes.filter((mistake) => mistake.status !== "RESOLVED").map((mistake) => <article key={mistake.id}><span>{mistake.module.code}</span><div><h3>{mistake.source}</h3><p>{mistake.cause}</p><small>Prevent it: {mistake.prevention}</small></div><button onClick={() => onResolveMistake(mistake)}><Check size={15} /> Resolve</button></article>)}{!study.mistakes.some((mistake) => mistake.status !== "RESOLVED") && <Empty title="No open mistake patterns." copy="Record one when a wrong answer reveals something reusable." />}</div></section>{reviewOpen && <WeeklyReviewSheet study={study} busy={busy} onClose={() => setReviewOpen(false)} onSave={async (body) => { const saved = await onSaveReview(body); if (saved) setReviewOpen(false); }} />}</section>;
}

function StudySearch({ study, onNavigate, onEditItem, onEditResource }: { study: StudySnapshot; onNavigate: (view: StudyView) => void; onEditItem: (item: StudyItem) => void; onEditResource: (resource: StudyResource) => void }) {
  const [query, setQuery] = usePersistentState("threadwise-study-search-query", "");
  const [kind, setKind] = usePersistentState("threadwise-study-search-kind", "all");
  const [results, setResults] = useState<Array<{ id: string; publicId: string; kind: string; title: string; excerpt?: string; module: { code: string } }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchRevision = useRef(0);
  const changeQuery = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      searchRevision.current += 1;
      setResults([]);
      setSearchError(false);
      setLoading(false);
    }
  };
  useEffect(() => {
    const revision = ++searchRevision.current;
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setSearchError(false);
      const kinds = kind === "all" ? "" : `&kinds=${encodeURIComponent(kind)}`;
      void studyApi<{ results: typeof results }>(`study/search?q=${encodeURIComponent(query)}${kinds}`)
        .then((body) => { if (revision === searchRevision.current) setResults(body.results); })
        .catch(() => { if (revision === searchRevision.current) { setResults([]); setSearchError(true); } })
        .finally(() => { if (revision === searchRevision.current) setLoading(false); });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, kind]);
  const open = (result: (typeof results)[number]) => {
    if (result.kind === "work") {
      const item = study.items.find((value) => value.id === result.id);
      if (item) onEditItem(item);
      return;
    }
    if (result.kind === "mistake") {
      onNavigate("study-review");
      return;
    }
    const resource = study.resources.find((value) => value.id === result.id);
    if (resource) void onEditResource(resource);
  };
  return <section className="study-page study-search-page"><PageHead kicker="Study search" title="Recall across the semester." copy="Titles, note text, image OCR, files, questions, and mistakes." /><div className="study-search-box"><Search size={23} /><label className="sr-only" htmlFor="study-search-input">Search the semester</label><input id="study-search-input" autoFocus value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Search while you type" />{loading && <LoaderCircle className="spin" size={19} aria-label="Searching" />}</div><div className="study-search-tabs" role="group" aria-label="Search content type">{[["all", "Everything"], ["work", "Work"], ["notes", "Notes"], ["images", "Images"], ["files", "Files"], ["mistakes", "Mistakes"]].map(([value, label]) => <button key={value} aria-pressed={kind === value} className={kind === value ? "active" : ""} onClick={() => setKind(value)}>{label}</button>)}</div><div className="study-search-results">{results.map((result) => <button key={`${result.kind}-${result.id}`} onClick={() => open(result)}><span>{result.module.code}</span><div><b>{result.title}</b><p>{result.excerpt || humanize(result.kind)}</p></div><em>{result.publicId}</em><ChevronRight size={17} /></button>)}{query.length < 2 ? <Empty title="Find something you captured." copy="Type at least two characters. Results update immediately." /> : searchError ? <Empty title="Search paused." copy="Threadwise could not search just now. Keep the phrase here and try again." /> : !loading && !results.length ? <Empty title="Nothing matched." copy="Try a module code, filename, phrase, or OCR text." /> : null}</div></section>;
}

// Kept temporarily as a migration reference while the Phase 1 control centre is verified live.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DeepWork({ study, busy, initialItemId, onStart, onStop, onComplete, onRecordMistake, onBackToWork }: { study: StudySnapshot; busy: boolean; initialItemId?: string; onStart: (body: unknown) => Promise<unknown>; onStop: (body: unknown) => Promise<unknown>; onComplete: (item: StudyItem) => Promise<void>; onRecordMistake: (item: StudyItem) => void; onBackToWork: () => void }) {
  const open = study.overview.openSession;
  const initialItem = study.items.find((item) => item.id === initialItemId);
  const [moduleId, setModuleId] = useState(initialItem?.moduleId || study.workspace.activeModuleId || study.modules[0]?.id || "");
  const [itemId, setItemId] = useState(initialItemId || "");
  const [method, setMethod] = useState("Focused study");
  const [result, setResult] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<StudySnapshot["sessions"][number] | null>(null);
  const availableItems = study.items.filter((item) => item.status === "OPEN" || item.status === "IN_PROGRESS");
  useEffect(() => {
    if (!open) return;
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(open.startedAt).getTime()) / 1_000)));
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1_000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [open]);
  const outcomeItem = lastOutcome?.item ? study.items.find((item) => item.id === lastOutcome.itemId) : undefined;
  return <section className="study-page"><PageHead kicker="Deep Work" title={open ? "Stay with the thread." : lastOutcome ? "Close the loop." : "Start with a clear target."} copy={open ? `${open.moduleCode} · ${open.item?.title || open.method}` : lastOutcome ? "Turn the recorded session into a clear next state." : "One target, one method, one recorded block."} />{lastOutcome && !open && <section className="study-focus-outcome" aria-live="polite"><div><CheckCircle2 size={20} /><span><b>{lastOutcome.durationMinutes ?? 0} minutes recorded</b><small>{lastOutcome.item?.title || lastOutcome.method}</small></span></div><div>{outcomeItem && outcomeItem.status !== "DONE" && <button className="study-primary" onClick={() => void onComplete(outcomeItem)}><Check size={15} /> Complete target</button>}{outcomeItem && <button className="study-secondary" onClick={() => onRecordMistake(outcomeItem)}><Brain size={15} /> Record mistake</button>}<button className="study-secondary" onClick={onBackToWork}>Back to work</button><button className="study-quiet" onClick={() => setLastOutcome(null)}>Another session</button></div></section>}<div className={`study-focus-stage ${open ? "running" : ""}`}><Ari variant={open ? "threading" : "full"} decorative />{open ? <div className="study-focus-running"><span>Session running</span>{open.item && <strong>{open.item.publicId} · {open.item.title}</strong>}<b>{formatDuration(elapsed)}</b><p>Started {formatTime(open.startedAt, study.workspace.timezone)}. This session remains active if the connection drops.</p><label>What changed?<textarea value={result} onChange={(event) => setResult(event.target.value)} placeholder="Result, score, or what remains" rows={4} /></label><button className="study-primary" disabled={busy} onClick={async () => { const stopped = await onStop({ result: result || undefined }) as { session?: StudySnapshot["sessions"][number] } | undefined; if (stopped?.session) { setLastOutcome(stopped.session); setResult(""); } }}><Square size={15} /> Stop and record</button></div> : !lastOutcome && <form onSubmit={(event) => { event.preventDefault(); void onStart({ moduleId, method, ...(itemId ? { itemId } : {}) }); }}><label>Target<select value={itemId} onChange={(event) => { const next = event.target.value; setItemId(next); const item = study.items.find((value) => value.id === next); if (item) setModuleId(item.moduleId); }}><option value="">Module-only session</option>{availableItems.map((item) => <option key={item.id} value={item.id}>{item.module.code} · {item.publicId} · {item.title}</option>)}</select></label><label>Module<select value={moduleId} disabled={Boolean(itemId)} onChange={(event) => setModuleId(event.target.value)}>{study.modules.map((module) => <option key={module.id} value={module.id}>{module.code} · {module.name}</option>)}</select></label><label>Method<input value={method} onChange={(event) => setMethod(event.target.value)} placeholder="e.g. Timed mixed problems" /></label><button className="study-primary" disabled={busy || !moduleId || !method.trim()}><Play size={16} /> Start session</button></form>}</div><section className="study-session-history"><header><span>Recent blocks</span><h2>What the time became</h2></header>{study.sessions.filter((session) => session.endedAt).slice(0, 8).map((session) => <article key={session.id}><b>{session.module.code}</b><div><h3>{session.item?.title || session.method}</h3><p>{session.result || session.method}</p></div><span>{session.durationMinutes ?? 0} min</span></article>)}</section></section>;
}

type DeepWorkPhaseOneProps = {
  study: StudySnapshot;
  busy: boolean;
  initialItemId?: string;
  activeSession: StudySession | null;
  outcome: StudySession | null;
  onDismissOutcome: () => void;
  onStart: (body: unknown) => Promise<unknown>;
  onStop: (body: unknown) => Promise<unknown>;
  onUpdate: (sessionId: string, body: unknown) => Promise<unknown>;
  onArchive: (session: StudySession) => Promise<unknown>;
  onComplete: (item: StudyItem) => Promise<void>;
  onRecordMistake: (item: StudyItem) => void;
  onOpenLibrary: (moduleId: string) => void;
};

function DeepWorkPhaseOne({ study, busy, initialItemId, activeSession, outcome, onDismissOutcome, onStart, onStop, onUpdate, onArchive, onComplete, onRecordMistake, onOpenLibrary }: DeepWorkPhaseOneProps) {
  const initialItem = study.items.find((item) => item.id === initialItemId && isUsefulFocusTarget(item));
  const [moduleId, setModuleId] = useState(initialItem?.moduleId || study.workspace.activeModuleId || study.modules[0]?.id || "");
  const [itemId, setItemId] = useState(initialItem?.id || "");
  const [topic, setTopic] = useState("");
  const [focusStructure, setFocusStructure] = useState<FocusStructureId>("uninterrupted");
  const [techniques, setTechniques] = useState<string[]>([]);
  const [customMethod, setCustomMethod] = useState("");
  const [resourceIds, setResourceIds] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const [editing, setEditing] = useState<StudySession | null>(null);
  const elapsed = useSessionElapsed(activeSession?.startedAt);
  const availableItems = study.items.filter((item) => (item.status === "OPEN" || item.status === "IN_PROGRESS") && isUsefulFocusTarget(item));
  const selectedResources = study.resources.filter((resource) => resource.moduleId === moduleId);
  const validResourceIds = resourceIds.filter((id) => selectedResources.some((resource) => resource.id === id));
  const completedSessions = study.sessions.filter((session) => session.endedAt && !session.archivedAt);
  const outcomeItem = outcome?.itemId ? study.items.find((item) => item.id === outcome.itemId) : undefined;

  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    const method = sessionMethodSummary(focusStructure, techniques, customMethod);
    await onStart({ moduleId, itemId: itemId || undefined, topic: topic.trim() || undefined, focusStructure, techniques, method, resourceIds: validResourceIds });
  };

  return <section className="study-page study-deep-work-page">
    <PageHead kicker="Deep Work" title={activeSession ? "Session in progress" : "Deep Work"} />

    {activeSession && <section className="study-active-session" style={{ "--module-color": activeSession.module.color ?? "#168b83" } as React.CSSProperties}>
      <div className="study-active-ari"><Ari variant="threading" decorative /></div>
      <div className="study-active-copy">
        <span>{activeSession.module.code}</span>
        <h2>{activeSession.item?.title || activeSession.topic || "Module session"}</h2>
        <p>{sessionMethodSummary(activeSession.focusStructure, activeSession.techniques, sessionCustomMethod(activeSession))}</p>
        <b>{formatDuration(elapsed)}</b>
        <small>Started {formatTime(activeSession.startedAt, study.workspace.timezone)}</small>
      </div>
      <label className="study-session-result">Result or next step<textarea rows={3} value={result} onChange={(event) => setResult(event.target.value)} placeholder="Optional" /></label>
      <div className="study-active-actions">
        <button className="study-secondary" onClick={() => setEditing(activeSession)}>Edit session</button>
        <button className="study-primary" disabled={busy} onClick={() => void onStop({ result: result.trim() || undefined })}><Square size={15} /> End session</button>
      </div>
      {activeSession.resources.length > 0 && <div className="study-session-resources"><span>Linked resources</span>{activeSession.resources.map(({ resource }) => <button key={resource.id} onClick={() => onOpenLibrary(resource.moduleId)}>{resourceIcon(resource.kind)}<b>{resource.title}</b><ChevronRight size={15} /></button>)}</div>}
    </section>}

    {outcome && !activeSession && <section className="study-focus-outcome study-session-receipt" aria-live="polite">
      <div><CheckCircle2 size={20} /><span><b>{outcome.durationMinutes ?? 0} minutes recorded</b><small>{formatDateTime(outcome.startedAt, study.workspace.timezone)}{outcome.endedAt ? ` \u2013 ${formatTime(outcome.endedAt, study.workspace.timezone)}` : ""}</small></span></div>
      <div>{outcomeItem && outcomeItem.status !== "DONE" && <button className="study-primary" onClick={() => void onComplete(outcomeItem)}><Check size={15} /> Complete target</button>}{outcomeItem && <button className="study-secondary" onClick={() => onRecordMistake(outcomeItem)}><Brain size={15} /> Record mistake</button>}<button className="study-secondary" onClick={() => setEditing(outcome)}>Edit record</button><button className="study-quiet" onClick={onDismissOutcome}>Dismiss</button></div>
    </section>}

    {!activeSession && <form className="study-session-builder" onSubmit={start}>
      <div className="study-session-builder-head"><Ari variant="full" decorative /><h2>New session</h2></div>
      <div className="study-session-fields">
        <StudyChoicePicker label="Target" value={itemId} placeholder="Module-only session" searchable options={availableItems.map((item) => ({ value: item.id, label: `${item.module.code} · ${item.publicId}`, detail: item.title }))} onChange={(next) => { setItemId(next); setResourceIds([]); const item = study.items.find((value) => value.id === next); if (item) setModuleId(item.moduleId); }} />
        <StudyChoicePicker label="Module" value={moduleId} disabled={Boolean(itemId)} options={study.modules.map((module) => ({ value: module.id, label: module.code, detail: module.name }))} onChange={(next) => { setModuleId(next); setResourceIds([]); }} />
        <label className="study-field-wide">Topic or intention<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="What are you working on?" /></label>
      </div>
      <StudyMethodPicker focusStructure={focusStructure} techniques={techniques} customMethod={customMethod} onFocusStructure={setFocusStructure} onTechniques={setTechniques} onCustomMethod={setCustomMethod} />
      <StudyResourcePicker resources={selectedResources} resourceIds={validResourceIds} onChange={setResourceIds} optional />
      <button className="study-primary study-start-session" disabled={busy || !moduleId}><Play size={16} /> Start session</button>
    </form>}

    <section className="study-session-history">
      <header><span>History</span><h2>Recorded sessions</h2></header>
      {completedSessions.length ? completedSessions.slice(0, 12).map((session) => <article key={session.id}>
        <b>{session.module.code}</b>
        <div><h3>{session.item?.title || session.topic || "Module session"}</h3><p>{sessionMethodSummary(session.focusStructure, session.techniques, sessionCustomMethod(session))}</p><small>{formatDateTime(session.startedAt, study.workspace.timezone)}{session.endedAt ? ` \u2013 ${formatTime(session.endedAt, study.workspace.timezone)}` : ""}</small></div>
        <span>{session.durationMinutes ?? 0} min</span>
        <button className="study-icon" aria-label={`Edit ${session.module.code} session`} onClick={() => setEditing(session)}><MoreHorizontal size={18} /></button>
        <button className="study-icon danger" aria-label={`Remove ${session.module.code} session`} onClick={() => confirmAction("Remove this session from Deep Work history? The recorded study minutes will also be removed.", () => onArchive(session))}><Trash2 size={17} /></button>
      </article>) : <Empty title="No sessions yet" copy="Your completed sessions will appear here." />}
    </section>

    <StudyModuleAnalysisPanel study={study} />

    {editing && <StudySessionEditor session={editing} study={study} busy={busy} onClose={() => setEditing(null)} onSave={async (body) => { const saved = await onUpdate(editing.id, body); if (saved) setEditing(null); }} />}
  </section>;
}

function StudyModuleAnalysisPanel({ study }: { study: StudySnapshot }) {
  const modules = useMemo(() => studyAnalysisModules(study.modules, study.sessions, study.resources), [study.modules, study.resources, study.sessions]);
  const initialModuleId = useMemo(() => studyAnalysisInitialModuleId(study.modules, study.sessions, study.resources, study.workspace.activeModuleId), [study.modules, study.resources, study.sessions, study.workspace.activeModuleId]);
  const [chosenModuleId, setChosenModuleId] = useState(initialModuleId);
  const moduleId = modules.some((module) => module.id === chosenModuleId) ? chosenModuleId : initialModuleId;
  const [mode, setMode] = useState<StudyAnalysisMode>("CONNECTIONS");
  const [loadedResponse, setLoadedResponse] = useState<{ moduleId: string; mode: StudyAnalysisMode; value: StudyModuleAnalysisResponse } | null>(null);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [requestError, setRequestError] = useState("");
  const requestSequence = useRef(0);
  const response = loadedResponse?.moduleId === moduleId && loadedResponse.mode === mode ? loadedResponse.value : null;

  const loadCached = useCallback(async (quiet = false) => {
    if (!moduleId) return;
    const sequence = ++requestSequence.current;
    if (!quiet) setLoading(true);
    try {
      const next = await studyApi<StudyModuleAnalysisResponse>(`study/modules/${moduleId}/analysis?mode=${mode}`);
      if (sequence === requestSequence.current) {
        setLoadedResponse({ moduleId, mode, value: next });
        setLoadError("");
      }
    } catch (error) {
      if (sequence === requestSequence.current) setLoadError(error instanceof Error ? error.message : "The saved analysis could not be loaded.");
    } finally {
      if (!quiet && sequence === requestSequence.current) setLoading(false);
    }
  }, [mode, moduleId]);

  useEffect(() => {
    if (!moduleId) return;
    const timer = window.setTimeout(() => void loadCached(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCached, moduleId]);

  const analysisStatus = response?.analysis?.status;
  useEffect(() => {
    if (analysisStatus !== "QUEUED" && analysisStatus !== "RUNNING") return;
    const interval = window.setInterval(() => void loadCached(true), 3500);
    return () => window.clearInterval(interval);
  }, [analysisStatus, loadCached]);

  const requestAnalysis = async () => {
    if (!moduleId || !response?.available || requesting) return;
    setRequesting(true);
    setRequestError("");
    try {
      const next = await studyApi<StudyModuleAnalysisResponse>(`study/modules/${moduleId}/analysis`, "POST", { mode });
      setLoadedResponse({ moduleId, mode, value: next });
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "The analysis could not be started.");
    } finally {
      setRequesting(false);
    }
  };

  const analysis = response?.analysis;
  const evidence = analysis?.evidence ?? [];
  const evidenceNumbers = studyAnalysisEvidenceNumbers(evidence.map((entry) => entry.id));
  const findings: Array<{ title: string; items?: StudyAnalysisFinding[] }> = [
    { title: "Connections", items: analysis?.connections },
    { title: "Next steps", items: analysis?.nextSteps },
  ];
  const actionableFindings = findings.filter((group) => group.items?.length);
  const isWorking = analysis?.status === "QUEUED" || analysis?.status === "RUNNING";
  const actionLabel = studyAnalysisAction(analysis);

  if (!modules.length) return <section className="study-module-analysis study-module-analysis-empty" aria-label="Module review">
    <Brain size={18} />
    <div><b>Module review</b><span>Complete a module session first.</span></div>
  </section>;

  return <section className="study-module-analysis" aria-busy={loading || requesting || isWorking} aria-labelledby="study-analysis-title">
    <header>
      <div><span>Module review</span><h2 id="study-analysis-title">Connect, correct &amp; challenge</h2></div>
      <div className="study-analysis-controls">
        <StudyChoicePicker label="Module" value={moduleId} allowEmpty={false} options={modules.map((module) => ({ value: module.id, label: module.code, detail: module.name }))} onChange={(next) => { setChosenModuleId(next); setLoading(true); setRequestError(""); }} />
        <StudyChoicePicker label="Review type" value={mode} allowEmpty={false} options={[{ value: "CONNECTIONS", label: "Connections" }, { value: "QUIZ", label: "Quiz" }, { value: "BOTH", label: "Both" }]} onChange={(next) => { setMode(next as StudyAnalysisMode); setLoading(true); setRequestError(""); }} />
        {response?.available && !isWorking && actionLabel && <button className="study-primary" disabled={requesting} onClick={() => void requestAnalysis()}>{requesting ? <LoaderCircle className="spin" size={15} /> : analysis?.status === "COMPLETE" ? <RefreshCw size={15} /> : <Brain size={15} />}{actionLabel}</button>}
        {analysis?.status === "COMPLETE" && !analysis.stale && <span className="study-analysis-current"><CheckCircle2 size={14} /> Up to date</span>}
      </div>
    </header>

    <div className="study-analysis-status" aria-live="polite">
      {loading && !analysis && <><LoaderCircle className="spin" size={17} /><span>Checking saved analysis…</span></>}
      {!loading && loadError && !analysis && <><AlertCircle size={17} /><span>{loadError}</span><button className="study-quiet" onClick={() => void loadCached()}>Retry</button></>}
      {!loading && !loadError && response && !analysis && response.available && <><Brain size={17} /><span>No saved analysis.</span></>}
      {!loading && !loadError && response && !analysis && !response.available && <><AlertCircle size={17} /><span>{studyAnalysisReason(response.reason)}</span></>}
      {isWorking && <><LoaderCircle className="spin" size={17} /><span>Connecting sessions, notes and Canvas material…</span></>}
      {analysis?.status === "FAILED" && <><AlertCircle size={17} /><span>{analysis.errorMessage || "The analysis did not finish."}</span></>}
      {analysis?.status === "COMPLETE" && analysis.stale && <><AlertTriangle size={17} /><span>New records are available. The saved analysis may be out of date.</span></>}
      {analysis?.status === "COMPLETE" && !response?.available && <><AlertCircle size={17} /><span>{studyAnalysisReason(response?.reason, "New analysis is unavailable. The saved result remains below.")}</span></>}
      {(requestError || (loadError && Boolean(analysis))) && <><AlertCircle size={17} /><span>{requestError || loadError}</span></>}
    </div>

    {analysis?.status === "COMPLETE" && <div className="study-analysis-result">
      <div className="study-analysis-meta">
        <span><CheckCircle2 size={15} /> Saved {analysis.completedAt ? formatDateTime(analysis.completedAt, study.workspace.timezone) : "analysis"}</span>
        <span>{analysis.sessionCount} session{analysis.sessionCount === 1 ? "" : "s"} · {analysis.resourceCount} resource{analysis.resourceCount === 1 ? "" : "s"}</span>
      </div>
      {analysis.summary && <p className="study-analysis-summary">{analysis.summary}</p>}
      {analysis.pace && <div className={`study-analysis-pace pace-${analysis.pace.status.toLowerCase()}`}><b>{analysis.pace.status === "UNKNOWN" ? "Study pace not yet measurable" : analysis.pace.status.replace("_", " ")}</b><span>{analysis.pace.detail}</span></div>}
      {actionableFindings.length > 0 && <div className="study-analysis-findings">{actionableFindings.map((group) => <StudyAnalysisFindingGroup key={group.title} title={group.title} items={group.items ?? []} evidenceNumbers={evidenceNumbers} />)}</div>}
      {Boolean(analysis.misconceptions?.length) && <section className="study-analysis-corrections"><h3>Clarifications &amp; corrections</h3>{analysis.misconceptions?.map((item, index) => <article key={`${item.title}-${index}`}><div><b>{item.title}</b><span>{item.confidence.toLowerCase()} confidence</span></div><p><del>{item.learnerClaim}</del></p><p>{item.correction}<StudyCitationLinks ids={item.evidenceIds} numbers={evidenceNumbers} /></p></article>)}</section>}
      {Boolean(analysis.quiz?.length) && <StudyAnalysisQuiz items={analysis.quiz ?? []} evidenceNumbers={evidenceNumbers} />}
      {Boolean(analysis.noteEditSuggestions?.length) && <section className="study-analysis-note-edits"><h3>Suggested note edits</h3><p>Nothing changes until you apply it. You can edit the proposed wording first.</p>{analysis.noteEditSuggestions?.map((suggestion) => <StudyNoteSuggestionCard key={suggestion.id} suggestion={suggestion} evidenceNumbers={evidenceNumbers} onReviewed={() => void loadCached(true)} />)}</section>}
      {evidence.length > 0 && <StudyAnalysisEvidenceList evidence={evidence} timezone={study.workspace.timezone} />}
      <p className="study-analysis-disclaimer"><AlertTriangle size={14} /> <span><b>AI-assisted review.</b> Check corrections and answers against the cited course material. Threadwise never applies a suggested note edit without your confirmation.</span></p>
    </div>}
  </section>;
}

function StudyCitationLinks({ ids, numbers }: { ids: string[]; numbers: Map<string, number> }) {
  const citations = ids.map((id) => numbers.get(id)).filter((value): value is number => value !== undefined);
  return citations.length ? <span className="study-analysis-citations" aria-label="Evidence citations">{citations.map((number) => <a key={number} href={`#study-analysis-evidence-${number}`} aria-label={`Evidence ${number}`}>[{number}]</a>)}</span> : null;
}

function StudyAnalysisFindingGroup({ title, items, evidenceNumbers }: { title: string; items: StudyAnalysisFinding[]; evidenceNumbers: Map<string, number> }) {
  return <section><h3>{title}</h3><ul>{items.map((finding, index) => {
    return <li key={`${finding.title}-${index}`}><b>{finding.title}</b><p>{finding.detail}<StudyCitationLinks ids={finding.evidenceIds} numbers={evidenceNumbers} /></p></li>;
  })}</ul></section>;
}

function StudyAnalysisQuiz({ items, evidenceNumbers }: { items: StudyAnalysisQuizItem[]; evidenceNumbers: Map<string, number> }) {
  return <section className="study-analysis-quiz"><h3>Challenge quiz</h3><div>{items.map((item, index) => <details key={`${item.question}-${index}`}><summary><span>{index + 1}</span><div><b>{item.question}</b><small>{item.difficulty.toLowerCase()} · {item.type.toLowerCase()}</small></div></summary>{item.options.length > 0 && <ol>{item.options.map((option) => <li key={option}>{option}</li>)}</ol>}<div className="study-quiz-answer"><b>Answer</b><p>{item.answer}</p><p>{item.explanation}<StudyCitationLinks ids={item.evidenceIds} numbers={evidenceNumbers} /></p></div></details>)}</div></section>;
}

function StudyNoteSuggestionCard({ suggestion, evidenceNumbers, onReviewed }: { suggestion: StudyNoteEditSuggestion; evidenceNumbers: Map<string, number>; onReviewed: () => void }) {
  const [draft, setDraft] = useState(suggestion.suggestedBody);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const review = async (action: "APPLY" | "DISMISS") => {
    setBusy(true); setError("");
    try {
      await studyApi(`study/analysis-suggestions/${suggestion.id}`, "PATCH", action === "APPLY" ? { action, replacementText: draft } : { action });
      onReviewed();
    } catch (value) { setError(value instanceof Error ? value.message : "The suggestion could not be reviewed."); }
    finally { setBusy(false); }
  };
  return <article className={`study-note-suggestion status-${suggestion.status.toLowerCase()}`}><header><b>{suggestion.status === "PENDING" ? "Review proposed wording" : suggestion.status.toLowerCase()}</b><StudyCitationLinks ids={suggestion.evidenceIds} numbers={evidenceNumbers} /></header><p>{suggestion.rationale}</p><label><span>Proposed note</span><textarea value={draft} disabled={busy || suggestion.status !== "PENDING"} onChange={(event) => setDraft(event.target.value)} rows={6} /></label>{error && <small role="alert">{error}</small>}{suggestion.status === "PENDING" && <div><button className="study-quiet" disabled={busy} onClick={() => void review("DISMISS")}>Dismiss</button><button className="study-primary" disabled={busy || !draft.trim()} onClick={() => void review("APPLY")}>{busy ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}Apply edit</button></div>}</article>;
}

function StudyAnalysisEvidenceList({ evidence, timezone }: { evidence: StudyAnalysisEvidence[]; timezone: string }) {
  return <details className="study-analysis-evidence"><summary>Evidence <span>{evidence.length}</span></summary><ol>{evidence.map((entry, index) => <li key={entry.id} id={`study-analysis-evidence-${index + 1}`}>
    <span>{index + 1}</span><div><b>{entry.title}</b><small>{studyEvidenceLabel(entry)}{entry.occurredAt ? ` · ${formatDateTime(entry.occurredAt, timezone)}` : ""}</small>{entry.detail && <p>{entry.detail}</p>}</div>
  </li>)}</ol></details>;
}

function studyEvidenceLabel(entry: StudyAnalysisEvidence) {
  const kind = entry.kind === "CANVAS_MATERIAL" ? "Canvas material" : entry.kind === "CANVAS_ASSIGNMENT" ? "Canvas assignment" : entry.kind === "WORK_ITEM" ? "Work item" : entry.kind.toLowerCase();
  return `${kind} · ${entry.authority.toLowerCase().replaceAll("_", " ")}`;
}

function StudyMethodPicker({ focusStructure, techniques, customMethod, onFocusStructure, onTechniques, onCustomMethod }: { focusStructure: FocusStructureId; techniques: string[]; customMethod: string; onFocusStructure: (value: FocusStructureId) => void; onTechniques: (value: string[]) => void; onCustomMethod: (value: string) => void }) {
  return <div className="study-method-picker">
    <fieldset><legend>Focus structure</legend><div className="study-method-options">{FOCUS_STRUCTURES.map((option) => <label key={option.id} className={focusStructure === option.id ? "selected" : ""}><input type="radio" name="focus-structure" value={option.id} checked={focusStructure === option.id} onChange={() => onFocusStructure(option.id)} /><span><b>{option.label}</b><small>{option.note}</small></span></label>)}</div></fieldset>
    <fieldset><legend>Techniques <small>Select any that apply</small></legend><div className="study-technique-options">{STUDY_TECHNIQUES.map((technique) => <button type="button" key={technique} aria-pressed={techniques.includes(technique)} onClick={() => onTechniques(techniques.includes(technique) ? techniques.filter((value) => value !== technique) : [...techniques, technique])}>{techniques.includes(technique) && <Check size={14} />}{technique}</button>)}</div></fieldset>
    <label>Custom method or session topic<input value={customMethod} onChange={(event) => onCustomMethod(event.target.value)} placeholder="Optional" /></label>
  </div>;
}

function StudyResourcePicker({ resources, resourceIds, onChange, optional = false }: { resources: StudyResource[]; resourceIds: string[]; onChange: (ids: string[]) => void; optional?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const selected = resources.filter((resource) => resourceIds.includes(resource.id));
  const available = resources.filter((resource) => !resourceIds.includes(resource.id) && (!query || `${resource.title} ${resource.kind}`.toLowerCase().includes(query.toLowerCase())));
  const remove = (id: string) => onChange(resourceIds.filter((value) => value !== id));
  const add = (id: string) => onChange([...resourceIds, id]);
  return <fieldset className="study-resource-picker study-resource-picker-progressive">
    <legend>Linked resources {optional && <small>Optional</small>}</legend>
    {selected.length > 0 && <div className="study-resource-selected">{selected.map((resource) => <button type="button" key={resource.id} onClick={() => remove(resource.id)} aria-label={`Remove ${resource.title}`}>
      {resourceIcon(resource.kind)}<span><b>{resource.title}</b><small>{humanize(resource.kind)}</small></span><X size={14} />
    </button>)}</div>}
    {!resources.length ? <p>No saved resources for this module.</p> : <button type="button" className="study-resource-picker-toggle" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}><Plus size={15} /> {expanded ? "Close resource picker" : selected.length ? "Add another resource" : "Add resources"}<ChevronDown size={15} /></button>}
    {expanded && <div className="study-resource-picker-panel">
      <label><Search size={15} /><span className="sr-only">Search resources</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this module" /></label>
      <div>{available.map((resource) => <button type="button" key={resource.id} onClick={() => add(resource.id)}>{resourceIcon(resource.kind)}<span><b>{resource.title}</b><small>{humanize(resource.kind)}</small></span><Plus size={14} /></button>)}{!available.length && <p>{query ? "No matching resources." : "Every resource is already linked."}</p>}</div>
    </div>}
  </fieldset>;
}

function StudyConfirmationDialog({ message, onCancel, onConfirm }: { message: string; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [onCancel]);
  return <div className="study-confirm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="study-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="study-confirm-title" aria-describedby="study-confirm-message">
      <span><AlertTriangle size={18} /></span><div><h2 id="study-confirm-title">Confirm this change</h2><p id="study-confirm-message">{message}</p></div>
      <footer><button ref={cancelRef} type="button" className="study-secondary" onClick={onCancel}>Keep it</button><button type="button" className="study-danger-button" onClick={onConfirm}>Confirm</button></footer>
    </section>
  </div>;
}

function StudySessionEditor({ session, study, busy, onClose, onSave }: { session: StudySession; study: StudySnapshot; busy: boolean; onClose: () => void; onSave: (body: unknown) => Promise<void> }) {
  const knownStructure = FOCUS_STRUCTURES.find((entry) => entry.id === session.focusStructure)?.id ?? "custom";
  const [focusStructure, setFocusStructure] = useState<FocusStructureId>(knownStructure);
  const [techniques, setTechniques] = useState<string[]>(session.techniques ?? []);
  const [customMethod, setCustomMethod] = useState(sessionCustomMethod(session));
  const [topic, setTopic] = useState(session.topic ?? "");
  const [result, setResult] = useState(session.result ?? "");
  const [startedAt, setStartedAt] = useState(localInput(session.startedAt));
  const [endedAt, setEndedAt] = useState(session.endedAt ? localInput(session.endedAt) : "");
  const [resourceIds, setResourceIds] = useState(sessionResourceIds(session));
  const resources = study.resources.filter((resource) => resource.moduleId === session.moduleId);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void onSave({
      topic: topic.trim(),
      focusStructure,
      techniques,
      method: sessionMethodSummary(focusStructure, techniques, customMethod),
      result: result.trim(),
      startedAt: new Date(startedAt).toISOString(),
      ...(endedAt ? { endedAt: new Date(endedAt).toISOString() } : {}),
      resourceIds,
    });
  };
  return <StudyDialog kicker={session.endedAt ? "Session record" : "Active session"} title={session.item?.title || session.topic || `${session.module.code} session`} dirty onClose={onClose}>{() => <form className="study-editor-form study-session-editor" onSubmit={submit}>
    <div className="study-form-row"><label>Started<input required type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} /></label><label>Ended<input type="datetime-local" disabled={!session.endedAt} value={endedAt} onChange={(event) => setEndedAt(event.target.value)} /></label></div>
    <label>Topic or intention<input value={topic} onChange={(event) => setTopic(event.target.value)} /></label>
    <StudyMethodPicker focusStructure={focusStructure} techniques={techniques} customMethod={customMethod} onFocusStructure={setFocusStructure} onTechniques={setTechniques} onCustomMethod={setCustomMethod} />
    <StudyResourcePicker resources={resources} resourceIds={resourceIds} onChange={setResourceIds} />
    <label>Result or next step<textarea rows={4} value={result} onChange={(event) => setResult(event.target.value)} /></label>
    <footer><button type="button" className="study-secondary" onClick={onClose}>Cancel</button><button className="study-primary" disabled={busy}><Check size={15} /> Save changes</button></footer>
  </form>}</StudyDialog>;
}

function StudySessionCompanion({ session, timezone, busy, onOpen, onStop }: { session: StudySession; timezone: string; busy: boolean; onOpen: () => void; onStop: (body: unknown) => Promise<unknown> }) {
  const elapsed = useSessionElapsed(session.startedAt);
  return <aside className="study-session-companion" aria-label="Active Deep Work session" style={{ "--module-color": session.module.color ?? "#168b83" } as React.CSSProperties}>
    <Ari variant="threading" decorative />
    <div><span>Deep Work</span><b>{session.module.code} · {session.item?.title || session.topic || "Module session"}</b><small>{formatDuration(elapsed)} · started {formatTime(session.startedAt, timezone)}</small></div>
    <button className="study-quiet" onClick={onOpen}>Open</button><button className="study-primary" disabled={busy} onClick={() => void onStop({})}><Square size={14} /> End</button>
  </aside>;
}

function useSessionElapsed(startedAt?: string) {
  const [, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => setTick(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return startedAt ? sessionElapsedSeconds(startedAt) : 0;
}

function StudySettings({ study, busy, onSave, onSync, onCanvasReview, onAddOrigin, onOrigin, onDeleteOrigin, onAddBlock, onUpdateBlock, onDeleteBlock }: { study: StudySnapshot; busy: boolean; onSave: (body: unknown) => Promise<unknown>; onSync: () => Promise<unknown>; onCanvasReview: (id: string, action: "keep" | "archive") => Promise<unknown>; onAddOrigin: (body: unknown) => Promise<unknown>; onOrigin: (id: string, body: unknown) => Promise<unknown>; onDeleteOrigin: (id: string) => Promise<unknown>; onAddBlock: (body: unknown) => Promise<unknown>; onUpdateBlock: (id: string, body: unknown) => Promise<unknown>; onDeleteBlock: (id: string) => Promise<unknown> }) {
  const [settings, setSettings] = useState(study.workspace);
  const [panel, setPanel] = usePersistentState<"canvas" | "rhythm" | "travel" | "schedule">("threadwise-study-settings-panel", "canvas");
  const [originName, setOriginName] = useState("");
  const [originVenue, setOriginVenue] = useState("");
  const canvasSummary = study.canvas.state?.lastSummary;
  const panels = [
    { id: "canvas" as const, label: "Canvas", icon: Cloud },
    { id: "rhythm" as const, label: "Rhythm", icon: Clock3 },
    { id: "travel" as const, label: "Travel", icon: MapPin },
    { id: "schedule" as const, label: "Schedule", icon: CalendarDays },
  ];

  return <section className="study-page">
    <PageHead kicker="Study settings" title="Semester controls" />
    <div className="study-settings-layout">
      <nav className="study-settings-tabs" aria-label="Study settings sections">
        {panels.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={panel === id ? "page" : undefined} onClick={() => setPanel(id)}><Icon size={17} /><span>{label}</span><ChevronRight size={15} /></button>)}
      </nav>
      <div className="study-settings-panel">
        {panel === "canvas" && <section aria-labelledby="study-settings-canvas">
          <header><div><span>Canvas</span><h2 id="study-settings-canvas">Assignment sync</h2><p>{study.canvas.state?.lastSuccessfulAt ? `Last synced ${formatDateTime(study.canvas.state.lastSuccessfulAt, study.workspace.timezone)}` : study.canvas.configured ? "Ready to sync." : "Add the Canvas token in Render to connect."}</p></div><button className="study-secondary" disabled={busy || !study.canvas.configured} onClick={() => void onSync()}><RefreshCw size={15} className={study.canvas.state?.status === "RUNNING" ? "spin" : ""} /> Sync now</button></header>
          <div className="study-settings-callout"><Cloud size={19} /><div><b>Read-only by design</b><p>Threadwise imports coursework and status. It never submits or edits Canvas work.</p></div></div>
          {canvasSummary && <div className="study-canvas-health" aria-label="Latest Canvas sync coverage">
            <div><b>{canvasSummary.courses ?? 0}</b><span>courses scanned</span></div>
            <div><b>{canvasSummary.assignmentsSeen ?? 0}</b><span>assignments found</span></div>
            <div><b>{canvasSummary.courseModulesSeen ?? 0}</b><span>course modules</span></div>
            <div><b>{canvasSummary.materialsSeen ?? 0}</b><span>materials indexed</span></div>
            {(canvasSummary.ignoredInactive ?? 0) > 0 && <p><AlertTriangle size={15} /> {canvasSummary.ignoredInactive} open assignment{canvasSummary.ignoredInactive === 1 ? " is" : "s are"} waiting for its course to be activated in Modules.</p>}
          </div>}
          {study.canvas.missingAssignments.length === 0 ? <Empty title="Nothing needs review" copy="Missing Canvas assignments will appear here before anything is archived." /> : study.canvas.missingAssignments.map((assignment) => <article className="study-canvas-review" key={assignment.id}><AlertTriangle size={18} /><div><b>{assignment.module.code} · {assignment.item.publicId}</b><p>{assignment.title}</p></div><button onClick={() => void onCanvasReview(assignment.id, "keep")}>Keep local</button><button onClick={() => void onCanvasReview(assignment.id, "archive")}>Archive</button></article>)}
        </section>}

        {panel === "rhythm" && <section aria-labelledby="study-settings-rhythm">
          <header><div><span>Rhythm</span><h2 id="study-settings-rhythm">Reviews and reminders</h2><p>Set the recurring moments that keep the semester visible.</p></div></header>
          <form onSubmit={(event) => { event.preventDefault(); void onSave(studySettingsPayload(settings)); }}>
            <fieldset><legend>Semester</legend><div className="study-form-row"><label>Semester name<input required value={settings.semesterName} onChange={(event) => setSettings({ ...settings, semesterName: event.target.value })} /></label><label>Starting Monday<input required type="date" value={settings.semesterStartDate?.slice(0, 10) ?? ""} onChange={(event) => setSettings({ ...settings, semesterStartDate: event.target.value ? new Date(`${event.target.value}T00:00:00+08:00`).toISOString() : null })} /></label></div></fieldset>
            <fieldset><legend>Weekly rhythm</legend><div className="study-form-row"><label>Preview day<select value={settings.weeklyPreviewDay} onChange={(event) => setSettings({ ...settings, weeklyPreviewDay: Number(event.target.value) })}>{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>{weekday(value)}</option>)}</select></label><label>Preview time<input type="time" value={settings.weeklyPreviewTime} onChange={(event) => setSettings({ ...settings, weeklyPreviewTime: event.target.value })} /></label><label>Review day<select value={settings.weeklyReviewDay} onChange={(event) => setSettings({ ...settings, weeklyReviewDay: Number(event.target.value) })}>{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>{weekday(value)}</option>)}</select></label><label>Review time<input type="time" value={settings.weeklyReviewTime} onChange={(event) => setSettings({ ...settings, weeklyReviewTime: event.target.value })} /></label></div></fieldset>
            <fieldset><legend>Boundaries</legend><div className="study-form-row"><label>Quiet hours start<input type="time" value={settings.quietHoursStart ?? ""} onChange={(event) => setSettings({ ...settings, quietHoursStart: event.target.value || null })} /></label><label>Quiet hours end<input type="time" value={settings.quietHoursEnd ?? ""} onChange={(event) => setSettings({ ...settings, quietHoursEnd: event.target.value || null })} /></label><label>Daily reminder cap<IntegerInput min={1} max={24} value={settings.maxRemindersPerDay} onValueChange={(value) => setSettings({ ...settings, maxRemindersPerDay: value })} aria-label="Daily reminder cap" /></label><label>Timed practice from week<IntegerInput min={1} max={30} value={settings.timedPracticeStartWeek} onValueChange={(value) => setSettings({ ...settings, timedPracticeStartWeek: value })} aria-label="Timed practice from week" /></label></div></fieldset>
            <label className="study-switch"><span><b>Study-block reminders</b><small>Notify only for recurring blocks saved in Schedule.</small></span><input type="checkbox" checked={settings.studyBlockRemindersEnabled} onChange={(event) => setSettings({ ...settings, studyBlockRemindersEnabled: event.target.checked })} /></label>
            <label className="study-switch"><span><b>Automatic Canvas sync</b><small>Check every 30 minutes without submitting coursework.</small></span><input type="checkbox" checked={settings.canvasSyncEnabled} onChange={(event) => setSettings({ ...settings, canvasSyncEnabled: event.target.checked })} /></label>
            <button className="study-primary" disabled={busy}><Check size={16} /> Save rhythm</button>
          </form>
        </section>}

        {panel === "travel" && <section aria-labelledby="study-settings-travel">
          <header><div><span>Travel</span><h2 id="study-settings-travel">Leave-time origins</h2><p>Tell Threadwise where a study journey begins.</p></div></header>
          <div className="study-origin-list">{study.origins.map((origin) => <article key={origin.id}><MapPin size={17} /><div><b>{origin.name}</b><small>{origin.isDefault ? "Default origin" : origin.providerVenueId || "Campus origin"}</small></div><div className="study-origin-actions">{!origin.isDefault && <button onClick={() => void onOrigin(origin.id, { makeDefault: true })}>Make default</button>}<button aria-label={`Remove ${origin.name}`} onClick={() => confirmAction(`Remove ${origin.name}?`, () => onDeleteOrigin(origin.id))}><Trash2 size={15} /></button></div></article>)}</div>
          <form className="study-inline-form study-origin-form" onSubmit={(event) => { event.preventDefault(); void onAddOrigin({ name: originName, venue: originVenue, makeDefault: study.origins.length === 0 }).then((saved) => { if (saved) { setOriginName(""); setOriginVenue(""); } }); }}><label>Origin name<input value={originName} onChange={(event) => setOriginName(event.target.value)} placeholder="Home" required /></label><label>NUS venue<input value={originVenue} onChange={(event) => setOriginVenue(event.target.value)} placeholder="COM3" required /></label><button className="study-secondary"><Plus size={15} /> Add origin</button></form>
        </section>}

        {panel === "schedule" && <ScheduleSettings study={study} busy={busy} onAdd={onAddBlock} onUpdate={onUpdateBlock} onDelete={onDeleteBlock} />}
      </div>
    </div>
  </section>;
}

function ScheduleSettings({ study, busy, onAdd, onUpdate, onDelete }: { study: StudySnapshot; busy: boolean; onAdd: (body: unknown) => Promise<unknown>; onUpdate: (id: string, body: unknown) => Promise<unknown>; onDelete: (id: string) => Promise<unknown> }) {
  const [moduleId, setModuleId] = useState("");
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("12:00");
  const [label, setLabel] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationPlaceId, setDestinationPlaceId] = useState<string | null>(null);
  const [originId, setOriginId] = useState("");
  const [buffer, setBuffer] = useState(15);
  const [editing, setEditing] = useState<string | null>(null);
  return <section aria-labelledby="study-settings-schedule">
    <header><div><span>Schedule</span><h2 id="study-settings-schedule">Classes and recurring blocks</h2><p>Add a destination to receive a live leave-time reminder before class.</p></div></header>
    {study.scheduleBlocks.length === 0 ? <Empty title="No recurring blocks" copy="Add the first class or study block below." /> : <div className="study-block-list">{study.scheduleBlocks.map((block) => <article key={block.id} className={editing === block.id ? "editing" : ""}><div className="study-block-icon">{block.destinationStopId ? <MapPin size={17} /> : <Clock3 size={17} />}</div><div><b>{block.label}</b><small>{weekday(block.dayOfWeek)} · {block.startTime}–{block.endTime}{block.module ? ` · ${block.module.code}` : ""}</small>{block.venueName && <span className="study-travel-chip"><MapPin size={12} /> {block.venueName} · {block.defaultOrigin?.name ?? "Current origin"} · {block.travelBufferMinutes} min buffer</span>}</div><button className="study-block-configure" onClick={() => setEditing(editing === block.id ? null : block.id)}>{block.destinationStopId ? "Edit travel" : "Add travel"}</button><button aria-label={`Remove ${block.label}`} onClick={() => confirmAction(`Remove ${block.label}?`, () => onDelete(block.id))}><Trash2 size={15} /></button>{editing === block.id && <ScheduleTravelEditor block={block} origins={study.origins} busy={busy} onCancel={() => setEditing(null)} onSave={async (body) => { const saved = await onUpdate(block.id, body); if (saved) setEditing(null); }} />}</article>)}</div>}
    <form className="study-block-form study-labelled-form" onSubmit={(event) => { event.preventDefault(); void onAdd({ moduleId: moduleId || undefined, dayOfWeek: day, startTime: start, endTime: end, label, destination: destination || undefined, destinationPlaceId: destinationPlaceId || undefined, defaultOriginId: originId || undefined, travelBufferMinutes: clampInteger(buffer, 0, 90) }).then((saved) => { if (saved) { setLabel(""); setDestination(""); setDestinationPlaceId(null); } }); }}>
      <label>Module<select value={moduleId} onChange={(event) => setModuleId(event.target.value)}><option value="">No module</option>{study.modules.map((module) => <option key={module.id} value={module.id}>{module.code}</option>)}</select></label>
      <label>Day<select value={day} onChange={(event) => setDay(Number(event.target.value))}>{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>{weekday(value)}</option>)}</select></label>
      <label>Starts<input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
      <label>Ends<input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
      <label>Label<input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="CS2100 lecture" required /></label>
      <StudyPlaceCombobox optional value={destination} placeId={destinationPlaceId} onChange={(value, placeId) => { setDestination(value); setDestinationPlaceId(placeId); }} />
      <label>Usual origin<select value={originId} onChange={(event) => setOriginId(event.target.value)}><option value="">Current / default</option>{study.origins.map((origin) => <option key={origin.id} value={origin.id}>{origin.name}</option>)}</select></label>
      <label>Travel buffer<IntegerInput min={0} max={90} value={buffer} onValueChange={setBuffer} aria-label="Travel buffer" /></label>
      <button className="study-secondary" disabled={busy}><Plus size={15} /> Add block</button>
    </form>
  </section>;
}

function ScheduleTravelEditor({ block, origins, busy, onCancel, onSave }: { block: StudySnapshot["scheduleBlocks"][number]; origins: StudySnapshot["origins"]; busy: boolean; onCancel: () => void; onSave: (body: unknown) => Promise<void> }) {
  const [destination, setDestination] = useState(block.venueName ?? "");
  const [destinationPlaceId, setDestinationPlaceId] = useState<string | null>(scheduleBlockPlaceId(block));
  const [originId, setOriginId] = useState(block.defaultOriginId ?? "");
  const [buffer, setBuffer] = useState(block.travelBufferMinutes ?? 15);
  return <form className="study-travel-editor" onSubmit={(event) => { event.preventDefault(); void onSave({ destination: destination || null, destinationPlaceId, defaultOriginId: originId || null, travelBufferMinutes: clampInteger(buffer, 0, 90) }); }}>
    <StudyPlaceCombobox required value={destination} placeId={destinationPlaceId} onChange={(value, placeId) => { setDestination(value); setDestinationPlaceId(placeId); }} />
    <label>Usual origin<select value={originId} onChange={(event) => setOriginId(event.target.value)}><option value="">Current / default</option>{origins.map((origin) => <option key={origin.id} value={origin.id}>{origin.name}</option>)}</select></label>
    <label>Buffer<IntegerInput min={0} max={90} value={buffer} onValueChange={setBuffer} aria-label="Travel buffer" /></label>
    <div><button type="button" className="study-quiet" onClick={onCancel}>Cancel</button>{block.destinationStopId && <button type="button" className="study-quiet danger" onClick={() => void onSave({ destination: null })}>Disable</button>}<button className="study-primary" disabled={busy}><Check size={15} /> Save travel</button></div>
  </form>;
}

function StudyDialog({ kicker, title, dirty = false, wide = false, onClose, children }: { kicker: string; title: string; dirty?: boolean; wide?: boolean; onClose: () => void; children: (requestClose: () => void) => React.ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const requestClose = useCallback(() => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])");
    first?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocus.current?.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      const dialog = dialogRef.current;
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (focusable.length === 0) return;
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstFocusable) { event.preventDefault(); lastFocusable.focus(); }
      if (!event.shiftKey && document.activeElement === lastFocusable) { event.preventDefault(); firstFocusable.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  return <div className="study-sheet-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <section ref={dialogRef} className={`study-sheet${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="study-dialog-title">
      <header><div><span>{kicker}</span><h2 id="study-dialog-title">{title}</h2></div><button type="button" onClick={requestClose} aria-label={`Close ${title}`}><X size={20} /></button></header>
      {children(requestClose)}
    </section>
  </div>;
}

function StudyEditor({ state, study, busy, onClose, onSave }: { state: Exclude<Editor, null>; study: StudySnapshot; busy: boolean; onClose: () => void; onSave: (path: string, method: "POST" | "PATCH", body: unknown, message: string) => Promise<void> }) {
  const [dirty, setDirty] = useState(false);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (state.kind === "module") {
      const value = state.value;
      void onSave(value ? `study/modules/${value.id}` : "study/modules", value ? "PATCH" : "POST", { code: formText(form, "code"), name: formText(form, "name"), ...(formText(form, "color") ? { color: formText(form, "color") } : {}) }, value ? "Module updated." : "Module added.");
    }
    if (state.kind === "item") {
      const value = state.value;
      const notes = formText(form, "notes");
      const dueAt = formText(form, "dueAt");
      const plannedMinutes = formText(form, "plannedMinutes");
      const optionalCreateFields = value
        ? { notes: notes || null, dueAt: dueAt ? new Date(dueAt).toISOString() : null, plannedMinutes: plannedMinutes ? Number(plannedMinutes) : null, status: formText(form, "status") }
        : { ...(notes ? { notes } : {}), ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}), ...(plannedMinutes ? { plannedMinutes: Number(plannedMinutes) } : {}) };
      void onSave(value ? `study/items/${value.id}` : "study/items", value ? "PATCH" : "POST", { moduleId: formText(form, "moduleId"), type: formText(form, "type"), title: formText(form, "title"), priority: formText(form, "priority"), ...optionalCreateFields }, value ? "Work updated." : "Work added.");
    }
    if (state.kind === "resource") {
      const value = state.value;
      const kind = value?.kind ?? state.resourceKind ?? "NOTE";
      void onSave(value ? `study/resources/${value.id}` : "study/resources", value ? "PATCH" : "POST", { moduleId: formText(form, "moduleId"), ...(value ? {} : { kind }), title: formText(form, "title"), body: formText(form, "body") || undefined, url: formText(form, "url") || undefined, caption: formText(form, "caption") || undefined, tags: formText(form, "tags").split(",").map((tag) => tag.trim()).filter(Boolean) }, value ? "Resource updated." : "Resource saved.");
    }
    if (state.kind === "mistake") {
      void onSave("study/mistakes", "POST", { moduleId: formText(form, "moduleId"), ...(formText(form, "itemId") ? { itemId: formText(form, "itemId") } : {}), source: formText(form, "source"), category: formText(form, "category"), cause: formText(form, "cause"), prevention: formText(form, "prevention"), revisitAt: formText(form, "revisitAt") ? new Date(formText(form, "revisitAt")).toISOString() : undefined }, "Mistake recorded.");
    }
  };
  const heading = state.kind === "module" ? `${state.value ? "Edit" : "Add"} module` : state.kind === "item" ? `${state.value ? "Edit" : "Add"} work` : state.kind === "mistake" ? "Record mistake" : `${state.value ? "Edit" : "Add"} ${(state.value?.kind ?? state.resourceKind ?? "resource").toLowerCase()}`;
  const mistakeModuleId = state.kind === "mistake" ? state.item?.moduleId ?? study.workspace.activeModuleId ?? study.modules[0]?.id : undefined;

  return <StudyDialog kicker="Study Mode" title={heading} dirty={dirty} onClose={onClose}>{(requestClose) =>
    <form onSubmit={submit} onChange={() => setDirty(true)}>
      {state.kind === "module" && <><label>Module code<input name="code" required defaultValue={state.value?.code ?? ""} /></label><label>Module name<input name="name" required defaultValue={state.value?.name ?? ""} /></label><label>Module color<input name="color" type="color" defaultValue={state.value?.color ?? "#168b83"} /></label></>}
      {state.kind === "item" && <><div className="study-form-row"><label>Module<ModuleField modules={study.modules} name="moduleId" value={state.value?.moduleId ?? study.workspace.activeModuleId ?? study.modules[0]?.id} /></label><label>Type<select name="type" defaultValue={state.value?.type ?? "ASSIGNMENT"}>{ITEM_TYPES.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}</select></label></div><label>Title<input name="title" required maxLength={500} defaultValue={state.value?.title ?? ""} /></label><label>Details<textarea name="notes" rows={5} defaultValue={state.value?.notes ?? ""} /></label><div className="study-form-row"><label>Due date<input name="dueAt" type="datetime-local" defaultValue={localInput(state.value?.dueAt)} /></label><label>Planned minutes<input name="plannedMinutes" type="number" min="1" max="1440" defaultValue={state.value?.plannedMinutes ?? ""} /></label></div><div className="study-form-row"><label>Priority<select name="priority" defaultValue={state.value?.priority ?? "NORMAL"}>{["LOW", "NORMAL", "HIGH", "CRITICAL"].map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>{state.value && <label>Status<select name="status" defaultValue={state.value.status}>{["OPEN", "IN_PROGRESS", "PROCESSED", "DONE"].map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>}</div></>}
      {state.kind === "resource" && <><label>Module<ModuleField modules={study.modules} name="moduleId" value={state.value?.moduleId ?? study.workspace.activeModuleId ?? study.modules[0]?.id} /></label><label>Title<input name="title" required defaultValue={state.value?.title ?? ""} /></label>{(state.value?.kind ?? state.resourceKind) === "LINK" ? <label>Link<input name="url" type="url" required defaultValue={state.value?.url ?? ""} /></label> : (state.value?.kind ?? state.resourceKind) === "IMAGE" || (state.value?.kind ?? state.resourceKind) === "FILE" ? <><label>Caption<textarea name="caption" rows={4} defaultValue={state.value?.caption ?? ""} /></label>{state.value?.ocrText && <div className="study-ocr"><span>Searchable text</span><p>{state.value.ocrText}</p></div>}</> : <label>{(state.value?.kind ?? state.resourceKind) === "QUESTION" ? "Question" : "Note"}<textarea name="body" required rows={10} defaultValue={state.value?.body ?? ""} /></label>}<label>Tags <small>comma-separated</small><input name="tags" defaultValue={state.value?.tags.join(", ") ?? ""} /></label></>}
      {state.kind === "mistake" && <><input type="hidden" name="itemId" value={state.item?.id ?? ""} /><label>Module<ModuleField modules={study.modules} name="moduleId" value={mistakeModuleId} /></label>{state.item && <div className="study-linked-context"><Target size={17} /><div><small>Linked work</small><b>{state.item.title}</b></div></div>}<label>Question or source<textarea name="source" required rows={3} defaultValue={state.item?.title ?? ""} /></label><label>Category<select name="category" defaultValue="CONCEPTUAL_MISUNDERSTANDING"><option value="CONCEPTUAL_MISUNDERSTANDING">Conceptual misunderstanding</option><option value="WRONG_APPROACH">Wrong approach</option><option value="EXECUTION_CARELESS">Execution / careless</option><option value="TIME_MANAGEMENT">Time management</option></select></label><label>Cause<textarea name="cause" required rows={3} /></label><label>Preventive check<textarea name="prevention" required rows={3} /></label><label>Revisit<input name="revisitAt" type="datetime-local" /></label></>}
      <footer><button type="button" className="study-secondary" onClick={requestClose}>Cancel</button><button className="study-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Save</button></footer>
    </form>
  }</StudyDialog>;
}

type ReviewModuleDraft = { status: StudyTrafficLight; unclear: string; nextAction: string };
type WeeklyReviewDraft = {
  modules: Record<string, ReviewModuleDraft>;
  wins: string;
  unresolved: string;
  lost: string;
  priorities: [string, string, string];
  compatible: boolean;
};

function WeeklyReviewSheet({ study, busy, onClose, onSave }: { study: StudySnapshot; busy: boolean; onClose: () => void; onSave: (body: unknown) => Promise<unknown> }) {
  const storageKey = `threadwise-study-review-${study.workspace.id}-${study.weekNumber}`;
  const freshDraft = (): WeeklyReviewDraft => ({
    modules: Object.fromEntries(study.modules.map((module) => [module.id, { status: module.currentMastery, unclear: "", nextAction: "" }])),
    wins: "",
    unresolved: "",
    lost: "",
    priorities: ["", "", ""],
    compatible: true,
  });
  const [initialReview] = useState(() => {
    const blank = freshDraft();
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved
        ? { draft: { ...blank, ...JSON.parse(saved) as WeeklyReviewDraft }, restored: true }
        : { draft: blank, restored: false };
    } catch {
      return { draft: blank, restored: false };
    }
  });
  const [draft, setDraft] = useState<WeeklyReviewDraft>(initialReview.draft);
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(initialReview.restored);
  const steps = ["Evidence", "Module signals", "Reflection", "Next week"];

  useEffect(() => {
    if (!dirty) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(draft)); } catch { /* Keep the in-memory draft. */ }
  }, [dirty, draft, storageKey]);

  const update = (change: Partial<WeeklyReviewDraft>) => { setDirty(true); setDraft((current) => ({ ...current, ...change })); };
  const updateModule = (id: string, change: Partial<ReviewModuleDraft>) => {
    setDirty(true);
    setDraft((current) => ({ ...current, modules: { ...current.modules, [id]: { ...current.modules[id], ...change } } }));
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);
    void onSave({
      moduleStatuses: study.modules.map((module) => ({ moduleId: module.id, code: module.code, status: draft.modules[module.id]?.status ?? module.currentMastery, unclear: draft.modules[module.id]?.unclear || undefined, nextAction: draft.modules[module.id]?.nextAction || undefined })),
      wins: lines(draft.wins),
      unresolvedTopics: lines(draft.unresolved),
      nextWeekPriorities: draft.priorities.map((value) => value.trim()).filter(Boolean),
      lostTimeCauses: lines(draft.lost),
      workloadCompatible: draft.compatible,
    }).then((saved) => { if (saved) { window.localStorage.removeItem(storageKey); setDirty(false); } });
  };

  return <StudyDialog kicker={studyWeekLabel(study)} title="Weekly review" dirty={dirty} wide onClose={onClose}>{(requestClose) =>
    <form className="study-review-wizard" onSubmit={submit}>
      <div className="study-review-progress" aria-label={`Step ${step + 1} of ${steps.length}: ${steps[step]}`}><div>{steps.map((label, index) => <button key={label} type="button" aria-current={index === step ? "step" : undefined} onClick={() => setStep(index)}><span>{index + 1}</span><b>{label}</b></button>)}</div><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>

      {step === 0 && <section className="study-review-step"><div><span>01 · Evidence</span><h3>What actually happened?</h3><p>Start with facts before judging the week.</p></div><label>Wins <small>one per line</small><textarea rows={6} value={draft.wins} onChange={(event) => update({ wins: event.target.value })} /></label><label>Unresolved topics<textarea rows={6} value={draft.unresolved} onChange={(event) => update({ unresolved: event.target.value })} /></label></section>}

      {step === 1 && <section className="study-review-step"><div><span>02 · Module signals</span><h3>Read the semester by module.</h3><p>Give each module one signal and one next move.</p></div><div className="study-review-form-modules">{study.modules.map((module) => { const value = draft.modules[module.id] ?? { status: module.currentMastery, unclear: "", nextAction: "" }; return <fieldset key={module.id}><legend><span style={{ background: module.color ?? "var(--study-blue)" }} />{module.code}</legend><label>Signal<select value={value.status} onChange={(event) => updateModule(module.id, { status: event.target.value as StudyTrafficLight })}>{MASTERY.map((status) => <option key={status} value={status}>{masteryLabel(status)}</option>)}</select></label><label>Still unclear<input value={value.unclear} onChange={(event) => updateModule(module.id, { unclear: event.target.value })} /></label><label>Next action<input value={value.nextAction} onChange={(event) => updateModule(module.id, { nextAction: event.target.value })} /></label></fieldset>; })}</div></section>}

      {step === 2 && <section className="study-review-step"><div><span>03 · Reflection</span><h3>Protect next week’s energy.</h3><p>Notice what consumed time, then decide whether the load still fits.</p></div><label>Where time went <small>one cause per line</small><textarea rows={7} value={draft.lost} onChange={(event) => update({ lost: event.target.value })} /></label><label className="study-switch"><span><b>The workload still fits</b><small>Turn this off if next week needs a reduction.</small></span><input type="checkbox" checked={draft.compatible} onChange={(event) => update({ compatible: event.target.checked })} /></label></section>}

      {step === 3 && <section className="study-review-step"><div><span>04 · Next week</span><h3>Choose three priorities.</h3><p>Three explicit fields prevent an accidental fourth priority from disappearing.</p></div><div className="study-priority-fields">{draft.priorities.map((priority, index) => <label key={index}><span>{index + 1}</span>Priority {index + 1}<input value={priority} onChange={(event) => { const priorities = [...draft.priorities] as [string, string, string]; priorities[index] = event.target.value; update({ priorities }); }} /></label>)}</div></section>}

      <footer><button type="button" className="study-secondary" onClick={step === 0 ? requestClose : () => setStep((value) => value - 1)}>{step === 0 ? "Cancel" : "Back"}</button>{step < steps.length - 1 ? <button type="button" className="study-primary" onClick={() => setStep((value) => value + 1)}>Continue <ArrowRight size={16} /></button> : <button className="study-primary" disabled={busy}><Check size={16} /> Finish review</button>}</footer>
    </form>
  }</StudyDialog>;
}

function StudyGuideSheet({ onClose }: { onClose: () => void }) {
  return <StudyDialog kicker="Keyboard guide" title="Move quickly" onClose={onClose}>{(requestClose) =>
    <div className="study-guide"><p>Study Mode keeps common actions one or two keys away whenever you are not typing.</p><dl><div><dt><kbd>⌘/Ctrl</kbd><kbd>K</kbd></dt><dd>Search Study Mode</dd></div><div><dt><kbd>G</kbd><kbd>O</kbd></dt><dd>Overview</dd></div><div><dt><kbd>G</kbd><kbd>T</kbd></dt><dd>Timetable</dd></div><div><dt><kbd>G</kbd><kbd>W</kbd></dt><dd>Work</dd></div><div><dt><kbd>G</kbd><kbd>F</kbd></dt><dd>Deep Work</dd></div><div><dt><kbd>G</kbd><kbd>M</kbd></dt><dd>Modules</dd></div><div><dt><kbd>?</kbd></dt><dd>Open this guide</dd></div><div><dt><kbd>Esc</kbd></dt><dd>Close the current layer</dd></div></dl><button type="button" className="study-primary" onClick={requestClose}>Got it</button></div>
  }</StudyDialog>;
}
function StudyWorkspaceSwitcher({ current, workspaces, open, setOpen }: { current: DashboardWorkspace; workspaces: DashboardWorkspace[]; open: boolean; setOpen: (value: boolean) => void }) {
  return <div className="study-workspace-switcher"><span>Study group</span><button aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}><BookOpen size={16} /><span><b>{current.name}</b><small>Private workspace</small></span><ChevronDown size={16} /></button>{open && <div role="listbox">{workspaces.map((workspace) => <button role="option" aria-selected={workspace.id === current.id} key={workspace.id} onClick={() => { setOpen(false); if (workspace.id !== current.id) window.location.assign(`/api/workspace/select?workspace=${encodeURIComponent(workspace.id)}&next=/dashboard`); }}><span>{workspace.kind === "PERSONAL" ? "Personal" : workspace.mode === "STUDY" ? "Study" : "Group"}</span><b>{workspace.name}</b>{workspace.id === current.id && <Check size={15} />}</button>)}</div>}</div>;
}

function PageHead({ kicker, title, copy, action }: { kicker?: string; title: string; copy?: string; action?: React.ReactNode }) { return <header className="study-page-head"><div>{kicker && <span>{kicker}</span>}<h1>{title}</h1>{copy && <p>{copy}</p>}</div>{action}</header>; }
function ModuleSelect({ modules, value, onChange }: { modules: StudyModule[]; value: string; onChange: (value: string) => void }) { return <select value={value} onChange={(event) => onChange(event.target.value)}><option value="all">All modules</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.code}</option>)}</select>; }
function ModuleField({ modules, name, value }: { modules: StudyModule[]; name: string; value?: string | null }) { return <select name={name} required defaultValue={value ?? modules[0]?.id}>{modules.map((module) => <option key={module.id} value={module.id}>{module.code} · {module.name}</option>)}</select>; }
function Mastery({ value }: { value: StudyTrafficLight }) { return <span className="study-mastery" data-mastery={value}>{masteryLabel(value)}</span>; }
function Empty({ title, copy }: { title: string; copy: string }) { return <div className="study-empty"><span className="study-empty-mark" aria-hidden="true"><BookOpen size={28} /></span><b>{title}</b><p>{copy}</p></div>; }
function resourceIcon(kind: StudyResourceKind) { if (kind === "IMAGE") return <ImageIcon size={15} />; if (kind === "LINK") return <LinkIcon size={15} />; if (kind === "FILE") return <File size={15} />; if (kind === "QUESTION") return <CircleHelp size={15} />; return <FileText size={15} />; }

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const saved = window.localStorage.getItem(key);
      return saved === null ? initialValue : JSON.parse(saved) as T;
    } catch { /* Storage can be unavailable in strict browser modes. */ }
    return initialValue;
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep the in-memory preference. */ }
  }, [key, value]);
  return [value, setValue] as const;
}

async function studyApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/threadwise/${path}`, { method, credentials: "same-origin", cache: "no-store", headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) { const value = payload as { message?: string; error?: string }; throw new Error(value.message || "Study Mode could not complete that request."); }
  return payload as T;
}
function validView(value?: string): StudyView { return NAV.some((item) => item.id === value) ? value as StudyView : "study-overview"; }
function confirmAction(message: string, action: () => unknown) {
  window.dispatchEvent(new CustomEvent<Confirmation>(STUDY_CONFIRM_EVENT, { detail: { message, action } }));
}
function isUsefulFocusTarget(item: StudyItem) {
  return !/^(?:image capture|image received)(?:\b|\s*[-:])/i.test(item.title.trim());
}
function formText(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function studySettingsPayload(settings: StudySnapshot["workspace"]) {
  return {
    semesterName: settings.semesterName,
    ...(settings.semesterStartDate ? { semesterStartDate: settings.semesterStartDate } : {}),
    timezone: settings.timezone,
    weeklyReviewDay: settings.weeklyReviewDay,
    weeklyReviewTime: settings.weeklyReviewTime,
    weeklyPreviewDay: settings.weeklyPreviewDay,
    weeklyPreviewTime: settings.weeklyPreviewTime,
    quietHoursStart: settings.quietHoursStart ?? null,
    quietHoursEnd: settings.quietHoursEnd ?? null,
    maxRemindersPerDay: clampInteger(settings.maxRemindersPerDay, 1, 24),
    timedPracticeStartWeek: clampInteger(settings.timedPracticeStartWeek, 1, 30),
    studyBlockRemindersEnabled: settings.studyBlockRemindersEnabled,
    canvasSyncEnabled: settings.canvasSyncEnabled,
  };
}
function masteryLabel(value: StudyTrafficLight) { return value === "GREEN" ? "Strong" : value === "AMBER" ? "Developing" : value === "RED" ? "Needs work" : "Not assessed"; }
function humanize(value: string) { return value.toLowerCase().replace(/_/g, " ").replace(/(^|\s)\w/g, (letter) => letter.toUpperCase()); }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"; }
function localInput(value?: string | null) { if (!value) return ""; const date = new Date(value); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
function formatDate(value: string, timezone: string) { return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", weekday: "short", timeZone: timezone }).format(new Date(value)); }
function formatTime(value: string, timezone: string) { return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(value)); }
function formatDateTime(value: string, timezone: string) { return `${formatDate(value, timezone)}, ${formatTime(value, timezone)}`; }
function formatDuration(seconds: number) { return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function imageCaption(resource: StudyResource) {
  const title = resource.title.trim();
  const generic = /^(?:image(?:\s+capture)?|saved image|untitled image)$/i.test(title);
  return resource.caption?.trim() || (generic ? "" : title);
}
function attentionCopy(item: StudyItem) { if (item.priority === "CRITICAL") return "Critical priority."; if (!item.dueAt) return "No due date yet."; return `${humanize(item.type)} from ${item.source === "CANVAS" ? "Canvas" : "Threadwise"}.`; }
function weekday(value: number) { return ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][value] ?? "Day"; }
