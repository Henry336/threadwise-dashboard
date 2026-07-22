"use client";

import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileText,
  Hand,
  Image as ImageIcon,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Unlink,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import type { DashboardSnapshot, DashboardTask, DashboardTaskAssignee } from "@/lib/types";

type Collaboration = NonNullable<DashboardSnapshot["collaboration"]>;
type Member = Collaboration["members"][number];
export type GroupTaskScope = "all" | "mine" | "unassigned" | "blocked" | "pending" | `member:${string}`;
export type CollaborationPayload = {
  action: "assign" | "unassign" | "accept" | "decline" | "block" | "unblock" | "handoff";
  assigneeId?: string;
  targetTelegramId?: string;
  reason?: string;
};

export function GroupOverview({
  data,
  onOpenTasks,
  onOpenPeople,
  onOpenActivity,
  onManageTask,
}: {
  data: DashboardSnapshot;
  onOpenTasks: (scope: GroupTaskScope) => void;
  onOpenPeople: () => void;
  onOpenActivity: () => void;
  onManageTask: (task: DashboardTask) => void;
}) {
  const collaboration = data.collaboration;
  if (!collaboration) return null;
  const { summary } = collaboration;
  const generatedAt = new Date(data.generatedAt).getTime();
  const attention = [
    { id: "blocked" as const, label: "Blocked", value: summary.blocked, copy: "Waiting on a decision or dependency", icon: Unlink },
    { id: "unassigned" as const, label: "Unassigned", value: summary.unassigned, copy: "Open work without an owner", icon: CircleUserRound },
    { id: "pending" as const, label: "Awaiting reply", value: summary.awaitingAcknowledgement, copy: "Assignments not yet acknowledged", icon: Hand },
    { id: "all" as const, label: "Overdue", value: summary.overdue, copy: "Past their due time", icon: CalendarClock },
  ];
  const needsAttention = data.tasks
    .filter((task) => task.status === "OPEN" && (
      (task.assignees ?? []).some((item) => item.status === "BLOCKED" || item.status === "PENDING")
      || !(task.assignees ?? []).length
      || Boolean(task.dueAt && new Date(task.dueAt).getTime() < generatedAt)
    ))
    .slice(0, 5);

  return <div className="tw-group-overview">
    <section className="tw-group-intro">
      <div><p><span className="tw-thread-cue" aria-hidden="true"><i /><i /></span>Group overview <em className="tw-group-role"><ShieldCheck size={13} /> {data.workspace.role.toLowerCase()}</em></p><h2>A clear handoff from chat to action.</h2><span>See what needs a person, a reply, or a quick decision—without turning the group into a project-management maze.</span></div>
      <div className="tw-member-ribbon" aria-label={`${collaboration.members.length} known members`}>
        <AvatarStack members={collaboration.members} />
        <button onClick={onOpenPeople}>{collaboration.members.length} people <ArrowRight size={15} /></button>
      </div>
    </section>

    <section className="tw-group-attention tw-group-surface">
      <header><div><span>Needs attention</span><h3>Four quick checks</h3></div><button onClick={() => onOpenTasks("all")}>All tasks <ArrowRight size={15} /></button></header>
      <div className="tw-attention-grid">{attention.map(({ id, label, value, copy, icon: Icon }, index) => <button key={label} style={{ "--group-index": index } as React.CSSProperties} onClick={() => onOpenTasks(id)}><span><Icon size={18} /></span><b>{value}</b><strong>{label}</strong><small>{value ? copy : "Nothing here right now"}</small><ChevronRight size={16} /></button>)}</div>
    </section>

    <section className="tw-group-work tw-group-surface">
      <header><div><span>Active handoffs</span><h3>{needsAttention.length ? "The work worth opening" : "Everything has an owner"}</h3></div></header>
      {needsAttention.length ? <div>{needsAttention.map((task) => <button key={task.id} onClick={() => onManageTask(task)}><TaskGlyph task={task} /><span><b>{task.title}</b><small>{task.publicId} · {taskAttention(task)}</small></span><AssigneeStack assignees={task.assignees ?? []} /><ChevronRight size={16} /></button>)}</div> : <div className="tw-group-clear"><Check size={20} /><b>No loose ends in the current view.</b><span>New messages and dashboard edits will appear here automatically.</span></div>}
    </section>

    <section className="tw-group-week tw-group-surface">
      <header><div><span>This week</span><h3>A small factual snapshot</h3></div></header>
      <div><article><b>{summary.createdThisWeek}</b><span>tasks added</span></article><article><b>{summary.completedThisWeek}</b><span>completed</span></article><article><b>{summary.handoffsThisWeek}</b><span>handoffs</span></article></div>
    </section>

    <section className="tw-group-activity-peek tw-group-surface">
      <header><div><span>Recent movement</span><h3>Who changed what</h3></div><button onClick={onOpenActivity}>Open activity <ArrowRight size={15} /></button></header>
      <ActivityRows activity={collaboration.activity.slice(0, 5)} />
    </section>
  </div>;
}

export function GroupPeople({ data, onOpenTasks }: { data: DashboardSnapshot; onOpenTasks: (scope: GroupTaskScope) => void }) {
  const collaboration = data.collaboration;
  if (!collaboration) return null;
  const max = Math.max(1, ...collaboration.members.map((member) => member.openTasks));
  return <section className="tw-people-view">
    <header className="tw-group-page-intro"><span>People</span><h2>Workload, without the surveillance.</h2><p>Threadwise only shows shared assignments it already knows about. It does not score activity or read unrelated conversation.</p></header>
    <div className="tw-people-grid">{collaboration.members.map((member, index) => <button key={member.telegramId} style={{ "--group-index": index } as React.CSSProperties} onClick={() => onOpenTasks(`member:${member.telegramId}`)}>
      <header><MemberAvatar member={member} /><span><b>{member.displayName}</b><small>{member.role.toLowerCase()}</small></span><ArrowRight size={16} /></header>
      <div className="tw-workload-line"><i style={{ width: `${Math.max(6, member.openTasks / max * 100)}%` }} /></div>
      <footer><span><b>{member.openTasks}</b> open</span><span><b>{member.awaitingTasks}</b> awaiting reply</span><span><b>{member.blockedTasks}</b> blocked</span></footer>
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
    { id: "notes" as const, label: "Shared notes", count: data.notes.length, copy: "Decisions, context, and useful details", icon: FileText },
    { id: "ideas" as const, label: "Shared ideas", count: data.ideas.length, copy: "Possibilities the group can return to", icon: Lightbulb },
    { id: "images" as const, label: "Visual references", count: data.images.length, copy: "Searchable screenshots and saved frames", icon: ImageIcon },
  ];
  const recent = [
    ...data.notes.map((item) => ({ id: item.id, kind: "notes" as const, title: item.title, detail: item.summary, createdAt: item.createdAt })),
    ...data.ideas.map((item) => ({ id: item.id, kind: "ideas" as const, title: item.title, detail: item.concept, createdAt: item.createdAt })),
    ...data.images.map((item) => ({ id: item.id, kind: "images" as const, title: item.caption || item.fileName || "Saved image", detail: item.ocrText || "Visual reference", createdAt: item.createdAt })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);

  return <section className="tw-group-resources">
    <header className="tw-group-page-intro"><span>Resources</span><h2>Shared context, without digging through chat.</h2><p>Notes, ideas, and searchable images live together here. Work remains in the Work view; personal expenses stay private.</p><button className="tw-primary" onClick={onAdd}><Plus size={16} /> Add resource</button></header>
    <div className="tw-resource-collections">{collections.map(({ id, label, count, copy, icon: Icon }, index) => <button key={id} style={{ "--group-index": index } as React.CSSProperties} onClick={() => onOpen(id)}><span><Icon size={20} /></span><b>{count}</b><h3>{label}</h3><p>{copy}</p><ArrowRight size={17} /></button>)}</div>
    <div className="tw-resource-recent"><header><div><span>Recently added</span><h3>Fresh group context</h3></div><BookOpen size={20} /></header>{recent.length ? <div>{recent.map((item) => <button key={`${item.kind}-${item.id}`} onClick={() => onOpen(item.kind)}><span>{item.kind === "notes" ? <FileText size={16} /> : item.kind === "ideas" ? <Lightbulb size={16} /> : <ImageIcon size={16} />}</span><div><b>{item.title}</b><small>{item.detail}</small></div><em>{item.kind.slice(0, -1)}</em><ChevronRight size={16} /></button>)}</div> : <div className="tw-activity-empty"><BookOpen size={24} /><b>No shared resources yet.</b><span>Add a note, idea, or image when the group needs lasting context.</span></div>}</div>
  </section>;
}

export function GroupTasksView({
  tasks,
  collaboration,
  scope,
  onScope,
  timezone,
  onToggle,
  onEdit,
  onManage,
  onAdd,
  pagination,
  onLoadMore,
}: {
  tasks: DashboardTask[];
  collaboration: Collaboration;
  scope: GroupTaskScope;
  onScope: (scope: GroupTaskScope) => void;
  timezone: string;
  onToggle: (task: DashboardTask) => void;
  onEdit: (task: DashboardTask) => void;
  onManage: (task: DashboardTask) => void;
  onAdd: () => void;
  pagination: { hasMore: boolean; loading: boolean };
  onLoadMore: () => void;
}) {
  const [query, setQuery] = useState("");
  const viewer = collaboration.viewerTelegramId;
  const memberScope = scope.startsWith("member:") ? scope.slice(7) : undefined;
  const visible = tasks.filter((task) => {
    if (!`${task.title} ${task.description ?? ""} ${task.publicId}`.toLowerCase().includes(query.toLowerCase())) return false;
    const assignees = task.assignees ?? [];
    if (scope === "mine") return assignees.some((item) => item.telegramId === viewer && item.status !== "DECLINED");
    if (scope === "unassigned") return !assignees.length || assignees.every((item) => item.status === "DECLINED");
    if (scope === "blocked") return assignees.some((item) => item.status === "BLOCKED");
    if (scope === "pending") return assignees.some((item) => item.status === "PENDING");
    if (memberScope) return assignees.some((item) => item.telegramId === memberScope && item.status !== "DECLINED");
    return task.status !== "CANCELED";
  }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || +(new Date(b.createdAt ?? 0)) - +(new Date(a.createdAt ?? 0)));
  const scopes: Array<[GroupTaskScope, string]> = [["all", "All work"], ["mine", "My work"], ["unassigned", "Unassigned"], ["blocked", "Blocked"], ["pending", "Awaiting reply"]];
  const currentMember = memberScope ? collaboration.members.find((member) => member.telegramId === memberScope) : undefined;
  return <section className="tw-group-tasks">
    <div className="tw-group-task-tools"><div className="tw-group-scope-tabs">{scopes.map(([id, label]) => <button key={id} className={scope === id ? "active" : ""} onClick={() => onScope(id)}>{label}</button>)}{currentMember && <button className="active" onClick={() => onScope("all")}>{currentMember.displayName} <X size={13} /></button>}</div><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter shared tasks as you type" /></label></div>
    <div className="tw-group-task-list">{visible.map((task, index) => {
      const assignees = task.assignees ?? [];
      const blocked = assignees.find((item) => item.status === "BLOCKED");
      const pending = assignees.some((item) => item.status === "PENDING");
      return <article key={task.id} className={task.status === "DONE" ? "done" : ""} style={{ "--group-index": index } as React.CSSProperties} onContextMenu={(event) => { event.preventDefault(); onManage(task); }}>
        <button className="tw-group-task-check" onClick={() => onToggle(task)} aria-label={task.status === "DONE" ? `Restore ${task.title}` : `Complete ${task.title}`}><Check size={16} /></button>
        <button className="tw-group-task-copy" onClick={() => onEdit(task)}><span><em>{task.publicId}</em>{blocked ? <i data-state="blocked"><Unlink size={13} /> Blocked</i> : pending ? <i data-state="pending"><Clock3 size={13} /> Awaiting reply</i> : null}</span><h3>{task.title}</h3><p>{blocked?.statusReason || task.description || "No extra details yet."}</p><small>{task.dueAt ? new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(task.dueAt)) : "No due date"}</small></button>
        <div className="tw-group-task-owners"><AssigneeStack assignees={assignees} limit={4} /><button onClick={() => onManage(task)}><MoreHorizontal size={18} /><span>Assignments</span></button></div>
        <div className="tw-group-task-actions"><button onClick={() => onEdit(task)}><Pencil size={14} /> Edit</button><button onClick={() => onManage(task)}><UsersRound size={14} /> Assignees</button></div>
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
    <header className="tw-group-page-intro"><span>Progress</span><h2>Done, next, blocked.</h2><p>A live summary derived from shared work—not another form everyone has to fill in.</p></header>
    <div className="tw-standup-list">{collaboration.members.map((member, index) => {
      const assigned = data.tasks.filter((task) => task.status === "OPEN" && (task.assignees ?? []).some((item) => item.telegramId === member.telegramId));
      const blocked = assigned.filter((task) => (task.assignees ?? []).some((item) => item.telegramId === member.telegramId && item.status === "BLOCKED"));
      const next = assigned.filter((task) => !blocked.includes(task)).slice(0, 2);
      const completed = collaboration.activity.filter((item) => item.actorTelegramId === member.telegramId && item.type === "TASK_COMPLETED").length;
      return <article key={member.telegramId} style={{ "--group-index": index } as React.CSSProperties}>
        <header><MemberAvatar member={member} /><span><b>{member.displayName}</b><small>{member.openTasks} open task{member.openTasks === 1 ? "" : "s"}</small></span></header>
        <div><section><span><Check size={14} /> Done</span><b>{completed}</b><small>recorded this week</small></section><section><span><ListChecks size={14} /> Next</span>{next.length ? next.map((task) => <button key={task.id} onClick={() => onManageTask(task)}>{task.title}<ChevronRight size={14} /></button>) : <small>Nothing queued</small>}</section><section><span><Unlink size={14} /> Blocked</span>{blocked.length ? blocked.map((task) => <button key={task.id} onClick={() => onManageTask(task)}>{task.title}<ChevronRight size={14} /></button>) : <small>Nothing blocked</small>}</section></div>
      </article>;
    })}</div>
  </section>;
}

export function GroupActivityView({ data }: { data: DashboardSnapshot }) {
  const collaboration = data.collaboration;
  if (!collaboration) return null;
  return <section className="tw-activity-view">
    <header className="tw-group-page-intro"><span>Activity</span><h2>A quiet record of shared changes.</h2><p>Useful accountability without noisy per-click notifications.</p></header>
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
  const [handoffTarget, setHandoffTarget] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const assignees = task.assignees ?? [];
  const available = collaboration.members.filter((member) => !assignees.some((item) => item.telegramId === member.telegramId));
  return <div className="tw-collab-overlay" onMouseDown={onClose}>
    <section className="tw-collab-sheet" role="dialog" aria-modal="true" aria-label={`Assignments for ${task.title}`} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>{task.publicId}</span><h2>{task.title}</h2><p>Assignments and acknowledgements stay in sync with the Telegram group.</p></div><button onClick={onClose} aria-label="Close assignment panel"><X size={20} /></button></header>
      <div className="tw-collab-assignees">
        {assignees.map((assignee) => {
          const own = assignee.telegramId === collaboration.viewerTelegramId;
          const canManage = own || manager;
          return <article key={assignee.id}>
            <div className="tw-collab-person"><span>{initials(assignee.displayName)}</span><div><b>{assignee.displayName}</b><small data-status={assignee.status}>{statusLabel(assignee)}</small></div></div>
            {assignee.statusReason && <p>{assignee.statusReason}</p>}
            {canManage && <div className="tw-collab-actions">
              {assignee.status !== "ACCEPTED" && <button disabled={busy} onClick={() => onAction({ action: "accept", assigneeId: assignee.id })}><Check size={14} /> Accept</button>}
              {assignee.status === "BLOCKED" ? <button disabled={busy} onClick={() => onAction({ action: "unblock", assigneeId: assignee.id })}><Sparkles size={14} /> Unblock</button> : <button disabled={busy} onClick={() => onAction({ action: "block", assigneeId: assignee.id, reason: reason[assignee.id] })}><Unlink size={14} /> Block</button>}
              {own && assignee.status !== "DECLINED" && <button disabled={busy} onClick={() => onAction({ action: "decline", assigneeId: assignee.id, reason: reason[assignee.id] })}><Hand size={14} /> Decline</button>}
              <button className="quiet" disabled={busy} onClick={() => onAction({ action: "unassign", assigneeId: assignee.id })}>Remove</button>
            </div>}
            {canManage && <div className="tw-handoff-row"><input value={reason[assignee.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [assignee.id]: event.target.value }))} placeholder="Optional blocker or handoff note" /><select value={handoffTarget[assignee.id] ?? ""} onChange={(event) => setHandoffTarget((current) => ({ ...current, [assignee.id]: event.target.value }))}><option value="">Hand off to…</option>{collaboration.members.filter((member) => member.telegramId !== assignee.telegramId).map((member) => <option key={member.telegramId} value={member.telegramId}>{member.displayName}</option>)}</select><button disabled={busy || !handoffTarget[assignee.id]} onClick={() => onAction({ action: "handoff", assigneeId: assignee.id, targetTelegramId: handoffTarget[assignee.id], reason: reason[assignee.id] })}><ArrowRight size={15} /> Handoff</button></div>}
          </article>;
        })}
        {!assignees.length && <div className="tw-collab-empty"><UsersRound size={22} /><b>No assignee yet</b><span>{manager ? "Choose someone from the active group members below." : "A group owner or administrator can assign this work."}</span></div>}
      </div>
      {manager ? <footer><label><UserPlus size={16} /><select value={target} onChange={(event) => setTarget(event.target.value)}><option value="">Add an assignee…</option>{available.map((member) => <option key={member.telegramId} value={member.telegramId}>{member.displayName}</option>)}</select></label><button className="tw-primary" disabled={busy || !target} onClick={() => onAction({ action: "assign", targetTelegramId: target })}>Assign</button></footer> : <footer className="tw-collab-member-note"><ShieldCheck size={16} /><span><b>Assignments are admin-managed</b><small>You can accept, decline, block, unblock, remove, or hand off your own work above.</small></span></footer>}
    </section>
  </div>;
}

function ActivityRows({ activity, empty = false }: { activity: Collaboration["activity"]; empty?: boolean }) {
  if (!activity.length) return empty ? <div className="tw-activity-empty"><MessageSquareText size={22} /><b>No shared changes recorded yet.</b><span>Assignments, acknowledgements, blockers, and handoffs will collect here.</span></div> : null;
  return <div className="tw-activity-rows">{activity.map((item, index) => <article key={item.id} style={{ "--group-index": index } as React.CSSProperties}><span className="tw-activity-glyph">{activityIcon(item.type)}</span><div><b>{item.summary}</b><small>{relativeTime(item.createdAt)}{item.taskTitle ? ` · ${item.taskTitle}` : ""}</small></div>{item.taskPublicId && <em>{item.taskPublicId}</em>}</article>)}</div>;
}

function AvatarStack({ members }: { members: Member[] }) {
  return <span className="tw-avatar-stack">{members.slice(0, 5).map((member) => <i key={member.telegramId} title={member.displayName}>{member.initials}</i>)}{members.length > 5 && <i>+{members.length - 5}</i>}</span>;
}

function MemberAvatar({ member }: { member: Member }) {
  return <span className="tw-member-avatar" aria-hidden="true">{member.initials}</span>;
}

function TaskGlyph({ task }: { task: DashboardTask }) {
  const blocked = (task.assignees ?? []).some((item) => item.status === "BLOCKED");
  const pending = (task.assignees ?? []).some((item) => item.status === "PENDING");
  return <span className="tw-task-glyph" data-state={blocked ? "blocked" : pending ? "pending" : "ready"}>{blocked ? <Unlink size={16} /> : pending ? <Clock3 size={16} /> : <ShieldCheck size={16} />}</span>;
}

function taskAttention(task: DashboardTask): string {
  const assignees = task.assignees ?? [];
  const blocked = assignees.find((item) => item.status === "BLOCKED");
  if (blocked) return blocked.statusReason ? `Blocked: ${blocked.statusReason}` : "Blocked";
  if (!assignees.length) return "Needs an owner";
  if (assignees.some((item) => item.status === "PENDING")) return "Awaiting acknowledgement";
  if (task.dueAt && new Date(task.dueAt).getTime() < Date.now()) return "Overdue";
  return "Ready";
}

function statusLabel(assignee: DashboardTaskAssignee): string {
  if (assignee.status === "PENDING") return "Awaiting reply";
  if (assignee.status === "ACCEPTED") return "Accepted";
  if (assignee.status === "DECLINED") return "Declined";
  return "Blocked";
}

function activityIcon(type: string) {
  if (type.includes("HAND")) return <ArrowRight size={15} />;
  if (type.includes("BLOCK")) return <Unlink size={15} />;
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
