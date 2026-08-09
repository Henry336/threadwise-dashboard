"use client";

import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import type { AvailabilityPoll, DashboardSnapshot, DashboardTask, DashboardTaskAssignee } from "@/lib/types";

type Collaboration = NonNullable<DashboardSnapshot["collaboration"]>;
type Member = Collaboration["members"][number];
export type GroupTaskScope = "all" | "mine" | "unassigned" | `member:${string}`;
export type CollaborationPayload = {
  action: "assign" | "unassign" | "claim";
  assigneeId?: string;
  targetTelegramId?: string;
  reason?: string;
};

export function GroupOverview({
  data,
  onOpenTasks,
  onOpenPeople,
  onOpenActivity,
  onOpenSchedule,
  onManageTask,
}: {
  data: DashboardSnapshot;
  onOpenTasks: (scope: GroupTaskScope) => void;
  onOpenPeople: () => void;
  onOpenActivity: () => void;
  onOpenSchedule: () => void;
  onManageTask: (task: DashboardTask) => void;
}) {
  const collaboration = data.collaboration;
  if (!collaboration) return null;
  const { summary } = collaboration;
  const generatedAt = new Date(data.generatedAt).getTime();
  const attention = [
    { id: "unassigned" as const, label: "Unassigned", value: summary.unassigned, icon: CircleUserRound },
    { id: "all" as const, label: "Overdue", value: summary.overdue, icon: CalendarClock },
  ];
  const needsAttention = data.tasks
    .filter((task) => task.status === "OPEN" && (
      !(task.assignees ?? []).length
      || Boolean(task.dueAt && new Date(task.dueAt).getTime() < generatedAt)
    ))
    .slice(0, 5);
  const activePoll = data.scheduling?.polls.find((poll) => poll.status === "OPEN");

  return <div className="tw-group-overview">
    <section className="tw-group-intro">
      <div><p><span className="tw-thread-cue" aria-hidden="true"><i /><i /></span>Overview <em className="tw-group-role"><ShieldCheck size={13} /> {data.workspace.role.toLowerCase()}</em></p><h2>{data.workspace.name}</h2></div>
      <div className="tw-member-ribbon" aria-label={`${collaboration.members.length} known members`}>
        <AvatarStack members={collaboration.members} />
        <button onClick={onOpenPeople}>{collaboration.members.length} people <ArrowRight size={15} /></button>
      </div>
    </section>

    <section className="tw-group-attention tw-group-surface">
      <header><div><h3>Needs attention</h3></div><button onClick={() => onOpenTasks("all")}>View work <ArrowRight size={15} /></button></header>
      <div className="tw-attention-grid">{attention.map(({ id, label, value, icon: Icon }, index) => <button key={label} data-active={value > 0} style={{ "--group-index": index } as React.CSSProperties} onClick={() => onOpenTasks(id)}><span><Icon size={18} /></span><b>{value}</b><strong>{label}</strong><ChevronRight size={16} /></button>)}</div>
    </section>

    <section className="tw-group-week tw-group-surface">
      <header><div><h3>This week</h3></div></header>
      <div><article><b>{summary.createdThisWeek}</b><span>tasks added</span></article><article><b>{summary.completedThisWeek}</b><span>completed</span></article><article><b>{data.tasks.filter((task) => task.status === "OPEN").length}</b><span>open now</span></article></div>
    </section>

    <section className="tw-overview-schedule tw-group-surface">
      <header><div><h3>Find a time</h3></div><button onClick={onOpenSchedule}>{activePoll ? "Open poll" : "View"} <ArrowRight size={15} /></button></header>
      {activePoll ? <button className="tw-overview-poll" onClick={onOpenSchedule}><span><CalendarDays size={19} /></span><div><b>{activePoll.title}</b><small>{activePoll.respondentCount}/{activePoll.memberCount} responded</small></div><em>{activePoll.bestSlots[0]?.availableCount ? `${activePoll.bestSlots[0].availableCount} free at the best time` : "Waiting for availability"}</em><ChevronRight size={16} /></button> : <div className="tw-group-clear"><CalendarDays size={20} /><b>No active availability poll.</b></div>}
    </section>

    <section className="tw-group-work tw-group-surface">
      <header><div><h3>Needs action</h3></div></header>
      {needsAttention.length ? <div>{needsAttention.map((task) => <button key={task.id} onClick={() => onManageTask(task)}><TaskGlyph task={task} /><span><b>{task.title}</b><small>{task.publicId} · {taskAttention(task)}</small></span><AssigneeStack assignees={task.assignees ?? []} /><ChevronRight size={16} /></button>)}</div> : <div className="tw-group-clear"><Check size={20} /><b>Nothing needs action.</b></div>}
    </section>

    <section className="tw-group-activity-peek tw-group-surface">
      <header><div><h3>Recent activity</h3></div><button onClick={onOpenActivity}>View all <ArrowRight size={15} /></button></header>
      <ActivityRows activity={collaboration.activity.slice(0, 5)} empty />
    </section>
  </div>;
}

export function GroupPeople({ data, onOpenTasks }: { data: DashboardSnapshot; onOpenTasks: (scope: GroupTaskScope) => void }) {
  const collaboration = data.collaboration;
  if (!collaboration) return null;
  const max = Math.max(1, ...collaboration.members.map((member) => member.openTasks));
  return <section className="tw-people-view">
    <header className="tw-group-page-intro tw-group-page-intro-compact"><h2>People</h2></header>
    <div className="tw-people-grid">{collaboration.members.map((member, index) => <button key={member.telegramId} style={{ "--group-index": index } as React.CSSProperties} onClick={() => onOpenTasks(`member:${member.telegramId}`)}>
      <header><MemberAvatar member={member} /><span><b>{member.displayName}</b><small>{member.role.toLowerCase()}</small></span><ArrowRight size={16} /></header>
      <div className="tw-workload-line"><i style={{ width: `${Math.max(6, member.openTasks / max * 100)}%` }} /></div>
      <footer><span><b>{member.openTasks}</b> open</span></footer>
    </button>)}</div>
  </section>;
}

export function GroupResources({
  data,
  onOpen,
  onAdd,
}: {
  data: DashboardSnapshot;
  onOpen: (view: "notes" | "ideas" | "images") => void;
  onAdd: () => void;
}) {
  const collections = [
    { id: "notes" as const, label: "Notes", count: data.notes.length, copy: "Decisions and details", icon: FileText },
    { id: "ideas" as const, label: "Ideas", count: data.ideas.length, copy: "Ideas to revisit", icon: Lightbulb },
    { id: "images" as const, label: "Images", count: data.images.length, copy: "Searchable images", icon: ImageIcon },
  ];
  const recent = [
    ...data.notes.map((item) => ({ id: item.id, kind: "notes" as const, title: item.title, detail: item.summary, createdAt: item.createdAt })),
    ...data.ideas.map((item) => ({ id: item.id, kind: "ideas" as const, title: item.title, detail: item.concept, createdAt: item.createdAt })),
    ...data.images.map((item) => ({ id: item.id, kind: "images" as const, title: item.caption || item.fileName || "Saved image", detail: item.ocrText || "Visual reference", createdAt: item.createdAt })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);

  return <section className="tw-group-resources">
    <header className="tw-group-page-intro"><h2>Resources</h2><button className="tw-primary" onClick={onAdd}><Plus size={16} /> Add resource</button></header>
    <div className="tw-resource-collections">{collections.map(({ id, label, count, copy, icon: Icon }, index) => <button key={id} style={{ "--group-index": index } as React.CSSProperties} onClick={() => onOpen(id)}><span><Icon size={20} /></span><b>{count}</b><h3>{label}</h3><p>{copy}</p><ArrowRight size={17} /></button>)}</div>
    <div className="tw-resource-recent"><header><h3>Recently added</h3><BookOpen size={20} /></header>{recent.length ? <div>{recent.map((item) => <button key={`${item.kind}-${item.id}`} onClick={() => onOpen(item.kind)}><span>{item.kind === "notes" ? <FileText size={16} /> : item.kind === "ideas" ? <Lightbulb size={16} /> : <ImageIcon size={16} />}</span><div><b>{item.title}</b><small>{item.detail}</small></div><em>{item.kind.slice(0, -1)}</em><ChevronRight size={16} /></button>)}</div> : <div className="tw-activity-empty"><BookOpen size={24} /><b>No resources yet.</b></div>}</div>
  </section>;
}

export function GroupTasksView({
  tasks,
  meetings,
  collaboration,
  scope,
  onScope,
  timezone,
  onToggle,
  onEdit,
  onManage,
  onOpenSchedule,
  onAdd,
  pagination,
  onLoadMore,
  manager,
}: {
  tasks: DashboardTask[];
  meetings: AvailabilityPoll[];
  collaboration: Collaboration;
  scope: GroupTaskScope;
  onScope: (scope: GroupTaskScope) => void;
  timezone: string;
  onToggle: (task: DashboardTask) => void;
  onEdit: (task: DashboardTask) => void;
  onManage: (task: DashboardTask) => void;
  onOpenSchedule: () => void;
  onAdd: () => void;
  pagination: { hasMore: boolean; loading: boolean };
  onLoadMore: () => void;
  manager: boolean;
}) {
  const [query, setQuery] = useState("");
  const viewer = collaboration.viewerTelegramId;
  const memberScope = scope.startsWith("member:") ? scope.slice(7) : undefined;
  const visible = tasks.filter((task) => {
    if (!`${task.title} ${task.description ?? ""} ${task.publicId}`.toLowerCase().includes(query.toLowerCase())) return false;
    const assignees = task.assignees ?? [];
    if (scope === "mine") return assignees.some((item) => item.telegramId === viewer);
    if (scope === "unassigned") return !assignees.length;
    if (memberScope) return assignees.some((item) => item.telegramId === memberScope);
    return task.status !== "CANCELED";
  }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || +(new Date(b.createdAt ?? 0)) - +(new Date(a.createdAt ?? 0)));
  const scopes: Array<[GroupTaskScope, string]> = [["all", "All work"], ["mine", "My work"], ["unassigned", "Unassigned"]];
  const currentMember = memberScope ? collaboration.members.find((member) => member.telegramId === memberScope) : undefined;
  return <section className="tw-group-tasks">
    <div className="tw-group-task-tools"><div className="tw-group-scope-tabs">{scopes.map(([id, label]) => <button key={id} className={scope === id ? "active" : ""} onClick={() => onScope(id)}>{label}</button>)}{currentMember && <button className="active" onClick={() => onScope("all")}>{currentMember.displayName} <X size={13} /></button>}</div><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter shared tasks as you type" /></label></div>
    {meetings.length > 0 && <div className="tw-work-meetings"><header><span><CalendarDays size={17} /> Confirmed meetings</span><button onClick={onOpenSchedule}>Find a time <ArrowRight size={14} /></button></header><div>{meetings.slice(0, 3).map((meeting) => <button key={meeting.id} onClick={onOpenSchedule}><span><b>{meeting.finalStartAt ? new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: meeting.timezone }).format(new Date(meeting.finalStartAt)) : "Confirmed"}</b><small>{meeting.timezone}</small></span><strong>{meeting.title}</strong><ChevronRight size={15} /></button>)}</div></div>}
    <div className="tw-group-task-list">{visible.map((task, index) => {
      const assignees = task.assignees ?? [];
      const isAssignee = assignees.some((item) => item.telegramId === viewer);
      const isCreator = collaboration.activity.some((item) => item.taskPublicId === task.publicId && item.type === "TASK_CREATED" && item.actorTelegramId === viewer);
      const canComplete = task.status === "DONE" ? manager || isCreator : manager || isCreator || isAssignee;
      const canEdit = manager || isCreator;
      return <article key={task.id} className={task.status === "DONE" ? "done" : ""} style={{ "--group-index": index } as React.CSSProperties} onContextMenu={(event) => { event.preventDefault(); onManage(task); }}>
        {canComplete ? <button className="tw-group-task-check" onClick={() => onToggle(task)} aria-label={task.status === "DONE" ? `Restore ${task.title}` : `Complete ${task.title}`}><Check size={16} /></button> : <span className="tw-group-task-check" aria-hidden="true"><CircleUserRound size={16} /></span>}
        <button className="tw-group-task-copy" onClick={() => onManage(task)}><span><em>{task.publicId}</em></span><h3>{task.title}</h3><p>{task.description || "No extra details yet."}</p><small>{task.dueAt ? new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(task.dueAt)) : "No due date"}</small></button>
        <div className="tw-group-task-owners"><span className="tw-group-owner-stack"><AssigneeStack assignees={assignees} limit={4} />{task.teamOwnerLabel && <small>{task.teamOwnerLabel}</small>}</span><button onClick={() => onManage(task)}><MoreHorizontal size={18} /><span>Assignments</span></button></div>
        <div className="tw-group-task-actions">{canEdit && <button onClick={() => onEdit(task)}><Pencil size={14} /> Edit</button>}<button onClick={() => onManage(task)}><UsersRound size={14} /> View task</button></div>
      </article>;
    })}</div>
    {!visible.length && <div className="tw-group-task-empty"><ListChecks size={24} /><b>No tasks in this view.</b><span>Change the filter or add a shared task.</span><button onClick={onAdd}><Plus size={16} /> Add task</button></div>}
    {pagination.hasMore && <button className="tw-load-more" onClick={onLoadMore} disabled={pagination.loading}>{pagination.loading ? "Loading…" : "Load more"}</button>}
  </section>;
}

export function GroupProgress({ data, onManageTask }: { data: DashboardSnapshot; onManageTask: (task: DashboardTask) => void }) {
  const collaboration = data.collaboration;
  if (!collaboration) return null;
  return <section className="tw-standup-view">
    <header className="tw-group-page-intro tw-group-page-intro-compact"><h2>Progress</h2></header>
    <div className="tw-standup-list">{collaboration.members.map((member, index) => {
      const assigned = data.tasks.filter((task) => task.status === "OPEN" && (task.assignees ?? []).some((item) => item.telegramId === member.telegramId));
      const next = assigned.slice(0, 2);
      const completed = collaboration.activity.filter((item) => item.actorTelegramId === member.telegramId && item.type === "TASK_COMPLETED").length;
      return <article key={member.telegramId} style={{ "--group-index": index } as React.CSSProperties}>
        <header><MemberAvatar member={member} /><span><b>{member.displayName}</b><small>{member.openTasks} open task{member.openTasks === 1 ? "" : "s"}</small></span></header>
        <div><section><span><Check size={14} /> Done</span><b>{completed}</b><small>recorded this week</small></section><section><span><ListChecks size={14} /> Next</span>{next.length ? next.map((task) => <button key={task.id} onClick={() => onManageTask(task)}>{task.title}<ChevronRight size={14} /></button>) : <small>Nothing queued</small>}</section></div>
      </article>;
    })}</div>
  </section>;
}

export function GroupActivityView({ data }: { data: DashboardSnapshot }) {
  const collaboration = data.collaboration;
  if (!collaboration) return null;
  return <section className="tw-activity-view">
    <header className="tw-group-page-intro tw-group-page-intro-compact"><h2>Activity</h2></header>
    <div className="tw-activity-card"><ActivityRows activity={collaboration.activity} empty /></div>
  </section>;
}

export function AssigneeStack({ assignees, limit = 3 }: { assignees: DashboardTaskAssignee[]; limit?: number }) {
  if (!assignees.length) return <span className="tw-assignee-empty"><CircleUserRound size={14} /> Unassigned</span>;
  return <span className="tw-assignee-stack" aria-label={assignees.map((item) => `${item.displayName}: ${item.status.toLowerCase()}`).join(", ")}>
    {assignees.slice(0, limit).map((item) => <i key={item.id} data-status={item.status} title={`${item.displayName} · ${item.status.toLowerCase()}`}>{initials(item.displayName)}</i>)}
    {assignees.length > limit && <i className="more">+{assignees.length - limit}</i>}
  </span>;
}

export function TaskCollaborationSheet({
  task,
  collaboration,
  manager,
  busy,
  onClose,
  onAction,
}: {
  task: DashboardTask;
  collaboration: Collaboration;
  manager: boolean;
  busy: boolean;
  onClose: () => void;
  onAction: (payload: CollaborationPayload) => Promise<boolean>;
}) {
  const [target, setTarget] = useState("");
  const assignees = task.assignees ?? [];
  const available = collaboration.members.filter((member) => !assignees.some((item) => item.telegramId === member.telegramId));
  const viewerIsCreator = collaboration.activity.some((item) => item.taskPublicId === task.publicId && item.type === "TASK_CREATED" && item.actorTelegramId === collaboration.viewerTelegramId);
  const canManage = manager || viewerIsCreator;
  return <div className="tw-collab-overlay" onMouseDown={onClose}>
    <section className="tw-collab-sheet" role="dialog" aria-modal="true" aria-label={`Assignments for ${task.title}`} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>{task.publicId}</span><h2>{task.title}</h2><p>Assignments take effect immediately and stay in sync with Telegram.</p></div><button onClick={onClose} aria-label="Close assignment panel"><X size={20} /></button></header>
      <div className="tw-collab-assignees">
        {assignees.map((assignee) => <article key={assignee.id}>
            <div className="tw-collab-person"><span>{initials(assignee.displayName)}</span><div><b>{assignee.displayName}</b><small data-status={assignee.status}>{statusLabel(assignee)}</small></div></div>
            {canManage && <div className="tw-collab-actions"><button className="quiet" disabled={busy} onClick={() => onAction({ action: "unassign", assigneeId: assignee.id })}>Remove</button></div>}
          </article>)}
        {!assignees.length && <div className="tw-collab-empty"><UsersRound size={22} /><b>Unassigned</b><span>{canManage ? "Choose an active member below, or leave it open for someone to claim." : "Claim this task if you are taking it."}</span>{!canManage && <button className="tw-primary" disabled={busy} onClick={() => onAction({ action: "claim" })}>Claim task</button>}</div>}
      </div>
      {canManage ? <footer><label><UserPlus size={16} /><select value={target} onChange={(event) => setTarget(event.target.value)}><option value="">Add an assignee…</option>{available.map((member) => <option key={member.telegramId} value={member.telegramId}>{member.displayName}</option>)}</select></label><button className="tw-primary" disabled={busy || !target} onClick={() => onAction({ action: "assign", targetTelegramId: target })}>Assign</button></footer> : assignees.length > 0 ? <footer className="tw-collab-member-note"><ShieldCheck size={16} /><span><b>Assigned</b><small>The creator or a current Telegram group administrator can reassign this task.</small></span></footer> : null}
    </section>
  </div>;
}

function ActivityRows({ activity, empty = false }: { activity: Collaboration["activity"]; empty?: boolean }) {
  if (!activity.length) return empty ? <div className="tw-activity-empty"><MessageSquareText size={22} /><b>No activity yet.</b></div> : null;
  return <div className="tw-activity-rows">{activity.map((item, index) => <article key={item.id} style={{ "--group-index": index } as React.CSSProperties}><span className="tw-activity-glyph">{activityIcon(item.type)}</span><div><b>{item.summary}</b><small>{relativeTime(item.createdAt)}{item.taskTitle ? ` · ${item.taskTitle}` : ""}</small></div>{item.taskPublicId && <em>{item.taskPublicId}</em>}</article>)}</div>;
}

function AvatarStack({ members }: { members: Member[] }) {
  return <span className="tw-avatar-stack">{members.slice(0, 5).map((member) => <i key={member.telegramId} title={member.displayName}>{member.initials}</i>)}{members.length > 5 && <i>+{members.length - 5}</i>}</span>;
}

function MemberAvatar({ member }: { member: Member }) {
  return <span className="tw-member-avatar" aria-hidden="true">{member.initials}</span>;
}

function TaskGlyph({ task }: { task: DashboardTask }) {
  const assigned = (task.assignees ?? []).length > 0;
  return <span className="tw-task-glyph" data-state={assigned ? "ready" : "unassigned"}>{assigned ? <ShieldCheck size={16} /> : <CircleUserRound size={16} />}</span>;
}

function taskAttention(task: DashboardTask): string {
  const assignees = task.assignees ?? [];
  if (!assignees.length) return "Needs an owner";
  if (task.dueAt && new Date(task.dueAt).getTime() < Date.now()) return "Overdue";
  return "Assigned";
}

function statusLabel(_assignee: DashboardTaskAssignee): string {
  return "Assigned";
}

function activityIcon(type: string) {
  if (type.includes("HAND")) return <ArrowRight size={15} />;
  if (type.includes("ACCEPT") || type.includes("COMPLET")) return <Check size={15} />;
  if (type.includes("ASSIGN")) return <UserPlus size={15} />;
  return <MessageSquareText size={15} />;
}

function initials(name: string): string {
  return name.replace(/^@/, "").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "TW";
}

function relativeTime(value: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
