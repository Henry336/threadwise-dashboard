"use client";
/* Authenticated image responses stay behind the dashboard's same-origin proxy. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import {
  Archive, ArrowRight, BrainCircuit, Check, ChevronLeft, ChevronRight,
  CheckSquare2, Download, FileText, Filter, Image as ImageIcon,
  Lightbulb, LoaderCircle, MoreHorizontal, Pencil, Pin, Plus, RefreshCw, Search,
  Sparkles, Star, Trash2, X, Zap,
} from "lucide-react";
import { ActionMenu, useActionMenu } from "./action-menu";
import { useModal } from "@/lib/use-modal";
import { calendarKey, formatDate } from "@/lib/zoned-time";
import { imageSrc } from "@/lib/dashboard-images";
import type { ActionMenuAction } from "./action-menu";
import type {
  DashboardIdea, DashboardImage, DashboardNote, IdeaBrief,
  IdeaStatus,
} from "@/lib/types";
import { buildMarkdownExport, markdownExcerpt, safeMarkdownFileName } from "@/lib/study-markdown";

type Pagination = { page: number; hasMore: boolean; loading: boolean };
export type IdeaBriefDialogState = { idea: DashboardIdea; brief?: IdeaBrief; loading: boolean; error?: string };





function downloadPersonalNote(note: DashboardNote): void {
  const source = buildMarkdownExport({ title: note.title, body: note.body || note.summary, publicId: note.publicId });
  const url = URL.createObjectURL(new Blob([source], { type: "text/markdown;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeMarkdownFileName(note.title);
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}


function newestPinned<T extends { pinned?: boolean; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function LoadMore({ state, onLoadMore }: { state: Pagination; onLoadMore: () => void }) {
  if (!state.hasMore) return null;
  return <button className="tw-phase-load-more" disabled={state.loading} onClick={onLoadMore}>
    {state.loading ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}
    {state.loading ? "Loading…" : "Load more"}
  </button>;
}

function CollectionEmpty({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <div className="tw-phase-empty"><span>{icon}</span><h3>{title}</h3><p>{copy}</p></div>;
}

export function PhaseTwoNotesView({ notes, timezone, onEdit, onPin, onDelete, onBatchDelete, pagination, onLoadMore }: {
  notes: DashboardNote[];
  timezone: string;
  onEdit: (note: DashboardNote) => void;
  onPin: (note: DashboardNote) => void;
  onDelete: (note: DashboardNote) => Promise<boolean>;
  onBatchDelete: (notes: DashboardNote[]) => Promise<boolean>;
  pagination: Pagination;
  onLoadMore: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardMenu = useActionMenu<DashboardNote>();
  const visible = useMemo(() => newestPinned(notes).filter((note) => `${note.title} ${note.summary} ${note.body ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())), [notes, query]);
  const toggleSelect = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const leaveSelection = () => { setSelecting(false); setSelected(new Set()); };
  const beginLongPress = (event: PointerEvent<HTMLElement>, note: DashboardNote) => {
    const button = (event.target as HTMLElement).closest("button");
    if (event.pointerType === "mouse" || (button && !button.classList.contains("tw-phase-card-copy"))) return;
    longPress.current = setTimeout(() => { setSelecting(true); setSelected(new Set([note.id])); }, 460);
  };
  const cancelLongPress = () => { if (longPress.current) clearTimeout(longPress.current); longPress.current = null; };
  const deleteSelection = async () => {
    const chosen = notes.filter((note) => selected.has(note.id));
    if (await onBatchDelete(chosen)) leaveSelection();
  };
  const menuActions = (note: DashboardNote): ActionMenuAction[] => [
    { label: "Edit note", icon: <Pencil size={16} />, onSelect: () => onEdit(note) },
    { label: "Export .md", icon: <Download size={16} />, onSelect: () => downloadPersonalNote(note) },
    { label: note.pinned ? "Unpin note" : "Pin to top", icon: <Pin size={16} />, onSelect: () => onPin(note) },
    { label: "Select note", icon: <CheckSquare2 size={16} />, onSelect: () => { setSelecting(true); setSelected((current) => new Set(current).add(note.id)); } },
    { label: "separator", icon: null, onSelect: () => undefined },
    { label: "Delete note", icon: <Trash2 size={16} />, danger: true, onSelect: () => void onDelete(note) },
  ];
  return <section className="tw-phase-collection tw-phase-notes">
    <div className="tw-phase-note-toolbar">
      <div className="tw-phase-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search note titles and text" /><kbd>{visible.length}</kbd></div>
      <button className={selecting ? "active" : ""} onClick={() => selecting ? leaveSelection() : setSelecting(true)}>{selecting ? <X size={17} /> : <CheckSquare2 size={17} />}{selecting ? "Cancel" : "Select"}</button>
    </div>
    <div className="tw-phase-note-grid">
      {visible.map((note, index) => <article
        className={`tw-phase-note-card tone-${index % 4} ${selected.has(note.id) ? "selected" : ""}`}
        key={note.id}
        onContextMenu={(event) => cardMenu.open(event, note)}
        onPointerDown={(event) => beginLongPress(event, note)}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
      >
        <header><span><FileText size={15} /> Note</span><div>{note.pinned && <em><Pin size={13} /> Pinned</em>}<button onClick={(event) => cardMenu.open(event, note)} aria-label={`Actions for ${note.title}`}><MoreHorizontal size={19} /></button></div></header>
        {selecting && <button className="tw-phase-note-select" onClick={() => toggleSelect(note.id)} aria-label={`${selected.has(note.id) ? "Deselect" : "Select"} ${note.title}`}>{selected.has(note.id) ? <Check size={16} /> : null}</button>}
        <button className="tw-phase-card-copy" onClick={() => selecting ? toggleSelect(note.id) : onEdit(note)}><h3>{note.title}</h3><p>{markdownExcerpt(note.body || note.summary)}</p></button>
        <footer><time>{formatDate(note.updatedAt ?? note.createdAt, timezone, { year: "numeric" })}</time><div><button onClick={() => onPin(note)} aria-label={note.pinned ? "Unpin note" : "Pin note"}><Pin size={16} /></button><button onClick={() => onEdit(note)}>Edit <ArrowRight size={15} /></button></div></footer>
      </article>)}
    </div>
    {!visible.length && <CollectionEmpty icon={<FileText size={27} />} title="No notes found" copy="Try a different phrase or capture a new note." />}
    <LoadMore state={pagination} onLoadMore={onLoadMore} />
    {selecting && <div className="tw-phase-bulk-bar" role="toolbar" aria-label="Selected notes"><span><b>{selected.size}</b> selected</span><button onClick={() => setSelected(new Set(visible.map((note) => note.id)))}>Select all</button><button className="danger" disabled={!selected.size} onClick={() => void deleteSelection()}><Trash2 size={17} /> Delete</button></div>}
    {cardMenu.menu && <ActionMenu state={cardMenu.menu} label={cardMenu.menu.item.publicId} actions={menuActions(cardMenu.menu.item)} onClose={cardMenu.close} />}
  </section>;
}

export function PhaseTwoIdeasView({ ideas, timezone, onEdit, onPin, onArchive, onAnalyze, onConvert, pagination, onLoadMore }: {
  ideas: DashboardIdea[];
  timezone: string;
  onEdit: (idea: DashboardIdea) => void;
  onPin: (idea: DashboardIdea) => void;
  onArchive: (idea: DashboardIdea) => Promise<boolean>;
  onAnalyze: (idea: DashboardIdea) => void;
  onConvert: (idea: DashboardIdea) => void;
  pagination: Pagination;
  onLoadMore: () => void;
}) {
  const [status, setStatus] = useState<"ALL" | IdeaStatus>("ALL");
  const cardMenu = useActionMenu<DashboardIdea>();
  const visible = useMemo(() => newestPinned(ideas).filter((idea) => status === "ALL" || idea.status === status), [ideas, status]);
  const menuActions = (idea: DashboardIdea): ActionMenuAction[] => [
    { label: "Open idea brief", icon: <BrainCircuit size={16} />, onSelect: () => onAnalyze(idea) },
    { label: "Edit idea", icon: <Pencil size={16} />, onSelect: () => onEdit(idea) },
    { label: idea.pinned ? "Unpin idea" : "Pin to top", icon: <Pin size={16} />, onSelect: () => onPin(idea) },
    { label: "Turn into task", icon: <Zap size={16} />, onSelect: () => onConvert(idea) },
    { label: "separator", icon: null, onSelect: () => undefined },
    { label: "Archive idea", icon: <Archive size={16} />, danger: true, onSelect: () => void onArchive(idea) },
  ];
  return <section className="tw-phase-collection tw-phase-ideas">
    <div className="tw-phase-filter-row">
      <div className="tw-phase-pills">{(["ALL", "RAW", "PROTOTYPING", "BUILT"] as const).map((item) => <button className={status === item ? "active" : ""} key={item} onClick={() => setStatus(item)}>{item === "ALL" ? "All ideas" : item.toLowerCase()}</button>)}</div>
      <p><BrainCircuit size={17} /> Idea Brief uses Threadwise AI to pressure-test a concept.</p>
    </div>
    <div className="tw-phase-idea-grid">
      {visible.map((idea, index) => <article className="tw-phase-idea-card" key={idea.id} style={{ "--idea-index": index } as CSSProperties} onContextMenu={(event) => cardMenu.open(event, idea)}>
        <header><span><Lightbulb size={15} /> {idea.publicId}</span><div>{idea.pinned && <em><Pin size={13} /> Pinned</em>}<i data-status={idea.status}>{idea.status.toLowerCase()}</i><button onClick={(event) => cardMenu.open(event, idea)} aria-label={`Actions for ${idea.title}`}><MoreHorizontal size={19} /></button></div></header>
        <button className="tw-phase-card-copy" onClick={() => onEdit(idea)}><h3>{idea.title}</h3><p>{idea.concept}</p></button>
        <div className="tw-phase-idea-actions"><button className="tw-phase-brief-button" onClick={() => onAnalyze(idea)}><BrainCircuit size={17} />{idea.brief ? "Open idea brief" : "Analyze feasibility"}<Sparkles size={14} /></button><button onClick={() => onConvert(idea)}><Zap size={16} /> Task</button></div>
        <footer><time>{formatDate(idea.updatedAt ?? idea.createdAt, timezone, { year: "numeric" })}</time><button onClick={() => onEdit(idea)}>Edit <ArrowRight size={15} /></button></footer>
      </article>)}
    </div>
    {!visible.length && <CollectionEmpty icon={<Lightbulb size={27} />} title="No ideas in this stage" copy="Every useful project starts as a small spark." />}
    <LoadMore state={pagination} onLoadMore={onLoadMore} />
    {cardMenu.menu && <ActionMenu state={cardMenu.menu} label={cardMenu.menu.item.publicId} actions={menuActions(cardMenu.menu.item)} onClose={cardMenu.close} />}
  </section>;
}

export function PhaseTwoImagesView({ images, timezone, isDemo, onEdit, onPin, onDelete, onBatchDelete, onCreateNote, pagination, onLoadMore }: {
  images: DashboardImage[];
  timezone: string;
  isDemo: boolean;
  onEdit: (image: DashboardImage) => void;
  onPin: (image: DashboardImage) => void;
  onDelete: (image: DashboardImage) => Promise<boolean>;
  onBatchDelete: (images: DashboardImage[]) => Promise<boolean>;
  onCreateNote: (image: DashboardImage) => void;
  pagination: Pagination;
  onLoadMore: () => void;
}) {
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState(false);
  const [active, setActive] = useState<DashboardImage | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const cardMenu = useActionMenu<DashboardImage>();
  const visible = useMemo(() => newestPinned(images).filter((image) => (!documents || image.mediaKind.toLowerCase() === "document") && `${image.caption ?? ""} ${image.ocrText ?? ""} ${image.fileName ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())), [images, documents, query]);
  const favourites = visible.filter((image) => image.pinned);
  const regular = visible.filter((image) => !image.pinned);
  const grouped = regular.reduce<Record<string, DashboardImage[]>>((result, image) => { const key = calendarKey(image.createdAt, timezone); (result[key] ??= []).push(image); return result; }, {});
  const toggleSelect = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const deleteSelection = async () => { const chosen = images.filter((image) => selected.has(image.id)); if (await onBatchDelete(chosen)) setSelected(new Set()); };
  const menuActions = (image: DashboardImage): ActionMenuAction[] => [
    { label: "Open image", icon: <ImageIcon size={16} />, onSelect: () => setActive(image) },
    { label: "Edit caption", icon: <Pencil size={16} />, onSelect: () => onEdit(image) },
    { label: image.pinned ? "Remove favourite" : "Add to favourites", icon: <Star size={16} />, onSelect: () => onPin(image) },
    { label: "Make a note", icon: <FileText size={16} />, onSelect: () => onCreateNote(image) },
    { label: "separator", icon: null, onSelect: () => undefined },
    { label: "Delete image", icon: <Trash2 size={16} />, danger: true, onSelect: () => void onDelete(image) },
  ];
  const photoGrid = (items: DashboardImage[]) => <div className="tw-phase-photo-grid">{items.map((image) => <article key={image.id} className={selected.has(image.id) ? "selected" : ""} onContextMenu={(event) => cardMenu.open(event, image)}>
    <button className="tw-phase-photo" onClick={() => setActive(image)}><img loading="lazy" src={imageSrc(image, isDemo, images.indexOf(image))} alt={image.caption ?? image.fileName ?? "Saved image"} /><span><b>{image.caption || image.fileName || "Untitled image"}</b><small>{image.ocrText ? "Searchable text found" : formatDate(image.createdAt, timezone)}</small></span></button>
    <button className={`tw-phase-star ${image.pinned ? "active" : ""}`} onClick={() => onPin(image)} aria-label={image.pinned ? "Remove from favourites" : "Add to favourites"}><Star size={17} fill={image.pinned ? "currentColor" : "none"} /></button>
    <button className={`tw-phase-select ${selected.has(image.id) ? "active" : ""}`} onClick={() => toggleSelect(image.id)} aria-label={`Select ${image.caption ?? image.publicId}`}>{selected.has(image.id) ? <Check size={14} /> : <Plus size={14} />}</button>
    <button className="tw-phase-photo-menu" onClick={(event) => cardMenu.open(event, image)} aria-label={`Actions for ${image.caption ?? image.publicId}`}><MoreHorizontal size={18} /></button>
  </article>)}</div>;
  return <section className="tw-phase-images">
    <div className="tw-phase-gallery-toolbar"><label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search captions, filenames, or extracted text" /></label><button className={documents ? "active" : ""} onClick={() => setDocuments(!documents)}><Filter size={16} /> Documents</button>{selected.size > 0 && <div><span>{selected.size} selected</span><button onClick={() => void deleteSelection()}><Trash2 size={16} /> Delete</button></div>}</div>
    {favourites.length > 0 && <section className="tw-phase-favourites"><div className="tw-phase-section-title"><span><Star size={17} fill="currentColor" /></span><div><h2>Favourites</h2><p>Your most useful frames, kept within reach.</p></div><em>{favourites.length}</em></div>{photoGrid(favourites)}</section>}
    {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([day, items]) => <section className="tw-phase-image-day" key={day}><div className="tw-phase-section-title"><div><h2>{day === calendarKey(new Date(), timezone) ? "Today" : formatDate(`${day}T12:00:00+08:00`, timezone, { weekday: "long" })}</h2><p>{items.length} {items.length === 1 ? "saved frame" : "saved frames"}</p></div></div>{photoGrid(items)}</section>)}
    {!visible.length && <CollectionEmpty icon={<ImageIcon size={27} />} title="No images found" copy="Send a photo or document to Threadwise in Telegram; it will appear here." />}
    <LoadMore state={pagination} onLoadMore={onLoadMore} />
    {active && (() => { const current = images.find((image) => image.id === active.id) ?? active; return <PhaseTwoImageLightbox image={current} images={visible} isDemo={isDemo} onClose={() => setActive(null)} onMove={(direction) => { const index = visible.findIndex((image) => image.id === current.id); setActive(visible[(index + direction + visible.length) % visible.length]); }} onEdit={() => { onEdit(current); setActive(null); }} onPin={() => onPin(current)} onDelete={async () => { if (await onDelete(current)) setActive(null); }} onCreateNote={() => { onCreateNote(current); setActive(null); }} />; })()}
    {cardMenu.menu && <ActionMenu state={cardMenu.menu} label={cardMenu.menu.item.publicId} actions={menuActions(cardMenu.menu.item)} onClose={cardMenu.close} />}
  </section>;
}

function PhaseTwoImageLightbox({ image, images, isDemo, onClose, onMove, onEdit, onPin, onDelete, onCreateNote }: {
  image: DashboardImage;
  images: DashboardImage[];
  isDemo: boolean;
  onClose: () => void;
  onMove: (direction: number) => void;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => Promise<void>;
  onCreateNote: () => void;
}) {
  const dialog = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<number | null>(null);
  useModal(dialog, onClose);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") onMove(-1);
      if (event.key === "ArrowRight") onMove(1);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onMove]);
  return <div ref={dialog} className="tw-phase-lightbox" role="dialog" aria-modal="true" aria-label={image.caption ?? "Image preview"}>
    <header><span>{images.findIndex((item) => item.id === image.id) + 1} / {images.length}</span><div><button className={image.pinned ? "active" : ""} onClick={onPin}><Star size={17} fill={image.pinned ? "currentColor" : "none"} /> {image.pinned ? "Favourite" : "Favourite"}</button><button onClick={onEdit}><Pencil size={17} /> Caption</button><button onClick={onCreateNote}><FileText size={17} /> Make note</button><button className="danger" onClick={() => void onDelete()} aria-label={`Delete ${image.caption ?? image.fileName ?? "image"}`}><Trash2 size={17} /></button><button onClick={onClose} aria-label="Close preview"><X size={21} /></button></div></header>
    <button className="tw-phase-lightbox-arrow left" onClick={() => onMove(-1)} aria-label="Previous image"><ChevronLeft size={30} /></button>
    <figure onPointerDown={(event) => { pointerStart.current = event.clientX; }} onPointerUp={(event) => { if (pointerStart.current === null) return; const delta = event.clientX - pointerStart.current; if (Math.abs(delta) > 55) onMove(delta > 0 ? -1 : 1); pointerStart.current = null; }}><img draggable={false} src={imageSrc(image, isDemo, images.indexOf(image))} alt={image.caption ?? image.fileName ?? "Saved image"} /><figcaption><b>{image.caption || image.fileName || "Untitled image"}</b>{image.ocrText && <p>{image.ocrText}</p>}</figcaption></figure>
    <button className="tw-phase-lightbox-arrow right" onClick={() => onMove(1)} aria-label="Next image"><ChevronRight size={30} /></button>
  </div>;
}

export function PhaseTwoIdeaBriefDialog({ state, onClose, onRefresh }: { state: IdeaBriefDialogState; onClose: () => void; onRefresh: () => void }) {
  const dialog = useRef<HTMLElement | null>(null);
  useModal(dialog, onClose);
  const metrics = state.brief ? [
    ["Buildability", state.brief.buildability], ["Usefulness", state.brief.usefulness],
    ["Novelty", state.brief.novelty], ["Portfolio value", state.brief.portfolioValue],
    ["Monetization", state.brief.monetization], ["Difficulty", state.brief.difficulty], ["Risk", state.brief.risk],
  ] as [string, number][] : [];
  const signal = state.brief ? Math.round((state.brief.buildability + state.brief.usefulness + state.brief.novelty + state.brief.portfolioValue + state.brief.monetization + (10 - state.brief.difficulty) + (10 - state.brief.risk)) / 7 * 10) : 0;
  return <div className="tw-phase-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialog} className="tw-phase-brief-dialog" role="dialog" aria-modal="true" aria-labelledby="idea-brief-title">
    <header><div><span><BrainCircuit size={17} /> Threadwise Idea Brief</span><h2 id="idea-brief-title">{state.idea.title}</h2><p>{state.idea.publicId} · a practical pressure test, not a promise.</p></div><button onClick={onClose} aria-label="Close idea brief"><X size={21} /></button></header>
    {state.loading ? <div className="tw-phase-brief-loading"><span><Sparkles size={24} /></span><h3>Examining the shape of this idea…</h3><p>Threadwise is weighing usefulness, feasibility, differentiation, and risk.</p><div><i /><i /><i /></div></div> : state.error && !state.brief ? <div className="tw-phase-brief-error"><BrainCircuit size={28} /><h3>The brief could not be prepared.</h3><p>{state.error}</p><button className="tw-primary" onClick={onRefresh}><RefreshCw size={16} /> Try again</button></div> : state.brief && <div className="tw-phase-brief-body">
      <section className="tw-phase-brief-signal"><div className="tw-phase-signal-orbit" style={{ "--signal": `${signal * 3.6}deg` } as CSSProperties}><span><b>{signal}</b><small>signal</small></span></div><div><span>Executive read</span><h3>{state.brief.summary}</h3><p>{state.brief.marketNotes}</p></div></section>
      <section className="tw-phase-brief-metrics">{metrics.map(([label, value]) => <article key={label} className={label === "Risk" || label === "Difficulty" ? "caution" : ""}><span><b>{label}</b><em>{value}/10</em></span><i><small style={{ width: `${value * 10}%` }} /></i></article>)}</section>
      <section className="tw-phase-brief-lists"><div><span>Lean into</span>{state.brief.dos.map((item) => <p key={item}><Check size={16} />{item}</p>)}</div><div><span>Watch closely</span>{state.brief.donts.map((item) => <p key={item}><X size={16} />{item}</p>)}</div></section>
    </div>}
    <footer><p><Sparkles size={15} /> Saved with the idea, so it is available next time.</p><button onClick={onRefresh} disabled={state.loading}><RefreshCw size={15} /> Re-analyze</button><button className="tw-primary" onClick={onClose}>Done</button></footer>
  </section></div>;
}
