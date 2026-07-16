"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Bell, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown,
  CircleDollarSign, Clock3, Command, FileText, Flame, Inbox, Lightbulb, ListChecks,
  LogOut, Menu, Moon, MoreHorizontal, Paperclip, Pin, Plus, Repeat2, Search,
  Settings, Sparkles, Sun, TrendingUp, X, Zap,
} from "lucide-react";
import { ThreadwiseMark } from "./threadwise-mark";
import type { DashboardExpense, DashboardIdea, DashboardNote, DashboardSnapshot, DashboardTask } from "@/lib/types";

type View = "today" | "tasks" | "notes" | "ideas" | "expenses" | "library";
type ComposerMode = "capture" | "search";

const NAV: { id: View; label: string; icon: typeof Inbox; shortcut?: string }[] = [
  { id: "today", label: "My day", icon: Inbox, shortcut: "G D" },
  { id: "tasks", label: "Tasks", icon: ListChecks, shortcut: "G T" },
  { id: "notes", label: "Notes", icon: FileText, shortcut: "G N" },
  { id: "ideas", label: "Ideas", icon: Lightbulb, shortcut: "G I" },
  { id: "expenses", label: "Expenses", icon: CircleDollarSign },
  { id: "library", label: "Library", icon: BookOpen },
];

const ACCENTS = { iris: "#6f5bd3", coral: "#df6b53", mint: "#168f78" } as const;

function formatTime(value: string | undefined, timezone: string) {
  if (!value) return "Any time";
  return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(value));
}

function formatDate(value: string, timezone: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: timezone, ...options }).format(new Date(value));
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency }).format(value);
}

function calendarKey(value: string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isToday(value: string | undefined, timezone: string) {
  if (!value) return false;
  return calendarKey(value, timezone) === calendarKey(new Date(), timezone);
}

function isOverdue(task: DashboardTask, timezone: string) {
  return task.status === "OPEN" && Boolean(task.dueAt && new Date(task.dueAt).getTime() < Date.now() && !isToday(task.dueAt, timezone));
}

export function DashboardApp({ initialData, isDemo }: { initialData: DashboardSnapshot; isDemo: boolean }) {
  const [activeView, setActiveView] = useState<View>("today");
  const [tasks, setTasks] = useState(initialData.tasks);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("capture");
  const [composer, setComposer] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [accent, setAccent] = useState<keyof typeof ACCENTS>(initialData.user.accent);
  const [navOpen, setNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const chord = useRef<string | null>(null);
  const sidebar = useRef<HTMLElement>(null);
  const mobileMenu = useRef<HTMLButtonElement>(null);

  const openTasks = tasks.filter((task) => task.status === "OPEN");
  const todayTasks = openTasks.filter((task) => isToday(task.dueAt, initialData.user.timezone));
  const overdueTasks = openTasks.filter((task) => isOverdue(task, initialData.user.timezone));
  const focusTask = overdueTasks[0] ?? todayTasks[0] ?? openTasks[0];
  const completedThisWeek = initialData.activity.reduce((sum, day) => sum + day.completed, 0);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const toggleTask = (id: string) => {
    if (!isDemo) {
      announce("Editing is read-only here for now. Use Telegram to update tasks.");
      return;
    }
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: task.status === "DONE" ? "OPEN" : "DONE" } : task));
    announce("Task updated in this demo");
  };

  const submitComposer = (event: React.FormEvent) => {
    event.preventDefault();
    const value = composer.trim();
    if (!value) return;
    if (composerMode === "search") {
      setPaletteOpen(true);
      return;
    }
    if (!isDemo) {
      announce("Capture through Telegram for now; web editing is the next rollout step.");
      return;
    }
    setTasks((current) => [{ id: crypto.randomUUID(), publicId: "NEW", title: value, status: "OPEN" }, ...current]);
    setComposer("");
    announce("Captured in this demo");
  };

  const navigateFromSidebar = (view: View) => {
    setActiveView(view);
    setNavOpen(false);
    if (isMobile) window.setTimeout(() => mobileMenu.current?.focus(), 0);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = navOpen ? "hidden" : "";
    if (navOpen) window.setTimeout(() => sidebar.current?.querySelector<HTMLElement>(".close-nav")?.focus(), 0);
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, navOpen]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA"].includes(target.tagName);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (!typing && event.key === "/") {
        event.preventDefault();
        setComposerMode("search");
        document.getElementById("capture-input")?.focus();
      } else if (!typing && event.key.toLowerCase() === "n") {
        document.getElementById("capture-input")?.focus();
      } else if (!typing && event.key.toLowerCase() === "g") {
        chord.current = "g";
        window.setTimeout(() => { chord.current = null; }, 900);
      } else if (!typing && chord.current === "g") {
        const destination = ({ d: "today", t: "tasks", n: "notes", i: "ideas" } as const)[event.key.toLowerCase() as "d"];
        if (destination) setActiveView(destination);
        chord.current = null;
      } else if (event.key === "Escape") {
        setPaletteOpen(false);
        setNavOpen(false);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  return (
    <div className="dashboard-shell" style={{ "--accent": ACCENTS[accent] } as React.CSSProperties}>
      <aside ref={sidebar} className={`dashboard-sidebar ${navOpen ? "is-open" : ""}`} inert={(paletteOpen || (isMobile && !navOpen)) || undefined} aria-hidden={isMobile && !navOpen ? true : undefined}>
        <div className="sidebar-head"><ThreadwiseMark /><button className="icon-button close-nav" onClick={() => { setNavOpen(false); mobileMenu.current?.focus(); }} aria-label="Close navigation"><X size={18} /></button></div>
        <button className="quick-add" onClick={() => document.getElementById("capture-input")?.focus()}><Plus size={17} /> Quick capture <kbd>N</kbd></button>
        <nav aria-label="Dashboard">
          <p className="nav-label">Workspace</p>
          {NAV.slice(0, 5).map(({ id, label, icon: Icon, shortcut }) => (
            <button key={id} className={activeView === id ? "active" : ""} onClick={() => navigateFromSidebar(id)}>
              <Icon size={18} /><span>{label}</span>{id === "tasks" && <i>{openTasks.length}</i>}{shortcut && <kbd>{shortcut}</kbd>}
            </button>
          ))}
          <p className="nav-label nav-label-spaced">Browse</p>
          {NAV.slice(5).map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeView === id ? "active" : ""} onClick={() => navigateFromSidebar(id)}><Icon size={18} /><span>{label}</span></button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sync-note"><span><Zap size={13} /> Live with Telegram</span><small>Last capture just now</small></div>
          <button className="profile-button" onClick={() => setPaletteOpen(true)}><span className="avatar">{initialData.user.firstName[0]}</span><span><b>{initialData.user.fullName}</b><small>@{initialData.user.username ?? "threadwise"}</small></span><MoreHorizontal size={18} /></button>
        </div>
      </aside>

      {navOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => { setNavOpen(false); mobileMenu.current?.focus(); }} />}

      <main className="dashboard-main" inert={paletteOpen || undefined}>
        <header className="dashboard-topbar">
          <button ref={mobileMenu} className="icon-button mobile-menu" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="crumb"><span>Personal</span><ChevronDown size={13} /><b>{NAV.find((item) => item.id === activeView)?.label}</b></div>
          <div className="topbar-actions">
            <span className="demo-badge">{isDemo ? "Demo workspace" : "Read-only preview"}</span>
            <button className="top-search" onClick={() => setPaletteOpen(true)}><Search size={16} /><span>Find anything</span><kbd>⌘ K</kbd></button>
            <button className="icon-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="notification-button" aria-label="Notifications" onClick={() => announce("Your reminders still arrive in Telegram.")}><Bell size={18} /><span /></button>
          </div>
        </header>

        <div className="dashboard-content">
          <DashboardHeading view={activeView} user={initialData.user.firstName} timezone={initialData.user.timezone} />

          <form className={`capture-deck mode-${composerMode}`} onSubmit={submitComposer}>
            <div className="capture-modes" role="tablist" aria-label="Command mode">
              <button type="button" role="tab" aria-selected={composerMode === "capture"} onClick={() => setComposerMode("capture")}><Sparkles size={14} /> Capture</button>
              <button type="button" role="tab" aria-selected={composerMode === "search"} onClick={() => setComposerMode("search")}><Search size={14} /> Search</button>
            </div>
            <div className="capture-input-row">
              <span className="capture-glyph">{composerMode === "capture" ? <Plus size={20} /> : <Search size={19} />}</span>
              <input id="capture-input" value={composer} onChange={(event) => setComposer(event.target.value)} placeholder={composerMode === "capture" ? "Add a task, note, idea, expense, or reminder…" : "Search everything you’ve captured…"} aria-label={composerMode === "capture" ? "Quick capture" : "Search Threadwise"} />
              <button type="submit" aria-label={composerMode === "capture" ? "Capture" : "Search"}><ArrowRight size={18} /></button>
            </div>
            <div className="capture-hints">
              <span><Command size={13} /> Try “remind me Friday at 4”</span>
              <span className="capture-types"><i className="dot-task" /> Task <i className="dot-note" /> Note <i className="dot-idea" /> Idea</span>
            </div>
          </form>

          {activeView === "today" && (
            <TodayView data={initialData} tasks={tasks} focusTask={focusTask} overdue={overdueTasks.length} today={todayTasks.length} completed={completedThisWeek} onToggle={toggleTask} onNavigate={setActiveView} />
          )}
          {activeView === "tasks" && <TasksView tasks={tasks} timezone={initialData.user.timezone} onToggle={toggleTask} />}
          {activeView === "notes" && <NotesView notes={initialData.notes} timezone={initialData.user.timezone} />}
          {activeView === "ideas" && <IdeasView ideas={initialData.ideas} timezone={initialData.user.timezone} />}
          {activeView === "expenses" && <ExpensesView expenses={initialData.expenses} timezone={initialData.user.timezone} />}
          {activeView === "library" && <LibraryView data={initialData} />}
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile dashboard" inert={paletteOpen || undefined}>
        {NAV.slice(0, 5).map(({ id, label, icon: Icon }) => <button key={id} className={activeView === id ? "active" : ""} onClick={() => setActiveView(id)}><Icon size={20} /><span>{label}</span></button>)}
      </nav>

      {paletteOpen && <CommandPalette data={initialData} tasks={tasks} query={composerMode === "search" ? composer : ""} onClose={() => setPaletteOpen(false)} onNavigate={(view) => { setActiveView(view); setPaletteOpen(false); }} />}

      <div className="accent-picker" aria-label="Accent color">
        {(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((color) => <button key={color} className={accent === color ? "active" : ""} style={{ background: ACCENTS[color] }} onClick={() => setAccent(color)} aria-label={`Use ${color} accent`} />)}
      </div>
      {toast && <div className="toast" role="status"><CheckCircle2 size={16} />{toast}</div>}
    </div>
  );
}

function DashboardHeading({ view, user, timezone }: { view: View; user: string; timezone: string }) {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-SG", { hour: "2-digit", hour12: false, timeZone: timezone }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const titles: Record<View, [string, string]> = {
    today: [`${greeting}, ${user}.`, "Your day has a little shape to it."],
    tasks: ["Tasks", "Everything with somewhere to be."],
    notes: ["Notes", "The useful things you wanted to keep."],
    ideas: ["Ideas", "Small sparks, kept close."],
    expenses: ["Expenses", "A clear view of what moved."],
    library: ["Your library", "Every thread, together and searchable."],
  };
  return (
    <div className="dashboard-heading">
      <p>{new Intl.DateTimeFormat("en-SG", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(now)}</p>
      <h1>{titles[view][0]}</h1>
      <span>{titles[view][1]}</span>
    </div>
  );
}

function TodayView({
  data, tasks, focusTask, overdue, today, completed, onToggle, onNavigate,
}: {
  data: DashboardSnapshot;
  tasks: DashboardTask[];
  focusTask?: DashboardTask;
  overdue: number;
  today: number;
  completed: number;
  onToggle: (id: string) => void;
  onNavigate: (view: View) => void;
}) {
  const upcoming = tasks.filter((task) => task.status === "OPEN" && task.dueAt).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()).slice(0, 4);
  const currentMonth = calendarKey(new Date(), data.user.timezone).slice(0, 7);
  const monthExpenses = data.expenses.filter((expense) => calendarKey(expense.transactionAt, data.user.timezone).startsWith(currentMonth));
  const monthSpend = monthExpenses.reduce((sum, expense) => sum + expense.total, 0);
  const maxActivity = Math.max(...data.activity.map((day) => day.captures), 1);

  return (
    <div className="today-bento">
      <section className="card focus-card card-span-2">
        <div className="card-label"><span className="attention-pulse" /> Needs attention <button onClick={() => onNavigate("tasks")}>View tasks <ArrowRight size={14} /></button></div>
        {focusTask ? (
          <div className="focus-content">
            <div>
              <span className="task-id">{focusTask.publicId} {isOverdue(focusTask, data.user.timezone) && <i>Overdue</i>}</span>
              <h2>{focusTask.title}</h2>
              {focusTask.description && <p>{focusTask.description}</p>}
              <div className="meta-row">
                {focusTask.dueAt && <span><Clock3 size={14} /> {formatDate(focusTask.dueAt, data.user.timezone, { weekday: "short" })}, {formatTime(focusTask.dueAt, data.user.timezone)}</span>}
                {focusTask.recurring && <span><Repeat2 size={14} /> Repeats</span>}
                {focusTask.reminderCount ? <span><Bell size={14} /> Nudged {focusTask.reminderCount}×</span> : null}
              </div>
            </div>
            <button className="complete-focus" onClick={() => onToggle(focusTask.id)}><Check size={18} /> Mark complete</button>
          </div>
        ) : (
          <div className="empty-focus"><CheckCircle2 size={28} /><h2>Nothing needs your attention.</h2><p>That is allowed to feel good.</p></div>
        )}
        <div className="focus-thread" aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className="card metric-card metric-overdue">
        <div className="metric-icon"><Flame size={18} /></div>
        <span>Overdue</span><b>{overdue}</b><small>{overdue === 1 ? "thing wants a decision" : "things want a decision"}</small>
      </section>
      <section className="card metric-card metric-completed">
        <div className="metric-icon"><CalendarDays size={18} /></div>
        <span>Today</span><b>{today}</b><small>planned moments</small>
      </section>
      <section className="card metric-card">
        <div className="metric-icon"><CheckCircle2 size={18} /></div>
        <span>Completed</span><b>{completed}</b><small>this week</small>
      </section>

      <section className="card threadline-card card-span-2">
        <div className="section-heading"><div><span className="card-kicker">Your threadline</span><h3>What comes next</h3></div><button onClick={() => onNavigate("tasks")} aria-label="Open all tasks"><MoreHorizontal size={18} /></button></div>
        <ol className="threadline-list">
          {upcoming.map((task, index) => (
            <li key={task.id} className={isOverdue(task, data.user.timezone) ? "overdue" : ""}>
              <button className="thread-check" onClick={() => onToggle(task.id)} aria-label={`Complete ${task.title}`}><Check size={13} /></button>
              <div className="thread-time"><b>{formatTime(task.dueAt, data.user.timezone)}</b><small>{isToday(task.dueAt, data.user.timezone) ? "Today" : formatDate(task.dueAt!, data.user.timezone)}</small></div>
              <div className="thread-copy"><b>{task.title}</b><span>{task.recurring ? "Repeating task" : task.description ?? "From Telegram"}</span></div>
              {task.recurring && <Repeat2 size={15} />}
              {index < upcoming.length - 1 && <i className="thread-segment" />}
            </li>
          ))}
        </ol>
      </section>

      <section className="card recent-card">
        <div className="section-heading"><div><span className="card-kicker">Recently captured</span><h3>Still warm</h3></div><button onClick={() => onNavigate("library")}><ArrowRight size={17} /></button></div>
        <div className="capture-stack">
          {data.notes.slice(0, 2).map((note, index) => (
            <article key={note.id} style={{ "--stack-index": index } as React.CSSProperties}>
              <span className="capture-type note"><FileText size={14} /></span>
              <div><b>{note.title}</b><p>{note.summary}</p><small>{formatDate(note.createdAt, data.user.timezone)} · {note.tags[0]}</small></div>
            </article>
          ))}
          {data.ideas.slice(0, 1).map((idea, index) => (
            <article key={idea.id} style={{ "--stack-index": index + 2 } as React.CSSProperties}>
              <span className="capture-type idea"><Lightbulb size={14} /></span>
              <div><b>{idea.title}</b><p>{idea.concept}</p><small>{formatDate(idea.createdAt, data.user.timezone)} · idea</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="card rhythm-card">
        <div className="section-heading"><div><span className="card-kicker">Weekly rhythm</span><h3>{completed} things moved forward</h3></div><TrendingUp size={18} /></div>
        <div className="activity-chart" aria-label="Captures over the last seven days">
          {data.activity.map((day) => (
            <div key={day.day}><span><i style={{ height: `${Math.max(12, (day.captures / maxActivity) * 100)}%` }} /></span><small>{day.day[0]}</small></div>
          ))}
        </div>
        <p><i /> Captured <span><i /> Completed</span></p>
      </section>

      <section className="card spend-card">
        <div className="section-heading"><div><span className="card-kicker">This month</span><h3>{money(monthSpend, data.expenses[0]?.currency ?? "SGD")}</h3></div><button onClick={() => onNavigate("expenses")}><ArrowRight size={17} /></button></div>
        <div className="spend-track"><i style={{ width: "100%" }} /></div>
        <p>Captured this month <span>{monthExpenses.length} {monthExpenses.length === 1 ? "expense" : "expenses"}</span></p>
        <div className="merchant-row">
          {data.expenses.slice(0, 3).map((expense) => <span key={expense.id}>{expense.merchant[0]}<small>{expense.merchant}</small></span>)}
        </div>
      </section>

      <section className="card integrations-card">
        <div className="section-heading"><div><span className="card-kicker">Connections</span><h3>Quietly in sync</h3></div><Settings size={17} /></div>
        {data.integrations.map((integration) => (
          <div className="integration-row" key={integration.name}><span className={`integration-logo ${integration.name.toLowerCase()}`}>{integration.name[0]}</span><div><b>{integration.name}</b><small>{integration.detail}</small></div><i className={integration.state} /></div>
        ))}
      </section>
    </div>
  );
}

function TasksView({ tasks, timezone, onToggle }: { tasks: DashboardTask[]; timezone: string; onToggle: (id: string) => void }) {
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const visible = tasks.filter((task) => filter === "all" || (filter === "open" ? task.status === "OPEN" : task.status === "DONE"));
  return (
    <section className="collection-view">
      <div className="view-toolbar"><div className="segmented-control">{(["open", "done", "all"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "done" ? "Completed" : item[0].toUpperCase() + item.slice(1)} <span>{tasks.filter((task) => item === "all" || (item === "open" ? task.status === "OPEN" : task.status === "DONE")).length}</span></button>)}</div></div>
      <div className="task-table card">
        <div className="task-table-head"><span>Task</span><span>When</span><span>Details</span><span /></div>
        {visible.map((task) => (
          <article className={task.status === "DONE" ? "is-done" : ""} key={task.id}>
            <button className="task-checkbox" onClick={() => onToggle(task.id)} aria-label={`${task.status === "DONE" ? "Restore" : "Complete"} ${task.title}`}>{task.status === "DONE" && <Check size={14} />}</button>
            <div className="task-title"><b>{task.title}</b><small>{task.publicId} · {task.description ?? "Captured in Telegram"}</small></div>
            <div className={isOverdue(task, timezone) ? "task-date overdue" : "task-date"}><b>{task.dueAt ? formatDate(task.dueAt, timezone, { weekday: "short" }) : "No date"}</b><small>{formatTime(task.dueAt, timezone)}</small></div>
            <div className="task-chips">{task.recurring && <span><Repeat2 size={12} /> Repeats</span>}{task.pinned && <span><Pin size={12} /> Pinned</span>}{task.assignee && <span>{task.assignee}</span>}</div>
            <button className="row-menu" disabled title="More web editing tools are coming next" aria-label={`More actions for ${task.title} are not available yet`}><MoreHorizontal size={18} /></button>
          </article>
        ))}
        {!visible.length && <div className="empty-list"><CheckCircle2 size={26} /><b>Nothing here.</b><span>This view is beautifully empty.</span></div>}
      </div>
    </section>
  );
}

function NotesView({ notes, timezone }: { notes: DashboardNote[]; timezone: string }) {
  return <section className="content-grid">{notes.map((note, index) => <article className={`content-card note-card tone-${index % 3}`} key={note.id}>{note.pinned && <Pin className="content-pin" size={15} />}<span className="content-kind"><FileText size={14} /> Note · {note.publicId}</span><h3>{note.title}</h3><p>{note.summary}</p><div className="tag-row">{note.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><footer><span>{formatDate(note.createdAt, timezone, { year: "numeric" })}</span><span>Detail view next <ArrowRight size={14} /></span></footer></article>)}</section>;
}

function IdeasView({ ideas, timezone }: { ideas: DashboardIdea[]; timezone: string }) {
  return <section className="content-grid ideas-grid">{ideas.map((idea, index) => <article className={`content-card idea-card tone-${index % 3}`} key={idea.id}><div className="idea-top"><span className="content-kind"><Lightbulb size={14} /> {idea.publicId}</span><span className={`status-pill status-${idea.status.toLowerCase()}`}>{idea.status.toLowerCase()}</span></div><h3>{idea.title}</h3><p>{idea.concept}</p><div className="tag-row">{idea.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><footer><span>{formatDate(idea.createdAt, timezone, { year: "numeric" })}</span><span>Detail view next <ArrowRight size={14} /></span></footer></article>)}</section>;
}

function ExpensesView({ expenses, timezone }: { expenses: DashboardExpense[]; timezone: string }) {
  const monthKey = calendarKey(new Date(), timezone).slice(0, 7);
  const current = expenses.filter((expense) => calendarKey(expense.transactionAt, timezone).startsWith(monthKey));
  const total = current.reduce((sum, expense) => sum + expense.total, 0);
  const categories = Object.entries(current.reduce<Record<string, number>>((result, expense) => ({ ...result, [expense.category]: (result[expense.category] ?? 0) + expense.total }), {})).sort((a, b) => b[1] - a[1]);
  const monthLabel = new Intl.DateTimeFormat("en-SG", { month: "long", timeZone: timezone }).format(new Date());
  return (
    <section className="expense-view">
      <div className="expense-summary card"><span className="card-kicker">{monthLabel} spending</span><h2>{money(total, expenses[0]?.currency ?? "SGD")}</h2><p><CircleDollarSign size={14} /> From {current.length} captured {current.length === 1 ? "expense" : "expenses"}</p><div className="category-bars">{categories.map(([category, value], index) => <div key={category}><span><b>{category}</b><small>{money(value, expenses[0]?.currency ?? "SGD")}</small></span><i><em style={{ width: `${(value / categories[0][1]) * 100}%`, "--bar-index": index } as React.CSSProperties} /></i></div>)}</div></div>
      <div className="expense-list card"><div className="section-heading"><div><span className="card-kicker">Latest</span><h3>Recent expenses</h3></div><span className="export-soon"><Paperclip size={15} /> Export next</span></div>{expenses.map((expense) => <article key={expense.id}><span className="merchant-icon">{expense.merchant[0]}</span><div><b>{expense.merchant}</b><small>{expense.description} · {expense.category}</small></div><span><b>{money(expense.total, expense.currency)}</b><small>{formatDate(expense.transactionAt, timezone)}</small></span><span className="row-more"><MoreHorizontal size={18} /></span></article>)}</div>
    </section>
  );
}

function LibraryView({ data }: { data: DashboardSnapshot }) {
  const items = [
    ...data.notes.map((item) => ({ ...item, kind: "Note", copy: item.summary, icon: FileText })),
    ...data.ideas.map((item) => ({ ...item, kind: "Idea", copy: item.concept, icon: Lightbulb })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return <section className="library-list card"><div className="library-head"><span>All captures</span><span>{items.length} things</span></div>{items.map(({ id, title, copy, kind, icon: Icon, createdAt, tags }) => <article key={id}><span className={`library-icon ${kind.toLowerCase()}`}><Icon size={16} /></span><div><span>{kind}</span><h3>{title}</h3><p>{copy}</p><small>{tags.slice(0, 2).map((tag) => `#${tag}`).join("  ")}</small></div><time>{formatDate(createdAt, data.user.timezone)}</time><span className="library-arrow"><ArrowRight size={17} /></span></article>)}</section>;
}

function CommandPalette({ data, tasks, query, onClose, onNavigate }: { data: DashboardSnapshot; tasks: DashboardTask[]; query: string; onClose: () => void; onNavigate: (view: View) => void }) {
  const [value, setValue] = useState(query);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    input.current?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = input.current?.closest("[role='dialog']");
      const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])") ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      previouslyFocused?.focus();
    };
  }, []);
  const results = useMemo(() => {
    const term = value.toLowerCase().trim();
    if (!term) return [];
    return [
      ...tasks.map((item) => ({ id: item.id, title: item.title, detail: item.publicId, kind: "Task", view: "tasks" as View, icon: ListChecks })),
      ...data.notes.map((item) => ({ id: item.id, title: item.title, detail: item.summary, kind: "Note", view: "notes" as View, icon: FileText })),
      ...data.ideas.map((item) => ({ id: item.id, title: item.title, detail: item.concept, kind: "Idea", view: "ideas" as View, icon: Lightbulb })),
    ].filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(term)).slice(0, 7);
  }, [data, tasks, value]);
  return (
    <div className="command-overlay" role="presentation" onMouseDown={onClose}>
      <section className="command-dialog" role="dialog" aria-modal="true" aria-label="Find anything" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input"><Search size={20} /><input ref={input} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search tasks, notes, ideas…" /><kbd>ESC</kbd></div>
        <div className="command-results">
          {!value && <><p>Go somewhere</p>{NAV.slice(0, 5).map(({ id, label, icon: Icon, shortcut }) => <button key={id} onClick={() => onNavigate(id)}><span><Icon size={17} /></span><b>{label}</b>{shortcut && <kbd>{shortcut}</kbd>}</button>)}<p>Quick actions</p><button onClick={() => { onClose(); document.getElementById("capture-input")?.focus(); }}><span><Plus size={17} /></span><b>Capture something new</b><kbd>N</kbd></button></>}
          {value && !results.length && <div className="command-empty"><Search size={24} /><b>No threads found</b><span>Try a title, tag, or a few remembered words.</span></div>}
          {results.length > 0 && <><p>Best matches</p>{results.map(({ id, title, detail, kind, view, icon: Icon }) => <button key={id} onClick={() => onNavigate(view)}><span><Icon size={17} /></span><div><b>{title}</b><small>{kind} · {detail}</small></div><ArrowRight size={15} /></button>)}</>}
        </div>
        <footer><span><kbd>ESC</kbd> Close</span><form action="/api/auth/logout" method="post"><button type="submit"><LogOut size={14} /> Sign out</button></form></footer>
      </section>
    </div>
  );
}
