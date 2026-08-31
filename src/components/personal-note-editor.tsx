"use client";

import { Check, Cloud, FileText, FileUp, LoaderCircle, Save, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DashboardNote } from "@/lib/types";
import { parseMarkdownFile } from "@/lib/study-markdown";
import { StudyRichNoteBody } from "./study-rich-note-body";

type NoteDraft = { title: string; body: string };
type RemoteDraft = NoteDraft & { id: string; revision: number; noteUpdatedAt?: string | null; updatedAt: string; expiresAt: string };
type SaveState = "loading" | "idle" | "saving" | "saved" | "error" | "conflict";

export function PersonalNoteEditor({ value, seed, busy, isDemo, onClose, onSave }: {
  value?: DashboardNote;
  seed?: string;
  busy: boolean;
  isDemo: boolean;
  onClose: () => void;
  onSave: (values: { title: string; body: string }, value?: DashboardNote) => Promise<boolean>;
}) {
  const noteId = value?.id;
  const noteUpdatedAt = value?.updatedAt;
  const [draft, setDraft] = useState<NoteDraft>(() => ({
    title: value?.title ?? "",
    body: value?.body ?? value?.summary ?? seed ?? "",
  }));
  const base = useRef<NoteDraft>(draft);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [message, setMessage] = useState("");
  const [filing, setFiling] = useState(false);
  const [closing, setClosing] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const modalRef = useRef<HTMLElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  const draftIdRef = useRef<string | undefined>(undefined);
  const revisionRef = useRef(0);
  const noteVersionRef = useRef(noteUpdatedAt);
  const generationRef = useRef(0);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const activeRef = useRef(true);
  const dirtyRef = useRef(false);
  const closingRef = useRef(false);
  const filingRef = useRef(false);

  const loadDraft = useCallback(async () => {
    setSaveState("loading");
    setMessage("");
    if (isDemo) {
      setLoaded(true);
      setSaveState("idle");
      return;
    }
    try {
      const query = noteId ? `?noteId=${encodeURIComponent(noteId)}` : "";
      const response = await personalNoteApi<{ draft: RemoteDraft | null }>(`note-drafts${query}`);
      if (!activeRef.current) return;
      const next = response.draft ? { title: response.draft.title, body: response.draft.body } : base.current;
      draftIdRef.current = response.draft?.id;
      revisionRef.current = response.draft?.revision ?? 0;
      noteVersionRef.current = response.draft?.noteUpdatedAt ?? noteUpdatedAt;
      draftRef.current = next;
      setDraft(next);
      setRecovered(Boolean(response.draft));
      dirtyRef.current = false;
      setDirty(false);
      setLoaded(true);
      setSaveState(response.draft ? "saved" : "idle");
    } catch (error) {
      if (!activeRef.current) return;
      setLoaded(true);
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Your cross-device draft could not be loaded.");
    }
  }, [isDemo, noteId, noteUpdatedAt]);

  useEffect(() => {
    activeRef.current = true;
    const timer = window.setTimeout(() => { void loadDraft(); }, 0);
    return () => { window.clearTimeout(timer); activeRef.current = false; };
  }, [loadDraft]);

  const update = useCallback((change: Partial<NoteDraft>) => {
    generationRef.current += 1;
    dirtyRef.current = true;
    setDirty(true);
    setDraft((current) => {
      const next = { ...current, ...change };
      draftRef.current = next;
      return next;
    });
  }, []);
  const updateBody = useCallback((body: string) => update({ body }), [update]);

  const persistDraft = useCallback((snapshot = draftRef.current) => {
    if (!loaded) return Promise.resolve(false);
    if (isDemo) {
      dirtyRef.current = false;
      setDirty(false);
      setSaveState("saved");
      return Promise.resolve(true);
    }
    const generation = generationRef.current;
    const queued = saveQueueRef.current.then(async () => {
      if (!activeRef.current) return false;
      setSaveState("saving");
      setMessage("");
      try {
        const response = await personalNoteApi<{ draft: RemoteDraft }>("note-drafts", "PATCH", {
          ...(noteId ? { noteId } : {}),
          ...(noteId && noteVersionRef.current ? { noteUpdatedAt: noteVersionRef.current } : {}),
          title: snapshot.title,
          body: snapshot.body,
          expectedRevision: revisionRef.current,
        });
        draftIdRef.current = response.draft.id;
        revisionRef.current = response.draft.revision;
        if (activeRef.current) {
          if (generation === generationRef.current) {
            dirtyRef.current = false;
            setDirty(false);
          }
          setSaveState("saved");
        }
        return true;
      } catch (error) {
        if (activeRef.current) {
          const text = error instanceof Error ? error.message : "Your draft could not be saved.";
          const conflict = /changed somewhere else/i.test(text);
          setSaveState(conflict ? "conflict" : "error");
          setMessage(text);
        }
        return false;
      }
    });
    saveQueueRef.current = queued.catch(() => false);
    return queued;
  }, [isDemo, loaded, noteId]);

  useEffect(() => {
    if (!loaded || !dirty || saveState === "conflict") return;
    const timer = window.setTimeout(() => { void persistDraft(draft); }, 650);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, loaded, persistDraft, saveState]);

  const requestClose = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    const safe = !dirtyRef.current || await persistDraft(draftRef.current);
    closingRef.current = false;
    setClosing(false);
    if (safe) onClose();
  }, [onClose, persistDraft]);

  useEffect(() => { filingRef.current = filing; }, [filing]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (filingRef.current) setFiling(false);
        else void requestClose();
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = [...modalRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [contenteditable='true'], [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [requestClose]);

  const openFiling = () => {
    if (!draft.title.trim()) update({ title: suggestedTitle(draft.body) });
    setFiling(true);
  };
  const importMarkdown = async (file: File | undefined) => {
    if (!file || !/\.md$/iu.test(file.name) || file.size > 1_000_000) return;
    const imported = parseMarkdownFile(file.name, await file.text());
    update({ title: imported.title, body: imported.body });
  };
  const fileNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dirty && !await persistDraft(draftRef.current)) return;
    const saved = await onSave({ title: draft.title.trim(), body: draft.body }, value);
    if (!saved || isDemo || !draftIdRef.current) return;
    try { await personalNoteApi(`note-drafts/${draftIdRef.current}`, "DELETE", {}); } catch { /* Stale drafts expire automatically. */ }
  };

  const status = saveState === "loading" ? "Loading draft…"
    : saveState === "saving" ? "Saving across devices…"
      : saveState === "saved" ? isDemo ? "Saved in this demo" : "Saved across devices"
        : saveState === "conflict" ? "Another device has a newer copy"
          : saveState === "error" ? "Draft not saved"
            : isDemo ? "Start writing — demo autosave is on" : "Start writing — autosave is on";

  return createPortal(<div className="study-note-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) void requestClose(); }}>
    <section ref={modalRef} className="study-note-fullscreen personal-note-fullscreen" role="dialog" aria-modal="true" aria-labelledby="personal-note-editor-title">
      <header className="study-note-fullscreen-head">
        <div><span>{value ? value.publicId : "Personal note"}</span><h2 id="personal-note-editor-title">{draft.title.trim() || "Untitled note"}</h2></div>
        <div className="study-note-head-actions">
          <input ref={importRef} type="file" accept=".md,text/markdown,text/plain" hidden onChange={(event) => { void importMarkdown(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          <button type="button" className="study-secondary" onClick={() => importRef.current?.click()}><FileUp size={16} /> <span>Import .md</span></button>
          <button type="button" className="study-primary" disabled={!loaded || !draft.body.trim()} onClick={openFiling}><Save size={16} /> Save</button>
          <button type="button" className="study-note-close" disabled={closing} onClick={() => void requestClose()} aria-label="Close note editor">{closing ? <LoaderCircle className="spin" size={20} /> : <X size={20} />}</button>
        </div>
      </header>
      <div className="study-note-autosave" data-state={saveState} role={saveState === "error" || saveState === "conflict" ? "alert" : "status"}>
        {saveState === "saving" || saveState === "loading" ? <LoaderCircle className="spin" size={14} /> : saveState === "saved" ? <Cloud size={14} /> : <FileText size={14} />}
        <span>{status}</span><i>{draft.body.length.toLocaleString()} characters</i>
        {saveState === "conflict" && <button type="button" onClick={() => void loadDraft()}>Load newer copy</button>}
      </div>
      {message && <p className="study-note-save-message">{message}</p>}
      {recovered && <p className="study-note-recovered"><Check size={14} /> Continued from your encrypted cross-device draft.</p>}
      <main className="study-note-writing-space">
        {loaded ? <StudyRichNoteBody value={draft.body} onChange={updateBody} ariaLabel="Personal note" /> : <div className="study-rich-loading"><LoaderCircle className="spin" size={20} /> Preparing your writing space…</div>}
      </main>
      {filing && <div className="study-note-filing-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setFiling(false); }}>
        <form className="study-note-filing" onSubmit={fileNote} aria-labelledby="personal-note-file-title">
          <header><div><span>Save note</span><h3 id="personal-note-file-title">Give this note a home.</h3></div><button type="button" onClick={() => setFiling(false)} aria-label="Return to note"><X size={18} /></button></header>
          <label>Title<input required maxLength={500} value={draft.title} onChange={(event) => update({ title: event.target.value })} autoFocus /></label>
          <p>Your writing is already autosaved. Saving gives it a title and adds it to Notes, full-text search, Telegram, and your other signed-in devices.</p>
          <footer><button type="button" className="study-secondary" onClick={() => setFiling(false)}>Continue writing</button><button className="study-primary" disabled={busy || !draft.title.trim() || !draft.body.trim()}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Save note</button></footer>
        </form>
      </div>}
    </section>
  </div>, document.body);
}

function suggestedTitle(body: string): string {
  const line = body.split("\n").map((entry) => entry.replace(/^\s{0,3}#{1,6}\s+/u, "").trim()).find(Boolean);
  return (line || "Untitled note").slice(0, 120);
}

async function personalNoteApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/threadwise/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const value = payload as { message?: string };
    throw new Error(value.message || "Threadwise could not save this note.");
  }
  return payload as T;
}
