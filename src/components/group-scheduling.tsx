"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Plus,
  Send,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import type { AvailabilityPoll } from "@/lib/types";

type Props = {
  polls: AvailabilityPoll[];
  timezone: string;
  generatedAt: string;
  manager: boolean;
  isDemo: boolean;
  initialPoll?: string;
  openCreate?: boolean;
  onChanged: () => Promise<void>;
  announce: (message: string) => void;
};

type CreateDraft = {
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  durationMinutes: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
};

export function GroupSchedulingView({ polls, timezone, generatedAt, manager, isDemo, initialPoll, openCreate, onChanged, announce }: Props) {
  const openPolls = polls.filter((poll) => poll.status === "OPEN");
  const [selectedId, setSelectedId] = useState(() => polls.find((poll) => poll.publicId === initialPoll || poll.id === initialPoll)?.id ?? openPolls[0]?.id ?? polls[0]?.id);
  const [creating, setCreating] = useState(Boolean(openCreate && manager));
  const [busy, setBusy] = useState(false);
  const selected = polls.find((poll) => poll.id === selectedId)
    ?? polls.find((poll) => poll.publicId === initialPoll || poll.id === initialPoll)
    ?? openPolls[0]
    ?? polls[0];

  const mutate = async (work: () => Promise<AvailabilityPoll>, success: string) => {
    if (isDemo) { announce("Scheduling controls are read-only in the demo."); return; }
    setBusy(true);
    try {
      const poll = await work();
      setSelectedId(poll.id);
      await onChanged();
      announce(success);
    } catch (error) {
      announce(error instanceof Error ? error.message : "That scheduling change could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="tw-schedule-view">
    <header className="tw-group-page-intro tw-schedule-heading">
      <div><span><CalendarDays size={18} /> Coordinate</span><h2>Find a time</h2><p>Agree on a time without leaving the group.</p></div>
      {manager && <button className="tw-primary" onClick={() => setCreating(true)}><Plus size={16} /> New poll</button>}
    </header>

    {creating && <CreatePollPanel timezone={timezone} anchorDate={generatedAt} busy={busy} onClose={() => setCreating(false)} onCreate={(input) => mutate(async () => {
      const result = await scheduleApi<{ poll: AvailabilityPoll }>("scheduling/polls", "POST", input);
      setCreating(false);
      return result.poll;
    }, "Availability poll shared with the group.")} />}

    {!polls.length ? <ScheduleEmpty manager={manager} onCreate={() => setCreating(true)} /> : <div className="tw-schedule-layout">
      <aside className="tw-schedule-index">
        <header><b>Polls</b><span>{openPolls.length} active</span></header>
        <div>{polls.map((poll) => <button key={poll.id} className={poll.id === selected?.id ? "active" : ""} onClick={() => setSelectedId(poll.id)}>
          <span data-status={poll.status}><CalendarDays size={17} /></span>
          <div><b>{poll.title}</b><small>{formatRange(poll)} · {poll.respondentCount}/{poll.memberCount}</small></div>
          <ChevronRight size={16} />
        </button>)}</div>
      </aside>
      {selected && <PollWorkspace key={selected.id} poll={selected} viewerTimezone={timezone} manager={manager} busy={busy} isDemo={isDemo} mutate={mutate} announce={announce} />}
    </div>}
  </section>;
}

function PollWorkspace({ poll, viewerTimezone, manager, busy, isDemo, mutate, announce }: {
  poll: AvailabilityPoll;
  viewerTimezone: string;
  manager: boolean;
  busy: boolean;
  isDemo: boolean;
  mutate: (work: () => Promise<AvailabilityPoll>, success: string) => Promise<void>;
  announce: (message: string) => void;
}) {
  const [timezone, setTimezone] = useState(poll.viewerResponse?.timezone ?? viewerTimezone);
  const [selected, setSelected] = useState(() => new Set(poll.viewerResponse?.availableStarts ?? []));
  const [wantsCalendar, setWantsCalendar] = useState(poll.viewerResponse?.wantsCalendar ?? false);
  const days = useMemo(() => groupSlotsByDay(poll.slots, timezone), [poll.slots, timezone]);
  const rows = Math.max(0, ...days.map((day) => day.slots.length));
  const canEdit = poll.status === "OPEN";

  const toggle = (value: string) => {
    if (!canEdit) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  const save = () => mutate(async () => {
    const result = await scheduleApi<{ poll: AvailabilityPoll }>(`scheduling/polls/${poll.id}/availability`, "PATCH", { timezone, availableStarts: [...selected], wantsCalendar });
    return result.poll;
  }, "Your availability is in sync.");

  return <article className="tw-poll-workspace">
    <header className="tw-poll-header">
      <div><span>{poll.publicId}</span><h3>{poll.title}</h3><p><CalendarDays size={15} /> {formatRange(poll)} <i /> <Clock3 size={15} /> {formatDuration(poll.durationMinutes)}</p></div>
      <PollStatus status={poll.status} />
    </header>

    {poll.status === "FINALIZED" && poll.finalStartAt ? <FinalMeeting poll={poll} busy={busy} isDemo={isDemo} mutate={mutate} announce={announce} /> : poll.status === "CANCELED" ? <div className="tw-poll-closed"><X size={22} /><b>Poll closed</b><span>The responses remain visible for reference.</span></div> : <>
      <section className="tw-response-strip">
        <div><span><UsersRound size={18} /></span><b>{poll.respondentCount}/{poll.memberCount}</b><small>responded</small></div>
        <div className="tw-respondent-faces">{poll.respondents.slice(0, 6).map((member) => <i key={member.telegramId} title={member.displayName}>{initials(member.displayName)}</i>)}{poll.respondentCount > 6 && <i>+{poll.respondentCount - 6}</i>}</div>
        <p>{poll.pendingMembers.length ? `${poll.pendingMembers.length} waiting` : "Everyone responded"}</p>
      </section>

      {poll.bestSlots.some((slot) => slot.availableCount > 0) && <section className="tw-overlap-section">
        <header><span><Sparkles size={16} /> Best overlap</span><small>Updates live</small></header>
        <div>{poll.bestSlots.filter((slot) => slot.availableCount > 0).slice(0, 3).map((slot) => <button key={slot.startAt} disabled={!manager || busy} onClick={() => mutate(async () => {
          const result = await scheduleApi<{ poll: AvailabilityPoll }>(`scheduling/polls/${poll.id}/finalize`, "POST", { startAt: slot.startAt, expectedRevision: poll.revision });
          return result.poll;
        }, "Meeting time confirmed.")}>
          <span><b>{formatDay(slot.startAt, poll.timezone)}</b><small>{formatClock(slot.startAt, poll.timezone)}–{formatClock(slot.endAt, poll.timezone)}</small></span>
          <em>{slot.availableCount}/{poll.memberCount} free</em>
          {manager && <Check size={16} />}
        </button>)}</div>
      </section>}

      <section className="tw-availability-section">
        <header><div><h4>Your availability</h4><p>Tap every block when you are free.</p></div><label>Time zone<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><TimezoneOptions current={timezone} organizer={poll.timezone} /></select></label></header>
        <div className="tw-availability-tools">
          <button onClick={() => setSelected(new Set(poll.slots))}>Select all</button>
          <button onClick={() => setSelected(new Set())}>Clear</button>
          <span>{selected.size} block{selected.size === 1 ? "" : "s"}</span>
        </div>
        <div className="tw-availability-scroll" tabIndex={0} aria-label="Availability grid">
          <div className="tw-availability-grid" style={{ "--schedule-days": days.length } as React.CSSProperties}>
            <span className="corner" />
            {days.map((day) => <div className="day" key={day.key}><b>{day.label}</b><small>{day.date}</small></div>)}
            {Array.from({ length: rows }, (_, row) => <GridRow key={row} row={row} days={days} timezone={timezone} selected={selected} onToggle={toggle} disabled={!canEdit} poll={poll} />)}
          </div>
        </div>
        <footer>
          <label className="tw-calendar-opt"><input type="checkbox" checked={wantsCalendar} onChange={(event) => setWantsCalendar(event.target.checked)} /><span><CalendarCheck size={17} /><b>Add the final time to my Calendar</b><small>Only if your Personal workspace is connected.</small></span></label>
          <button className="tw-primary" disabled={busy || !canEdit} onClick={() => void save()}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Save availability</button>
        </footer>
      </section>

      {manager && <section className="tw-organizer-bar"><div><b>Organizer controls</b><small>Only group owners and admins can use these.</small></div><button disabled={busy || !poll.pendingMembers.length} onClick={() => mutate(async () => {
        const result = await scheduleApi<{ poll: AvailabilityPoll }>(`scheduling/polls/${poll.id}/remind`, "POST", {});
        return result.poll;
      }, poll.pendingMembers.length ? "Reminder posted in Telegram." : "Everyone has responded.")}><Send size={16} /> Remind pending</button><button className="danger" disabled={busy} onClick={() => {
        if (!window.confirm("Close this availability poll? Responses will remain visible.")) return;
        void mutate(async () => {
          const result = await scheduleApi<{ poll: AvailabilityPoll }>(`scheduling/polls/${poll.id}/cancel`, "POST", { expectedRevision: poll.revision });
          return result.poll;
        }, "Poll closed.");
      }}><X size={16} /> Close poll</button></section>}
    </>}
  </article>;
}

function GridRow({ row, days, timezone, selected, onToggle, disabled, poll }: {
  row: number;
  days: ReturnType<typeof groupSlotsByDay>;
  timezone: string;
  selected: Set<string>;
  onToggle: (value: string) => void;
  disabled: boolean;
  poll: AvailabilityPoll;
}) {
  const first = days.find((day) => day.slots[row])?.slots[row];
  return <>
    <span className="time">{first ? formatClock(first, timezone) : ""}</span>
    {days.map((day) => {
      const slot = day.slots[row];
      const best = slot ? poll.bestSlots.find((item) => item.startAt === slot) : undefined;
      return slot ? <button key={day.key} className={selected.has(slot) ? "selected" : ""} data-overlap={best?.availableCount ? "true" : "false"} disabled={disabled} onClick={() => onToggle(slot)} aria-pressed={selected.has(slot)} aria-label={`${day.label} ${formatClock(slot, timezone)}`}><Check size={14} /><i>{best?.availableCount || ""}</i></button> : <span key={day.key} className="empty" />;
    })}
  </>;
}

function FinalMeeting({ poll, busy, isDemo, mutate, announce }: { poll: AvailabilityPoll; busy: boolean; isDemo: boolean; mutate: (work: () => Promise<AvailabilityPoll>, success: string) => Promise<void>; announce: (message: string) => void }) {
  const calendar = poll.viewerCalendar;
  const updateCalendar = (action: "sync" | "remove") => mutate(async () => {
    const result = await scheduleApi<{ poll: AvailabilityPoll }>(`scheduling/polls/${poll.id}/calendar`, "POST", { action });
    return result.poll;
  }, action === "sync" ? "Meeting added to Google Calendar." : "Meeting removed from Google Calendar.");
  return <section className="tw-final-meeting">
    <span><CalendarCheck size={23} /></span>
    <div><small>Confirmed</small><h4>{formatDay(poll.finalStartAt!, poll.timezone)}</h4><p>{formatClock(poll.finalStartAt!, poll.timezone)}–{formatClock(poll.finalEndAt!, poll.timezone)} · {poll.timezone}</p></div>
    <div className="tw-final-actions">{calendar?.synced && calendar.eventUrl ? <><a href={calendar.eventUrl} target="_blank" rel="noreferrer">Open Calendar <ExternalLink size={15} /></a><button disabled={busy || isDemo} onClick={() => void updateCalendar("remove")}>Remove</button></> : calendar?.connected ? <button className="tw-primary" disabled={busy || isDemo} onClick={() => void updateCalendar("sync")}><Plus size={16} /> Add to my Calendar</button> : <button onClick={() => announce("Connect Google Calendar from your Personal workspace first.")}>Connect Calendar in Personal</button>}</div>
  </section>;
}

function CreatePollPanel({ timezone, anchorDate, busy, onClose, onCreate }: { timezone: string; anchorDate: string; busy: boolean; onClose: () => void; onCreate: (input: CreateDraft) => Promise<void> }) {
  const tomorrow = calendarDateInZone(anchorDate, timezone, 1);
  const [draft, setDraft] = useState<CreateDraft>({ title: "", startDate: tomorrow, endDate: addCalendarDays(tomorrow, 6), timezone, durationMinutes: 60, dayStartMinutes: 8 * 60, dayEndMinutes: 22 * 60 });
  const lastAllowedDate = addCalendarDays(draft.startDate, 13);
  return <form className="tw-create-poll" onSubmit={(event) => { event.preventDefault(); void onCreate(draft); }}>
    <header><div><span>New availability poll</span><h3>What are you finding time for?</h3></div><button type="button" onClick={onClose} aria-label="Close"><X size={19} /></button></header>
    <label className="wide">Meeting title<input autoFocus required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Project discussion" /></label>
    <label>From<input type="date" required value={draft.startDate} onChange={(event) => { const startDate = event.target.value; const lastDate = addCalendarDays(startDate, 13); setDraft({ ...draft, startDate, endDate: draft.endDate < startDate ? startDate : draft.endDate > lastDate ? lastDate : draft.endDate }); }} /></label>
    <label>To<input type="date" required min={draft.startDate} max={lastAllowedDate} value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label>
    <label>Duration<select value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: Number(event.target.value) })}><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option><option value={120}>2 hours</option></select></label>
    <label>Organizer time zone<select value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}><TimezoneOptions current={draft.timezone} organizer={timezone} /></select></label>
    <label>Day starts<input type="time" value={minutesToClock(draft.dayStartMinutes)} onChange={(event) => setDraft({ ...draft, dayStartMinutes: clockToMinutes(event.target.value) })} /></label>
    <label>Day ends<input type="time" value={minutesToClock(draft.dayEndMinutes)} onChange={(event) => setDraft({ ...draft, dayEndMinutes: clockToMinutes(event.target.value) })} /></label>
    <footer><button type="button" onClick={onClose}>Cancel</button><button className="tw-primary" disabled={busy || !draft.title.trim()}>{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />} Share poll</button></footer>
  </form>;
}

function ScheduleEmpty({ manager, onCreate }: { manager: boolean; onCreate: () => void }) {
  return <div className="tw-schedule-empty"><span><CalendarDays size={28} /></span><h3>No availability polls yet.</h3><p>{manager ? "Create one when the group needs to agree on a time." : "A group admin can start the first poll."}</p>{manager && <button className="tw-primary" onClick={onCreate}><Plus size={16} /> New poll</button>}</div>;
}

function PollStatus({ status }: { status: AvailabilityPoll["status"] }) {
  return <span className="tw-poll-status" data-status={status}><i />{status === "OPEN" ? "Collecting times" : status === "FINALIZED" ? "Confirmed" : "Closed"}</span>;
}

function TimezoneOptions({ current, organizer }: { current: string; organizer: string }) {
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = [...new Set([current, organizer, browser, "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Yangon", "Europe/London", "America/New_York", "America/Los_Angeles"])];
  return <>{zones.map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>)}</>;
}

async function scheduleApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/threadwise/${path}`, { method, credentials: "same-origin", headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const payload = await response.json() as { message?: string; error?: string } & T;
  if (!response.ok) throw new Error(payload.message ?? "That scheduling action could not be completed.");
  return payload;
}

function groupSlotsByDay(slots: string[], timezone: string) {
  const map = new Map<string, { key: string; label: string; date: string; slots: string[] }>();
  for (const slot of slots) {
    const date = new Date(slot);
    const key = dateParts(date, timezone);
    const item = map.get(key) ?? { key, label: new Intl.DateTimeFormat("en-SG", { weekday: "short", timeZone: timezone }).format(date), date: new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: timezone }).format(date), slots: [] };
    item.slots.push(slot);
    map.set(key, item);
  }
  return [...map.values()];
}

function dateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatRange(poll: AvailabilityPoll) {
  const start = new Date(`${poll.startDate}T12:00:00Z`);
  const end = new Date(`${poll.endDate}T12:00:00Z`);
  const compact = (value: Date) => new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: "UTC" }).format(value);
  return poll.startDate === poll.endDate ? compact(start) : `${compact(start)}–${compact(end)}`;
}

function formatDay(value: string, timezone: string) { return new Intl.DateTimeFormat("en-SG", { weekday: "short", day: "numeric", month: "short", timeZone: timezone }).format(new Date(value)); }
function formatClock(value: string, timezone: string) { return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(value)); }
function formatDuration(minutes: number) { return minutes < 60 ? `${minutes} min` : minutes % 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes / 60} hr`; }
function initials(value: string) { return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function minutesToClock(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function clockToMinutes(value: string) { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }
function calendarDateInZone(anchor: string, timezone: string, offsetDays: number) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(new Date(anchor));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day") + offsetDays, 12)).toISOString().slice(0, 10);
}
function addCalendarDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
}
