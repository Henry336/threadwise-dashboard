"use client";
/* Authenticated image responses stay behind the dashboard's same-origin proxy. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import {
  Archive, ArrowRight, BarChart3, BrainCircuit, Check, ChevronLeft, ChevronRight,
  CircleDollarSign, Cloud, Download, ExternalLink, FileText, Filter, Image as ImageIcon,
  Lightbulb, LoaderCircle, MoreHorizontal, Pencil, Pin, Plus, RefreshCw, Search,
  Sparkles, Star, Trash2, TrendingUp, X, Zap,
} from "lucide-react";
import type {
  DashboardExpense, DashboardIdea, DashboardImage, DashboardNote, IdeaBrief,
  IdeaStatus, IntegrationStatus,
} from "@/lib/types";

type Pagination = { page: number; hasMore: boolean; loading: boolean };
type MenuAction = { label: string; icon: ReactNode; danger?: boolean; onSelect: () => void };
export type IdeaBriefDialogState = { idea: DashboardIdea; brief?: IdeaBrief; loading: boolean; error?: string };

const DEMO_IMAGES = ["garden-light.svg", "launch-board.svg", "morning-cafe.svg", "receipt.svg", "city-rain.svg", "book-stack.svg"];
const CATEGORY_COLORS = ["#6556d8", "#168b83", "#e68a63", "#e1b64a", "#87a36b", "#a776bb"];

function calendarKey(value: string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatDate(value: string, timezone: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: timezone, ...options }).format(new Date(value));
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency }).format(value);
}

function imageSrc(image: DashboardImage, isDemo: boolean, index = 0) {
  return isDemo
    ? `/demo/${image.fileName && DEMO_IMAGES.includes(image.fileName) ? image.fileName : DEMO_IMAGES[index % DEMO_IMAGES.length]}`
    : `/api/threadwise/images/${encodeURIComponent(image.id)}/content`;
}

function newestPinned<T extends { pinned?: boolean; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function useCardMenu<T>() {
  const [menu, setMenu] = useState<{ item: T; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);
  const open = (event: MouseEvent, item: T) => {
    event.preventDefault();
    event.stopPropagation();
    const width = 224;
    const height = 270;
    setMenu({
      item,
      x: Math.min(event.clientX, Math.max(12, window.innerWidth - width - 12)),
      y: Math.min(event.clientY, Math.max(12, window.innerHeight - height - 12)),
    });
  };
  return { menu, open, close: () => setMenu(null) };
}

function CollectionMenu({ x, y, label, actions, onClose }: { x: number; y: number; label: string; actions: MenuAction[]; onClose: () => void }) {
  return <div className="tw-context-menu tw-collection-menu" role="menu" style={{ left: x, top: y }} onClick={(event) => event.stopPropagation()}>
    <span>{label}</span>
    {actions.map((action, index) => action.label === "separator"
      ? <hr key={`separator-${index}`} />
      : <button key={action.label} role="menuitem" className={action.danger ? "danger" : ""} onClick={() => { action.onSelect(); onClose(); }}>{action.icon}{action.label}</button>)}
  </div>;
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

export function PhaseTwoNotesView({ notes, timezone, onEdit, onPin, onArchive, pagination, onLoadMore }: {
  notes: DashboardNote[];
  timezone: string;
  onEdit: (note: DashboardNote) => void;
  onPin: (note: DashboardNote) => void;
  onArchive: (note: DashboardNote) => Promise<boolean>;
  pagination: Pagination;
  onLoadMore: () => void;
}) {
  const [query, setQuery] = useState("");
  const cardMenu = useCardMenu<DashboardNote>();
  const visible = useMemo(() => newestPinned(notes).filter((note) => `${note.title} ${note.summary} ${note.body ?? ""} ${note.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())), [notes, query]);
  const menuActions = (note: DashboardNote): MenuAction[] => [
    { label: "Edit note", icon: <Pencil size={16} />, onSelect: () => onEdit(note) },
    { label: note.pinned ? "Unpin note" : "Pin to top", icon: <Pin size={16} />, onSelect: () => onPin(note) },
    { label: "separator", icon: null, onSelect: () => undefined },
    { label: "Archive note", icon: <Archive size={16} />, danger: true, onSelect: () => void onArchive(note) },
  ];
  return <section className="tw-phase-collection tw-phase-notes">
    <div className="tw-phase-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes, text, or tags" /><kbd>{visible.length}</kbd></div>
    <div className="tw-phase-note-grid">
      {visible.map((note, index) => <article className={`tw-phase-note-card tone-${index % 4}`} key={note.id} onContextMenu={(event) => cardMenu.open(event, note)}>
        <header><span><FileText size={15} /> Note</span><div>{note.pinned && <em><Pin size={13} /> Pinned</em>}<button onClick={(event) => cardMenu.open(event, note)} aria-label={`Actions for ${note.title}`}><MoreHorizontal size={19} /></button></div></header>
        <button className="tw-phase-card-copy" onClick={() => onEdit(note)}><h3>{note.title}</h3><p>{note.body || note.summary}</p></button>
        {note.tags.length > 0 && <div className="tw-phase-tags">{note.tags.slice(0, 5).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
        <footer><time>{formatDate(note.updatedAt ?? note.createdAt, timezone, { year: "numeric" })}</time><div><button onClick={() => onPin(note)} aria-label={note.pinned ? "Unpin note" : "Pin note"}><Pin size={16} /></button><button onClick={() => onEdit(note)}>Edit <ArrowRight size={15} /></button></div></footer>
      </article>)}
    </div>
    {!visible.length && <CollectionEmpty icon={<FileText size={27} />} title="No notes found" copy="Try a different phrase or capture a new note." />}
    <LoadMore state={pagination} onLoadMore={onLoadMore} />
    {cardMenu.menu && <CollectionMenu x={cardMenu.menu.x} y={cardMenu.menu.y} label={cardMenu.menu.item.publicId} actions={menuActions(cardMenu.menu.item)} onClose={cardMenu.close} />}
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
  const cardMenu = useCardMenu<DashboardIdea>();
  const visible = useMemo(() => newestPinned(ideas).filter((idea) => status === "ALL" || idea.status === status), [ideas, status]);
  const menuActions = (idea: DashboardIdea): MenuAction[] => [
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
        {idea.tags.length > 0 && <div className="tw-phase-tags">{idea.tags.slice(0, 5).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
        <div className="tw-phase-idea-actions"><button className="tw-phase-brief-button" onClick={() => onAnalyze(idea)}><BrainCircuit size={17} />{idea.brief ? "Open idea brief" : "Analyze feasibility"}<Sparkles size={14} /></button><button onClick={() => onConvert(idea)}><Zap size={16} /> Task</button></div>
        <footer><time>{formatDate(idea.updatedAt ?? idea.createdAt, timezone, { year: "numeric" })}</time><button onClick={() => onEdit(idea)}>Edit <ArrowRight size={15} /></button></footer>
      </article>)}
    </div>
    {!visible.length && <CollectionEmpty icon={<Lightbulb size={27} />} title="No ideas in this stage" copy="Every useful project starts as a small spark." />}
    <LoadMore state={pagination} onLoadMore={onLoadMore} />
    {cardMenu.menu && <CollectionMenu x={cardMenu.menu.x} y={cardMenu.menu.y} label={cardMenu.menu.item.publicId} actions={menuActions(cardMenu.menu.item)} onClose={cardMenu.close} />}
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
  const cardMenu = useCardMenu<DashboardImage>();
  const visible = useMemo(() => newestPinned(images).filter((image) => (!documents || image.mediaKind.toLowerCase() === "document") && `${image.caption ?? ""} ${image.ocrText ?? ""} ${image.fileName ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())), [images, documents, query]);
  const favourites = visible.filter((image) => image.pinned);
  const regular = visible.filter((image) => !image.pinned);
  const grouped = regular.reduce<Record<string, DashboardImage[]>>((result, image) => { const key = calendarKey(image.createdAt, timezone); (result[key] ??= []).push(image); return result; }, {});
  const toggleSelect = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const deleteSelection = async () => { const chosen = images.filter((image) => selected.has(image.id)); if (await onBatchDelete(chosen)) setSelected(new Set()); };
  const menuActions = (image: DashboardImage): MenuAction[] => [
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
    {cardMenu.menu && <CollectionMenu x={cardMenu.menu.x} y={cardMenu.menu.y} label={cardMenu.menu.item.publicId} actions={menuActions(cardMenu.menu.item)} onClose={cardMenu.close} />}
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
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onMove(-1);
      if (event.key === "ArrowRight") onMove(1);
    };
    window.addEventListener("keydown", keydown);
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { window.removeEventListener("keydown", keydown); document.body.style.overflow = previousOverflow; };
  }, [onClose, onMove]);
  return <div ref={dialog} className="tw-phase-lightbox" role="dialog" aria-modal="true" aria-label={image.caption ?? "Image preview"}>
    <header><span>{images.findIndex((item) => item.id === image.id) + 1} / {images.length}</span><div><button className={image.pinned ? "active" : ""} onClick={onPin}><Star size={17} fill={image.pinned ? "currentColor" : "none"} /> {image.pinned ? "Favourite" : "Favourite"}</button><button onClick={onEdit}><Pencil size={17} /> Caption</button><button onClick={onCreateNote}><FileText size={17} /> Make note</button><button className="danger" onClick={() => void onDelete()}><Trash2 size={17} /></button><button onClick={onClose} aria-label="Close preview"><X size={21} /></button></div></header>
    <button className="tw-phase-lightbox-arrow left" onClick={() => onMove(-1)} aria-label="Previous image"><ChevronLeft size={30} /></button>
    <figure onPointerDown={(event) => { pointerStart.current = event.clientX; }} onPointerUp={(event) => { if (pointerStart.current === null) return; const delta = event.clientX - pointerStart.current; if (Math.abs(delta) > 55) onMove(delta > 0 ? -1 : 1); pointerStart.current = null; }}><img draggable={false} src={imageSrc(image, isDemo, images.indexOf(image))} alt={image.caption ?? image.fileName ?? "Saved image"} /><figcaption><b>{image.caption || image.fileName || "Untitled image"}</b>{image.ocrText && <p>{image.ocrText}</p>}</figcaption></figure>
    <button className="tw-phase-lightbox-arrow right" onClick={() => onMove(1)} aria-label="Next image"><ChevronRight size={30} /></button>
  </div>;
}

function categoryGradient(categories: [string, number][], total: number) {
  if (!categories.length || total <= 0) return "conic-gradient(var(--line) 0 100%)";
  let cursor = 0;
  const stops = categories.slice(0, 6).map(([, value], index) => {
    const start = cursor;
    cursor += value / total * 100;
    return `${CATEGORY_COLORS[index]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  if (cursor < 100) stops.push(`var(--line) ${cursor.toFixed(2)}% 100%`);
  return `conic-gradient(${stops.join(", ")})`;
}

export function PhaseTwoExpensesView({ expenses, timezone, currency, integration, onSync, onEdit, onAdd, pagination, onLoadMore, announce }: {
  expenses: DashboardExpense[];
  timezone: string;
  currency: string;
  integration?: IntegrationStatus;
  onSync: () => Promise<void>;
  onEdit: (expense: DashboardExpense) => void;
  onAdd: () => void;
  pagination: Pagination;
  onLoadMore: () => void;
  announce: (message: string) => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const currentMonth = calendarKey(new Date(), timezone).slice(0, 7);
  const monthly = expenses.filter((expense) => calendarKey(expense.transactionAt, timezone).startsWith(currentMonth));
  const current = monthly.filter((expense) => expense.currency === currency);
  const total = current.reduce((sum, expense) => sum + expense.total, 0);
  const average = current.length ? total / current.length : 0;
  const largest = current.reduce<DashboardExpense | undefined>((winner, expense) => !winner || expense.total > winner.total ? expense : winner, undefined);
  const synced = current.filter((expense) => expense.excelSyncedAt).length;
  const categories = Object.entries(current.reduce<Record<string, number>>((result, expense) => ({ ...result, [expense.category || "Other"]: (result[expense.category || "Other"] ?? 0) + expense.total }), {})).sort((a, b) => b[1] - a[1]) as [string, number][];
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const value = expenses.filter((expense) => expense.currency === currency && calendarKey(expense.transactionAt, timezone).startsWith(key)).reduce((sum, expense) => sum + expense.total, 0);
    return { key, label: new Intl.DateTimeFormat("en-SG", { month: "short" }).format(date), value };
  });
  const peak = Math.max(...months.map((month) => month.value), 1);
  const exportCsv = () => {
    const rows = [["Date", "Merchant", "Description", "Category", "Total", "Currency"], ...expenses.map((expense) => [expense.transactionAt, expense.merchant ?? "", expense.description, expense.category ?? "", String(expense.total), expense.currency])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "threadwise-expenses.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    announce("Expense CSV downloaded.");
  };
  const sync = async () => { setSyncing(true); try { await onSync(); } catch (error) { announce(error instanceof Error ? error.message : "Excel sync could not be completed."); } finally { setSyncing(false); } };
  return <section className="tw-phase-expenses">
    <div className="tw-phase-expense-hero">
      <div className="tw-phase-expense-total"><span>This month · {currency}</span><h2>{money(total, currency)}</h2><p>{current.length ? `${current.length} captures, averaging ${money(average, currency)}` : "Your first captured expense will appear here."}</p><div className="tw-phase-month-bars" aria-label="Six month spending trend">{months.map((month) => <span key={month.key}><i style={{ height: `${Math.max(8, month.value / peak * 100)}%` }} /><small>{month.label}</small></span>)}</div></div>
      <div className="tw-phase-expense-ring-card"><div className="tw-phase-expense-ring" style={{ "--expense-ring": categoryGradient(categories, total) } as CSSProperties}><span><b>{categories.length}</b><small>categories</small></span></div><div><span>Where it went</span>{categories.slice(0, 5).map(([category, value], index) => <p key={category}><i style={{ background: CATEGORY_COLORS[index] }} /><b>{category}</b><small>{money(value, currency)}</small></p>)}{!categories.length && <p className="empty">Categories appear as you capture expenses.</p>}</div></div>
    </div>
    <div className="tw-phase-expense-metrics">
      <article><span><TrendingUp size={18} /></span><div><small>Average capture</small><b>{money(average, currency)}</b><p>Across this month</p></div></article>
      <article><span><BarChart3 size={18} /></span><div><small>Largest movement</small><b>{largest ? money(largest.total, currency) : money(0, currency)}</b><p>{largest?.merchant || largest?.description || "Nothing captured yet"}</p></div></article>
      <article><span><Cloud size={18} /></span><div><small>Excel coverage</small><b>{current.length ? Math.round(synced / current.length * 100) : 0}%</b><p>{synced} of {current.length} synced</p></div></article>
    </div>
    {integration && <div className="tw-phase-sync-ribbon"><span><Cloud size={18} /><div><b>{integration.state === "connected" ? "Excel is connected" : "Your ledger can travel"}</b><small>{integration.detail}</small></div></span>{integration.state === "connected" ? <button onClick={() => void sync()} disabled={syncing}>{syncing ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />} Sync now</button> : <a href="https://t.me/threadwise_1_bot" target="_blank" rel="noreferrer">Connect in Telegram <ExternalLink size={14} /></a>}</div>}
    <div className="tw-phase-expense-ledger"><header><div><span>Activity</span><h3>Recent movements</h3></div><div><button onClick={exportCsv}><Download size={16} /> Export</button><button className="tw-primary" onClick={onAdd}><Plus size={16} /> Add expense</button></div></header><div className="tw-phase-expense-rows">{expenses.map((expense) => <button key={expense.id} onClick={() => onEdit(expense)}><span>{(expense.merchant || expense.description || "E")[0].toUpperCase()}</span><div><b>{expense.merchant || expense.description}</b><small>{expense.description}{expense.category ? ` · ${expense.category}` : ""}</small></div><time>{formatDate(expense.transactionAt, timezone, { year: "numeric" })}</time><p><b>{money(expense.total, expense.currency)}</b><small>{expense.excelSyncedAt ? "Synced" : "Not synced"}</small></p><ArrowRight size={17} /></button>)}</div>{!expenses.length && <CollectionEmpty icon={<CircleDollarSign size={27} />} title="No expenses yet" copy="Capture one in Telegram or add it here." />}<LoadMore state={pagination} onLoadMore={onLoadMore} /></div>
  </section>;
}

export function PhaseTwoIdeaBriefDialog({ state, onClose, onRefresh }: { state: IdeaBriefDialogState; onClose: () => void; onRefresh: () => void }) {
  const dialog = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", keydown);
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { window.removeEventListener("keydown", keydown); document.body.style.overflow = previousOverflow; };
  }, [onClose]);
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
