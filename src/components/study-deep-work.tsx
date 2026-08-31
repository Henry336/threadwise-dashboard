"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, AlertTriangle, BookOpen, Brain, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleHelp, File, FileText, Image as ImageIcon, Link as LinkIcon, LoaderCircle,
  MoreHorizontal, Play, Plus, RefreshCw, Search, Square, Trash2, X,
} from "lucide-react";
import { Ari } from "./ari";
import { StudyChoicePicker } from "./study-choice-picker";
import { StudyDialog } from "./study-dialog";
import type {
  StudyAnalysisEvidence, StudyAnalysisFinding, StudyAnalysisMode, StudyAnalysisQuizItem,
  StudyItem, StudyModuleAnalysisResponse, StudyNoteEditSuggestion, StudyResource,
  StudyResourceKind, StudySession, StudySnapshot,
} from "@/lib/study-types";
import {
  studyAnalysisAction, studyAnalysisEvidenceNumbers, studyAnalysisInitialModuleId,
  studyAnalysisModules, studyAnalysisReason,
} from "@/lib/study-analysis";
import {
  FOCUS_STRUCTURES, STUDY_TECHNIQUES, type FocusStructureId, sessionCustomMethod,
  sessionElapsedSeconds, sessionMethodSummary, sessionResourceIds,
} from "@/lib/study-session";

const STUDY_CONFIRM_EVENT = "threadwise:study-confirm";
type Confirmation = { message: string; action: () => unknown };

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

export function StudyDeepWork({ study, busy, initialItemId, activeSession, outcome, onDismissOutcome, onStart, onStop, onUpdate, onArchive, onComplete, onRecordMistake, onOpenLibrary }: DeepWorkPhaseOneProps) {
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


function PageHead({ kicker, title }: { kicker: string; title: string }) {
  return <header className="study-page-head"><div><span>{kicker}</span><h1>{title}</h1></div></header>;
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return <div className="study-empty"><span className="study-empty-mark" aria-hidden="true"><BookOpen size={28} /></span><b>{title}</b><p>{copy}</p></div>;
}

function resourceIcon(kind: StudyResourceKind) {
  if (kind === "IMAGE") return <ImageIcon size={15} />;
  if (kind === "LINK") return <LinkIcon size={15} />;
  if (kind === "FILE") return <File size={15} />;
  if (kind === "QUESTION") return <CircleHelp size={15} />;
  return <FileText size={15} />;
}

function isUsefulFocusTarget(item: StudyItem) {
  return !/^(?:image capture|image received)(?:\b|\s*[-:])/i.test(item.title.trim());
}

function confirmAction(message: string, action: () => unknown) {
  window.dispatchEvent(new CustomEvent<Confirmation>(STUDY_CONFIRM_EVENT, { detail: { message, action } }));
}

function humanize(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
}

function localInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", weekday: "short", timeZone: timezone }).format(new Date(value));
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(value));
}

function formatDateTime(value: string, timezone: string) {
  return `${formatDate(value, timezone)}, ${formatTime(value, timezone)}`;
}

function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
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

async function studyApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/threadwise/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined
      ? { Accept: "application/json" }
      : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const value = payload as { message?: string; error?: string };
    throw new Error(value.message || "Study Mode could not complete that request.");
  }
  return payload as T;
}
