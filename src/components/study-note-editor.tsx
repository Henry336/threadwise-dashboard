"use client";

import { Check, Cloud, FileText, FileUp, LoaderCircle, Save, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StudyResource, StudySnapshot } from "@/lib/study-types";
import { parseMarkdownFile } from "@/lib/study-markdown";
import { NoteDraftApiError, noteDraftRequest } from "@/lib/note-draft-api";
import { StudyChoicePicker } from "./study-choice-picker";
import { StudyRichNoteBody } from "./study-rich-note-body";

type NoteDraft = { moduleId: string; title: string; body: string };
type RemoteDraft = NoteDraft & { id: string; revision: number; resourceUpdatedAt?: string | null; updatedAt: string; expiresAt: string };
type SaveState = "loading" | "idle" | "saving" | "saved" | "error" | "conflict";

export function StudyNoteEditor({ value, study, busy, onClose, onSave }: { value?: StudyResource; study: StudySnapshot; busy: boolean; onClose: () => void; onSave: (path: string, method: "POST" | "PATCH", body: unknown, message: string) => Promise<boolean> }) {
  const resourceId = value?.id;
  const resourceUpdatedAt = value?.updatedAt;
  const [draft, setDraft] = useState<NoteDraft>(() => ({
    moduleId: value?.moduleId ?? study.workspace.activeModuleId ?? study.modules[0]?.id ?? "",
    title: value?.title ?? "",
    body: value?.body ?? "",
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
  const filingModalRef = useRef<HTMLFormElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  const bodyFlushRef = useRef<(canonicalize?: boolean) => string>(() => draftRef.current.body);
  const draftIdRef = useRef<string | undefined>(undefined);
  const revisionRef = useRef(0);
  const resourceVersionRef = useRef(resourceUpdatedAt);
  const generationRef = useRef(0);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const activeRef = useRef(true);
  const dirtyRef = useRef(false);
  const closingRef = useRef(false);
  const filingRef = useRef(false);

  const loadDraft = useCallback(async () => {
    setSaveState("loading");
    setMessage("");
    try {
      const query = resourceId ? `?resourceId=${encodeURIComponent(resourceId)}` : "";
      const response = await noteDraftRequest<{ draft: RemoteDraft | null }>(`study/note-drafts${query}`);
      if (!activeRef.current) return;
      const next = response.draft ? {
        moduleId: response.draft.moduleId || base.current.moduleId,
        title: response.draft.title,
        body: response.draft.body,
      } : base.current;
      draftIdRef.current = response.draft?.id;
      revisionRef.current = response.draft?.revision ?? 0;
      resourceVersionRef.current = response.draft?.resourceUpdatedAt ?? resourceUpdatedAt;
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
  }, [resourceId, resourceUpdatedAt]);

  useEffect(() => {
    activeRef.current = true;
    const timer = window.setTimeout(() => { void loadDraft(); }, 0);
    return () => { window.clearTimeout(timer); activeRef.current = false; };
  }, [loadDraft]);

  const update = useCallback((change: Partial<NoteDraft>) => {
    generationRef.current += 1;
    dirtyRef.current = true;
    setDirty(true);
    const next = { ...draftRef.current, ...change };
    draftRef.current = next;
    setDraft(next);
  }, []);
  const updateBody = useCallback((body: string) => update({ body }), [update]);

  const persistDraft = useCallback((snapshot = draftRef.current, keepalive = false) => {
    if (!loaded) return Promise.resolve(false);
    const generation = generationRef.current;
    const queued = saveQueueRef.current.then(async () => {
      if (!activeRef.current) return false;
      setSaveState("saving");
      setMessage("");
      try {
        const response = await noteDraftRequest<{ draft: RemoteDraft }>("study/note-drafts", "PATCH", {
          ...(resourceId ? { resourceId } : {}),
          ...(resourceId && resourceVersionRef.current ? { resourceUpdatedAt: resourceVersionRef.current } : {}),
          moduleId: snapshot.moduleId || null,
          title: snapshot.title,
          body: snapshot.body,
          expectedRevision: revisionRef.current,
        }, keepalive);
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
          const conflict = error instanceof NoteDraftApiError && ["revision_conflict", "study_conflict"].includes(error.code ?? "");
          setSaveState(conflict ? "conflict" : "error");
          setMessage(text);
        }
        return false;
      }
    });
    saveQueueRef.current = queued.catch(() => false);
    return queued;
  }, [loaded, resourceId]);

  useEffect(() => {
    const preserveLatestDraft = () => {
      bodyFlushRef.current(false);
      if (dirtyRef.current) void persistDraft(draftRef.current, true);
    };
    window.addEventListener("pagehide", preserveLatestDraft);
    return () => window.removeEventListener("pagehide", preserveLatestDraft);
  }, [persistDraft]);

  useEffect(() => {
    if (!loaded || !dirty || saveState === "conflict") return;
    const timer = window.setTimeout(() => { void persistDraft(draft); }, 650);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, loaded, persistDraft, saveState]);

  const registerBodyFlush = useCallback((flush: ((canonicalize?: boolean) => string) | null) => {
    bodyFlushRef.current = flush ?? (() => draftRef.current.body);
  }, []);

  const requestClose = useCallback(async () => {
    if (closingRef.current) return;
    bodyFlushRef.current(false);
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
      const activeModal = filingModalRef.current ?? modalRef.current;
      const focusable = [...activeModal.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [contenteditable='true'], [tabindex]:not([tabindex='-1'])")];
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
    const body = bodyFlushRef.current(true);
    if (!draftRef.current.title.trim()) update({ title: suggestedTitle(body) });
    setFiling(true);
  };
  const importMarkdown = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.md$/iu.test(file.name)) { setMessage("Choose a Markdown file ending in .md."); return; }
    if (file.size > 1_000_000) { setMessage("That Markdown file is larger than the 1 MB import limit."); return; }
    try {
      const imported = parseMarkdownFile(file.name, await file.text());
      setMessage("");
      update({ title: imported.title, body: imported.body });
    } catch {
      setMessage("Threadwise could not read that Markdown file. Check that it is plain UTF-8 text and try again.");
    }
  };
  const fileNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    bodyFlushRef.current(true);
    const snapshot = draftRef.current;
    if (dirtyRef.current && !await persistDraft(snapshot)) return;
    const saved = await onSave(value ? `study/resources/${value.id}` : "study/resources", value ? "PATCH" : "POST", {
      moduleId: snapshot.moduleId,
      ...(value ? { expectedUpdatedAt: resourceVersionRef.current ?? value.updatedAt } : { kind: "NOTE" }),
      title: snapshot.title.trim(),
      body: snapshot.body,
    }, value ? "Note updated." : "Note saved.");
    if (!saved || !draftIdRef.current) return;
    try { await noteDraftRequest(`study/note-drafts/${draftIdRef.current}`, "DELETE", {}); } catch { /* A stale draft is safe and expires automatically. */ }
  };

  const selectedModule = study.modules.find((module) => module.id === draft.moduleId);
  const status = saveState === "loading" ? "Loading draft…"
    : saveState === "saving" ? "Saving across devices…"
      : saveState === "saved" ? "Saved across devices"
        : saveState === "conflict" ? "Another device has a newer copy"
          : saveState === "error" ? "Draft not saved"
            : "Start writing — autosave is on";

  return createPortal(<div className="study-note-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) void requestClose(); }}>
    <section ref={modalRef} className="study-note-fullscreen" role="dialog" aria-modal={filing ? undefined : "true"} aria-labelledby="study-note-editor-title">
      <header className="study-note-fullscreen-head" inert={filing ? true : undefined}>
        <div><span>{value ? `${value.module.code} · ${value.publicId}` : "Study note"}</span><h2 id="study-note-editor-title">{draft.title.trim() || "Untitled note"}</h2></div>
        <div className="study-note-head-actions">
          <input ref={importRef} type="file" accept=".md,text/markdown,text/plain" hidden onChange={(event) => { void importMarkdown(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          <button type="button" className="study-secondary" onClick={() => importRef.current?.click()}><FileUp size={16} /> <span>Import .md</span></button>
          <button type="button" className="study-primary" disabled={!loaded || !draft.body.trim()} onClick={openFiling}><Save size={16} /> Save</button>
          <button type="button" className="study-note-close" disabled={closing} onClick={() => void requestClose()} aria-label="Close note editor">{closing ? <LoaderCircle className="spin" size={20} /> : <X size={20} />}</button>
        </div>
      </header>
      <div className="study-note-autosave" inert={filing ? true : undefined} data-state={saveState} role={saveState === "error" || saveState === "conflict" ? "alert" : "status"}>
        {saveState === "saving" || saveState === "loading" ? <LoaderCircle className="spin" size={14} /> : saveState === "saved" ? <Cloud size={14} /> : <FileText size={14} />}
        <span>{status}</span><i>{draft.body.length.toLocaleString()} characters{selectedModule ? ` · ${selectedModule.code}` : ""}</i>
        {saveState === "conflict" && <button type="button" onClick={() => void loadDraft()}>Load newer copy</button>}
      </div>
      {message && <p className="study-note-save-message" inert={filing ? true : undefined}>{message}</p>}
      {recovered && <p className="study-note-recovered" inert={filing ? true : undefined}><Check size={14} /> Continued from your encrypted cross-device draft.</p>}
      <main className="study-note-writing-space" inert={filing ? true : undefined}>
        {loaded ? <StudyRichNoteBody value={draft.body} onChange={updateBody} onFlushReady={registerBodyFlush} /> : <div className="study-rich-loading"><LoaderCircle className="spin" size={20} /> Preparing your writing space…</div>}
      </main>
      {filing && <div className="study-note-filing-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setFiling(false); }}>
        <form ref={filingModalRef} className="study-note-filing" role="dialog" aria-modal="true" onSubmit={fileNote} aria-labelledby="study-note-file-title">
          <header><div><span>File note</span><h3 id="study-note-file-title">Where should this live?</h3></div><button type="button" onClick={() => setFiling(false)} aria-label="Return to note"><X size={18} /></button></header>
          <label>Title<input required maxLength={500} value={draft.title} onChange={(event) => update({ title: event.target.value })} autoFocus /></label>
          <StudyChoicePicker label="Module" value={draft.moduleId} options={study.modules.map((module) => ({ value: module.id, label: module.code, detail: module.name }))} searchable allowEmpty={false} onChange={(moduleId) => update({ moduleId })} />
          <p>Your writing is already autosaved. Filing gives it a title, module, Library entry, search indexing, and version history.</p>
          <footer><button type="button" className="study-secondary" onClick={() => setFiling(false)}>Continue writing</button><button className="study-primary" disabled={busy || !draft.moduleId || !draft.title.trim() || !draft.body.trim()}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Save note</button></footer>
        </form>
      </div>}
    </section>
  </div>, document.body);
}

function suggestedTitle(body: string): string {
  const line = body.split("\n").map((entry) => entry.replace(/^\s{0,3}#{1,6}\s+/u, "").trim()).find(Boolean);
  return (line || "Untitled note").slice(0, 120);
}
