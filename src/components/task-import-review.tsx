"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  LoaderCircle,
  RotateCcw,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { DashboardSnapshot, TaskImportAssignee, TaskImportItem, TaskImportReview } from "@/lib/types";

type Member = NonNullable<DashboardSnapshot["collaboration"]>["members"][number];
type ApiError = { error?: string; message?: string };

export function TaskImportReviewSheet({
  importId,
  timezone,
  members,
  viewerTelegramId,
  workspaceRole,
  onClose,
  onImported,
  announce,
}: {
  importId: string;
  timezone: string;
  members: Member[];
  viewerTelegramId?: string;
  workspaceRole: "OWNER" | "ADMIN" | "MEMBER";
  onClose: () => void;
  onImported: () => Promise<void> | void;
  announce: (message: string) => void;
}) {
  const [review, setReview] = useState<TaskImportReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"import" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const canControl = Boolean(review && (review.requestedByTelegramId === viewerTelegramId || workspaceRole !== "MEMBER"));
  const editable = review?.status === "PENDING" || review?.status === "PARTIAL";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConfirmCancel(false);
    try {
      const payload = await request<{ taskImport: TaskImportReview }>(`task-imports/${importId}`);
      setReview(payload.taskImport);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This TODO review could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [importId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => panelRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const selected = review?.items.filter((item) => item.included && item.status !== "SKIPPED") ?? [];
  const ready = selected.filter((item) => item.status !== "IMPORTED");
  const imported = review?.items.filter((item) => item.status === "IMPORTED").length ?? 0;

  const patchLocal = (itemId: string, changes: Partial<TaskImportItem>) => {
    setReview((current) => current ? { ...current, items: current.items.map((item) => item.id === itemId ? { ...item, ...changes } : item) } : current);
  };

  const saveRow = async (item: TaskImportItem, changes: Record<string, unknown>) => {
    if (!review || !canControl || !editable || item.status === "IMPORTED") return;
    setBusyRow(item.id);
    try {
      const payload = await request<{ taskImport: TaskImportReview }>(`task-imports/${review.id}/items/${item.id}`, "PATCH", changes);
      setReview(payload.taskImport);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That row could not be updated.");
      await load();
    } finally {
      setBusyRow(null);
    }
  };

  const removeAssignee = (item: TaskImportItem, assignee: TaskImportAssignee) => {
    const assignees = item.assignees.filter((candidate) => candidate !== assignee);
    patchLocal(item.id, { assignees });
    void saveRow(item, { assignees });
  };

  const toggleMember = (item: TaskImportItem, member: Member) => {
    const current = item.assignees ?? [];
    const selected = current.some((assignee) => sameAssignee(assignee, member));
    const assignees = selected
      ? current.filter((assignee) => !sameAssignee(assignee, member))
      : [...current, { telegramId: member.telegramId, username: member.username, displayName: member.displayName }];
    patchLocal(item.id, { assignees });
    void saveRow(item, { assignees });
  };

  const submit = async (action: "import" | "cancel") => {
    if (!review || !canControl || !editable) return;
    setSubmitting(action);
    setError(null);
    try {
      const payload = await request<{ taskImport: TaskImportReview; imported?: number; failed?: number; skipped?: number }>(`task-imports/${review.id}/${action}`, "POST", {});
      setReview(payload.taskImport);
      if (action === "cancel") {
        announce("TODO import canceled.");
        onClose();
        return;
      }
      await onImported();
      if ((payload.failed ?? 0) > 0) {
        announce(`${payload.imported ?? 0} imported. ${payload.failed} still need review.`);
      } else {
        announce(`${payload.imported ?? 0} task${payload.imported === 1 ? "" : "s"} imported.`);
        window.setTimeout(onClose, 650);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The import could not be completed.");
    } finally {
      setSubmitting(null);
      setConfirmCancel(false);
    }
  };

  return <div className="tw-import-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="tw-import-sheet" ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="task-import-title">
      <header className="tw-import-head">
        <div><span>TODO review</span><h2 id="task-import-title">{review?.workspace.title ?? "Shared tasks"}</h2></div>
        <div className="tw-import-head-actions">
          <button className="tw-icon-button" onClick={() => void load()} disabled={loading || busyRow !== null || submitting !== null} aria-label="Refresh TODO review"><RotateCcw className={loading ? "spin" : undefined} size={18} /></button>
          <button className="tw-icon-button" onClick={onClose} aria-label="Close TODO review"><X size={19} /></button>
        </div>
      </header>

      {loading ? <div className="tw-import-state"><LoaderCircle className="spin" size={24} /><b>Reading the list…</b></div> : error && !review ? <div className="tw-import-state error"><AlertTriangle size={24} /><b>{error}</b><button onClick={() => void load()}><RotateCcw size={15} /> Retry</button></div> : review ? <>
        <div className="tw-import-context">
          <div className="tw-import-summary">
            <span><b>{selected.length}</b> selected</span>
            <span><b>{selected.filter((item) => item.initialStatus === "DONE").length}</b> already done</span>
            <span><b>{selected.filter((item) => item.warnings.length > 0).length}</b> to check</span>
            {imported > 0 && <span><b>{imported}</b> imported</span>}
          </div>

          {!canControl && <div className="tw-import-notice"><UserRound size={17} /><span>Only {review.requestedByName} or a group admin can change this review.</span></div>}
          {!editable && <div className="tw-import-notice" data-status={review.status}><ReviewStatusIcon status={review.status} /><span>{reviewStatusMessage(review.status)}</span></div>}
          {error && <div className="tw-import-notice error" role="alert"><AlertTriangle size={17} /><span>{error}</span></div>}
        </div>

        <div className="tw-import-rows">
          {review.items.map((item) => <ImportRow
            key={item.id}
            item={item}
            timezone={timezone}
            members={members}
            disabled={!canControl || !editable || busyRow !== null || submitting !== null}
            busy={busyRow === item.id}
            onLocal={(changes) => patchLocal(item.id, changes)}
            onSave={(changes) => void saveRow(item, changes)}
            onToggleMember={(member) => toggleMember(item, member)}
            onRemoveAssignee={(assignee) => removeAssignee(item, assignee)}
          />)}
        </div>

        <footer className="tw-import-footer">
          {!editable ? <div className="tw-import-terminal"><button onClick={onClose}>Close</button></div> : confirmCancel ? <div className="tw-import-confirm"><span>Cancel this import?</span><button onClick={() => setConfirmCancel(false)}>Keep</button><button className="danger" onClick={() => void submit("cancel")} disabled={submitting !== null}><Trash2 size={15} /> Cancel import</button></div> : <>
            <button className="tw-import-cancel" onClick={() => setConfirmCancel(true)} disabled={!canControl || busyRow !== null || submitting !== null}>Cancel</button>
            <button className="tw-import-primary" onClick={() => void submit("import")} disabled={!canControl || busyRow !== null || submitting !== null || ready.length === 0}>
              {submitting === "import" ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
              {review.status === "PARTIAL" ? `Retry ${ready.length}` : `Import ${ready.length}`}
            </button>
          </>}
        </footer>
      </> : null}
    </section>
  </div>;
}

function ImportRow({
  item,
  timezone,
  members,
  disabled,
  busy,
  onLocal,
  onSave,
  onToggleMember,
  onRemoveAssignee,
}: {
  item: TaskImportItem;
  timezone: string;
  members: Member[];
  disabled: boolean;
  busy: boolean;
  onLocal: (changes: Partial<TaskImportItem>) => void;
  onSave: (changes: Record<string, unknown>) => void;
  onToggleMember: (member: Member) => void;
  onRemoveAssignee: (assignee: TaskImportAssignee) => void;
}) {
  const [expanded, setExpanded] = useState(item.warnings.length > 0 || item.status === "FAILED");
  const imported = item.status === "IMPORTED";
  const ownerLabel = ownerSummary(item);
  const dueLabel = item.dueAt ? new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(item.dueAt)) : "No due date";
  const localDue = useMemo(() => item.dueAt ? zonedInputDate(item.dueAt, timezone) : "", [item.dueAt, timezone]);
  const unmatched = item.assignees.filter((assignee) => !members.some((member) => sameAssignee(assignee, member)));

  return <article className="tw-import-row" data-included={item.included} data-status={item.status}>
    <button
      className="tw-import-include"
      aria-pressed={item.included}
      aria-label={item.included ? `Exclude task ${item.position}` : `Include task ${item.position}`}
      disabled={disabled || imported}
      onClick={() => { onLocal({ included: !item.included }); onSave({ included: !item.included }); }}
    >{item.included ? <Check size={15} /> : <Circle size={15} />}</button>
    <div className="tw-import-row-main">
      <div className="tw-import-row-title"><span>{item.position}</span><input value={item.title} disabled={disabled || imported} onChange={(event) => onLocal({ title: event.target.value })} onBlur={() => onSave({ title: item.title })} aria-label={`Task ${item.position} title`} /></div>
      <button className="tw-import-row-summary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span>{ownerLabel || "Unassigned"}</span><i>·</i><span>{dueLabel}</span>{item.initialStatus === "DONE" && <><i>·</i><span>Done</span></>}<ChevronDown size={15} />
      </button>
      {item.warnings.length > 0 && <div className="tw-import-warnings">{item.warnings.map((warning) => <span key={warning}><AlertTriangle size={12} /> {warning}</span>)}</div>}
      {item.errorMessage && <div className="tw-import-row-error"><AlertTriangle size={14} /> {item.errorMessage}</div>}
      {imported && <div className="tw-import-row-imported"><CheckCircle2 size={14} /> Imported</div>}
      {expanded && !imported && <div className="tw-import-fields">
        <fieldset><legend><UsersRound size={14} /> Assignees</legend><div className="tw-import-member-pills">{members.map((member) => {
          const active = item.assignees.some((assignee) => sameAssignee(assignee, member));
          return <button type="button" key={member.telegramId} className={active ? "active" : ""} disabled={disabled} onClick={() => onToggleMember(member)}>{active && <Check size={12} />}{member.displayName}</button>;
        })}</div></fieldset>
        {unmatched.length > 0 && <fieldset><legend><AlertTriangle size={14} /> Unmatched</legend><div className="tw-import-unmatched">{unmatched.map((assignee, index) => <button type="button" key={`${assignee.telegramId ?? assignee.username ?? assignee.displayName}-${index}`} disabled={disabled} onClick={() => onRemoveAssignee(assignee)} aria-label={`Remove ${assigneeLabel(assignee)}`}><span>{assigneeLabel(assignee)}</span><X size={13} /></button>)}</div></fieldset>}
        <label><span>Team owner</span><input value={item.teamOwnerLabel ?? ""} disabled={disabled} placeholder="e.g. Internal comms" onChange={(event) => onLocal({ teamOwnerLabel: event.target.value })} onBlur={() => onSave({ teamOwnerLabel: item.teamOwnerLabel || null })} /></label>
        <label><span><CalendarClock size={14} /> Due date · {timezone}</span><input type="datetime-local" value={localDue} disabled={disabled} onChange={(event) => {
          const dueAt = event.target.value ? zonedInputToIso(event.target.value, timezone) : null;
          onLocal({ dueAt });
          onSave({ dueAt });
        }} /></label>
        <label><span>Status</span><select value={item.initialStatus} disabled={disabled} onChange={(event) => {
          const initialStatus = event.target.value as "OPEN" | "DONE";
          onLocal({ initialStatus });
          onSave({ initialStatus });
        }}><option value="OPEN">Open</option><option value="DONE">Already done</option></select></label>
      </div>}
    </div>
    {busy && <LoaderCircle className="tw-import-row-busy spin" size={16} />}
  </article>;
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/threadwise/${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as ApiError & T;
  if (!response.ok) throw new Error(payload.message || payload.error || "That change could not be completed.");
  return payload;
}

function sameAssignee(assignee: TaskImportAssignee, member: Member): boolean {
  return assignee.telegramId === member.telegramId || Boolean(assignee.username && member.username && assignee.username.toLowerCase() === member.username.toLowerCase());
}

function assigneeLabel(assignee: TaskImportAssignee): string {
  return assignee.username ? `@${assignee.username}` : assignee.displayName || "Unknown assignee";
}

function reviewStatusMessage(status: TaskImportReview["status"]): string {
  if (status === "IMPORTING") return "Import in progress…";
  if (status === "IMPORTED") return "Tasks imported.";
  if (status === "CANCELED") return "Import canceled.";
  if (status === "EXPIRED") return "Review expired. Send the TODO list again.";
  return "Review ready.";
}

function ReviewStatusIcon({ status }: { status: TaskImportReview["status"] }) {
  if (status === "IMPORTING") return <LoaderCircle className="spin" size={17} />;
  if (status === "IMPORTED") return <CheckCircle2 size={17} />;
  return <AlertTriangle size={17} />;
}

function ownerSummary(item: TaskImportItem): string {
  const people = item.assignees.map((assignee) => assignee.displayName || (assignee.username ? `@${assignee.username}` : "")).filter(Boolean);
  return [...people, ...(item.teamOwnerLabel ? [item.teamOwnerLabel] : [])].join(" + ");
}

function zonedInputDate(value: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
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
