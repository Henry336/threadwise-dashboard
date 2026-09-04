"use client";

import CodeBlock from "@tiptap/extension-code-block";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Markdown } from "@tiptap/markdown";
import { Extension, type Editor } from "@tiptap/core";
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold, Braces, Check, CheckSquare, ChevronDown, CircleHelp, Code2, Heading2, Italic, Link as LinkIcon,
  List, ListOrdered, Network, Redo2, Table2, Underline as UnderlineIcon, Undo2,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DEFAULT_INDENT, indentationRemovalWidth, selectedLineStarts } from "../lib/study-editor-indentation";
import { shouldReplaceEditorDocument } from "../lib/study-editor-sync";
import { safeMarkdownLink } from "../lib/study-markdown-security";
import { getMermaidDiagramInfo, normalizeMermaidSource, setMermaidLayout, type MermaidLayoutChoice } from "../lib/study-mermaid";
import { MarkdownImage, MermaidDiagram } from "./study-markdown-media";
import { StudyMermaidHelp } from "./study-mermaid-help";

function RichImageView({ node }: ReactNodeViewProps) {
  return <NodeViewWrapper className="study-rich-image" contentEditable={false}>
    <MarkdownImage src={String(node.attrs.src ?? "")} alt={String(node.attrs.alt ?? "")} />
    {node.attrs.alt && <span className="study-rich-image-alt">{String(node.attrs.alt)}</span>}
  </NodeViewWrapper>;
}

function DiagramLayoutMenu({ layout, onSelect }: { layout: "vertical" | "horizontal"; onSelect: (choice: MermaidLayoutChoice) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const options: Array<{ value: MermaidLayoutChoice; label: string }> = [
    { value: "vertical", label: "Vertical" },
    { value: "horizontal", label: "Horizontal" },
    { value: "default", label: "Reset to default" },
  ];
  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const choose = (choice: MermaidLayoutChoice) => {
    onSelect(choice);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape, true);
    window.requestAnimationFrame(() => optionRefs.current[layout === "horizontal" ? 1 : 0]?.focus());
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape, true);
    };
  }, [layout, open]);

  const moveFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const active = optionRefs.current.findIndex((entry) => entry === document.activeElement);
    const last = options.length - 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? last
      : event.key === "ArrowDown" ? (active < 0 || active === last ? 0 : active + 1)
        : (active <= 0 ? last : active - 1);
    optionRefs.current[next]?.focus();
  };

  return <div className="study-rich-mermaid-layout" ref={rootRef}>
    <button ref={triggerRef} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((value) => !value)}>
      Layout: {layout === "horizontal" ? "Horizontal" : "Vertical"} <ChevronDown size={13} />
    </button>
    {open && <div id={menuId} role="menu" aria-label="Diagram layout" onKeyDown={moveFocus}>
      {options.map((option, index) => <button
        key={option.value}
        ref={(element) => { optionRefs.current[index] = element; }}
        type="button"
        role={option.value === "default" ? "menuitem" : "menuitemradio"}
        aria-checked={option.value === "default" ? undefined : option.value === layout}
        onClick={() => choose(option.value)}
      >
        <span>{option.label}</span>{option.value !== "default" && option.value === layout && <Check size={13} />}
      </button>)}
    </div>}
  </div>;
}

function RichCodeBlockView({ node, editor, getPos }: ReactNodeViewProps) {
  const isMermaid = node.attrs.language === "mermaid";
  const [editing, setEditing] = useState(!isMermaid || !node.textContent.trim());
  const normalized = isMermaid ? normalizeMermaidSource(node.textContent) : null;
  const diagram = isMermaid ? getMermaidDiagramInfo(normalized?.source ?? node.textContent) : null;
  const replaceSource = (source: string) => {
    const position = typeof getPos === "function" ? getPos() : undefined;
    if (typeof position !== "number" || source === node.textContent) return;
    editor.view.dispatch(editor.state.tr.insertText(source, position + 1, position + node.nodeSize - 1));
  };
  const finishEditing = () => {
    if (normalized?.changed) replaceSource(normalized.source);
    setEditing(false);
  };
  const continueWriting = () => {
    const position = typeof getPos === "function" ? getPos() : undefined;
    if (typeof position !== "number") return;
    editor.chain().insertContentAt(position + node.nodeSize, { type: "paragraph" }).focus(position + node.nodeSize + 1).run();
  };

  if (!isMermaid) {
    return <NodeViewWrapper className="study-rich-code-block">
      <span contentEditable={false}>{node.attrs.language || "code"}</span>
      <NodeViewContent className="study-rich-code-source" />
    </NodeViewWrapper>;
  }

  return <NodeViewWrapper className={`study-rich-mermaid${editing ? " editing" : ""}`}>
    <div className="study-rich-mermaid-head" contentEditable={false}>
      <span><Network size={14} /> {diagram?.label ?? "Mermaid diagram"}</span>
      <div className="study-rich-mermaid-actions">
        {diagram?.layoutSupported && diagram.layout && <DiagramLayoutMenu layout={diagram.layout} onSelect={(choice) => replaceSource(setMermaidLayout(node.textContent, choice))} />}
        <button type="button" onClick={() => editing ? finishEditing() : setEditing(true)}>{editing ? "Done" : "Edit diagram"}</button>
      </div>
    </div>
    <div className="study-rich-mermaid-preview" contentEditable={false} role="button" tabIndex={0} onClick={() => setEditing(true)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setEditing(true); } }} aria-label="Edit Mermaid diagram source">
      {node.textContent.trim() ? <MermaidDiagram source={normalized?.source ?? node.textContent} /> : <span>Add Mermaid source below to draw the diagram.</span>}
    </div>
    <NodeViewContent className="study-rich-mermaid-source" />
    {editing && normalized?.changed && !normalized.issues.length && <p className="study-rich-mermaid-guidance" contentEditable={false}>Easy syntax previews here and becomes portable Mermaid when you finish.</p>}
    {editing && normalized?.issues.length ? <div className="study-rich-mermaid-guidance error" contentEditable={false} role="status">
      {normalized.issues.map((issue) => <p key={`${issue.line}-${issue.message}`}>Line {issue.line}: {issue.message}</p>)}
    </div> : null}
    <button type="button" className="study-rich-continue" contentEditable={false} onClick={continueWriting}>Continue writing below</button>
  </NodeViewWrapper>;
}

const RichCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(RichCodeBlockView);
  },
});

function normalizeEditorMermaidBlocks(editor: Editor): boolean {
  const replacements: Array<{ from: number; to: number; source: string }> = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== "codeBlock" || node.attrs.language !== "mermaid") return;
    const normalized = normalizeMermaidSource(node.textContent);
    if (normalized.changed) replacements.push({ from: position + 1, to: position + node.nodeSize - 1, source: normalized.source });
  });
  if (!replacements.length) return false;
  let transaction = editor.state.tr;
  for (const replacement of replacements.reverse()) transaction = transaction.insertText(replacement.source, replacement.from, replacement.to);
  editor.view.dispatch(transaction);
  return true;
}

function changeCodeBlockIndentation(editor: Editor, direction: "indent" | "outdent"): boolean {
  const { selection } = editor.state;
  if (selection.$from.parent.type.name !== "codeBlock" || selection.$from.parent !== selection.$to.parent) return false;

  const blockStart = selection.$from.start();
  const text = selection.$from.parent.textContent;
  const lineStarts = selectedLineStarts(text, selection.from - blockStart, selection.to - blockStart);
  let transaction = editor.state.tr;

  for (const lineStart of [...lineStarts].reverse()) {
    const position = blockStart + lineStart;
    if (direction === "indent") transaction = transaction.insertText(DEFAULT_INDENT, position);
    else {
      const width = indentationRemovalWidth(text, lineStart);
      if (width) transaction = transaction.delete(position, position + width);
    }
  }

  if (transaction.docChanged) editor.view.dispatch(transaction);
  return true;
}

const StudyIndentation = Extension.create({
  name: "studyIndentation",
  priority: 1_100,
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive("taskItem") && this.editor.commands.sinkListItem("taskItem")) return true;
        if (this.editor.isActive("listItem") && this.editor.commands.sinkListItem("listItem")) return true;
        return changeCodeBlockIndentation(this.editor, "indent");
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("taskItem") && this.editor.commands.liftListItem("taskItem")) return true;
        if (this.editor.isActive("listItem") && this.editor.commands.liftListItem("listItem")) return true;
        return changeCodeBlockIndentation(this.editor, "outdent");
      },
    };
  },
});

const SafeLink = Link.extend({
  parseMarkdown(token, helpers) {
    const children = helpers.parseInline(token.tokens || []);
    const href = safeMarkdownLink(String(token.href ?? ""));
    if (!href) return children;
    return helpers.applyMark("link", children, { href, title: token.title || null });
  },
  renderMarkdown(node, helpers) {
    const text = helpers.renderChildren(node);
    const href = safeMarkdownLink(String(node.attrs?.href ?? ""));
    if (!href) return text;
    const title = String(node.attrs?.title ?? "");
    return title ? `[${text}](${href} "${title}")` : `[${text}](${href})`;
  },
});

const SafeImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(RichImageView);
  },
});

export const studyRichNoteExtensions = [
  StarterKit.configure({
    codeBlock: false,
    link: false,
  }),
  SafeLink.configure({ openOnClick: false, autolink: true, defaultProtocol: "https", isAllowedUri: (url) => Boolean(safeMarkdownLink(url)) }),
  SafeImage.configure({ inline: false, allowBase64: false }),
  RichCodeBlock.configure({ exitOnArrowDown: true, exitOnTripleEnter: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  Markdown.configure({ markedOptions: { gfm: true, breaks: false } }),
  StudyIndentation,
];

type StudyRichNoteBodyProps = {
  value: string;
  onChange: (markdown: string) => void;
  onReady?: () => void;
  onFlushReady?: (flush: ((canonicalize?: boolean) => string) | null) => void;
  ariaLabel?: string;
};

const MARKDOWN_SYNC_DELAY_MS = 140;
const MARKDOWN_SYNC_MAX_WAIT_MS = 900;

export function StudyRichNoteBody({ value, onChange, onReady, onFlushReady, ariaLabel = "Study note" }: StudyRichNoteBodyProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [diagramHelpOpen, setDiagramHelpOpen] = useState(false);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  const lastLocallyEmittedMarkdownRef = useRef(value);
  const editorRef = useRef<Editor | null>(null);
  const pendingEditorRef = useRef<Editor | null>(null);
  const quietSyncTimerRef = useRef<number | null>(null);
  const maxSyncTimerRef = useRef<number | null>(null);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  const clearMarkdownSyncTimers = useCallback(() => {
    if (quietSyncTimerRef.current !== null) window.clearTimeout(quietSyncTimerRef.current);
    if (maxSyncTimerRef.current !== null) window.clearTimeout(maxSyncTimerRef.current);
    quietSyncTimerRef.current = null;
    maxSyncTimerRef.current = null;
  }, []);

  const flushMarkdown = useCallback((canonicalize = false) => {
    const current = pendingEditorRef.current ?? editorRef.current;
    clearMarkdownSyncTimers();
    if (!current) return lastLocallyEmittedMarkdownRef.current;
    if (canonicalize) {
      normalizeEditorMermaidBlocks(current);
      clearMarkdownSyncTimers();
    }
    pendingEditorRef.current = null;
    const markdown = current.getMarkdown();
    if (markdown !== lastLocallyEmittedMarkdownRef.current) {
      lastLocallyEmittedMarkdownRef.current = markdown;
      onChangeRef.current(markdown);
    }
    return markdown;
  }, [clearMarkdownSyncTimers]);

  const scheduleMarkdownSync = useCallback((current: Editor) => {
    pendingEditorRef.current = current;
    if (quietSyncTimerRef.current !== null) window.clearTimeout(quietSyncTimerRef.current);
    quietSyncTimerRef.current = window.setTimeout(() => flushMarkdown(false), MARKDOWN_SYNC_DELAY_MS);
    if (maxSyncTimerRef.current === null) {
      maxSyncTimerRef.current = window.setTimeout(() => flushMarkdown(false), MARKDOWN_SYNC_MAX_WAIT_MS);
    }
  }, [flushMarkdown]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: studyRichNoteExtensions,
    content: value || "",
    contentType: "markdown",
    editorProps: {
      attributes: {
        class: "study-rich-document",
        "aria-label": ariaLabel,
        spellcheck: "true",
      },
    },
    onCreate: ({ editor: current }) => { editorRef.current = current; onReadyRef.current?.(); },
    onUpdate: ({ editor: current }) => scheduleMarkdownSync(current),
  }, [ariaLabel]);

  useEffect(() => {
    editorRef.current = editor;
    return () => { if (editorRef.current === editor) editorRef.current = null; };
  }, [editor]);

  useEffect(() => {
    onFlushReady?.(flushMarkdown);
    return () => {
      onFlushReady?.(null);
      clearMarkdownSyncTimers();
    };
  }, [clearMarkdownSyncTimers, flushMarkdown, onFlushReady]);

  useEffect(() => {
    if (!editor) return;
    if (value === lastLocallyEmittedMarkdownRef.current) return;
    const current = editor.getMarkdown();
    if (shouldReplaceEditorDocument(value, lastLocallyEmittedMarkdownRef.current, current)) {
      editor.commands.setContent(value || "", { contentType: "markdown", emitUpdate: false });
    }
    lastLocallyEmittedMarkdownRef.current = value;
  }, [editor, value]);

  useEffect(() => {
    if (!editor || !diagramHelpOpen) return;
    const closeHelp = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setDiagramHelpOpen(false);
      editor.chain().focus().run();
    };
    document.addEventListener("keydown", closeHelp, true);
    return () => document.removeEventListener("keydown", closeHelp, true);
  }, [diagramHelpOpen, editor]);

  if (!editor) return <div className="study-rich-loading">Preparing your writing space…</div>;

  const applyLink = () => {
    const href = link.trim();
    if (!href) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else {
      const safe = safeMarkdownLink(href);
      if (!safe) { setLinkError("Use an http(s), mailto, page, or heading link."); return; }
      editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run();
    }
    setLinkOpen(false);
    setLink("");
    setLinkError("");
  };
  const insertDiagram = (source = "flowchart TD\n  A[Start] --> B[Next step]") => {
    setDiagramHelpOpen(false);
    editor.chain().focus().insertContent({
    type: "codeBlock",
    attrs: { language: "mermaid" },
    content: [{ type: "text", text: source }],
    }).run();
  };

  return <div className="study-rich-editor">
    <div className="study-rich-toolbar" role="toolbar" aria-label="Note formatting">
      <div className="study-rich-toolbar-group">
        <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></ToolbarButton>
        <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></ToolbarButton>
      </div>
      <div className="study-rich-toolbar-group">
        <ToolbarButton label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></ToolbarButton>
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} /></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} /></ToolbarButton>
        <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={17} /></ToolbarButton>
      </div>
      <div className="study-rich-toolbar-group">
        <ToolbarButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></ToolbarButton>
        <ToolbarButton label="Checklist" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare size={17} /></ToolbarButton>
        <ToolbarButton label="Code block" active={editor.isActive("codeBlock") && editor.getAttributes("codeBlock").language !== "mermaid"} onClick={() => editor.chain().focus().toggleCodeBlock({ language: "" }).run()}><Code2 size={17} /></ToolbarButton>
      </div>
      <div className="study-rich-toolbar-group">
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={() => { setLink(editor.getAttributes("link").href ?? ""); setLinkOpen((value) => !value); }}><LinkIcon size={17} /></ToolbarButton>
        <ToolbarButton label="Table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 size={17} /></ToolbarButton>
        <ToolbarButton label="Insert Mermaid diagram" onClick={() => insertDiagram()}><Network size={17} /></ToolbarButton>
        <ToolbarButton label="Mermaid and UML syntax help" expanded={diagramHelpOpen} controls="study-mermaid-help" onClick={() => { setLinkOpen(false); setDiagramHelpOpen((open) => !open); }}><CircleHelp size={17} /></ToolbarButton>
        <ToolbarButton label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}><Braces size={17} /></ToolbarButton>
      </div>
      {linkOpen && <form className="study-rich-link-popover" onSubmit={(event) => { event.preventDefault(); applyLink(); }}>
        <label htmlFor="study-note-link">Link address</label>
        <input id="study-note-link" type="text" inputMode="url" value={link} onChange={(event) => { setLink(event.target.value); setLinkError(""); }} placeholder="https://…" autoFocus />
        <button type="submit">Apply</button>
        <button type="button" onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); setLinkOpen(false); setLink(""); setLinkError(""); }}>Remove</button>
        {linkError && <p role="alert">{linkError}</p>}
      </form>}
    </div>
    <EditorContent className="study-rich-editor-scroll" editor={editor} />
    <StudyMermaidHelp open={diagramHelpOpen} onClose={() => { setDiagramHelpOpen(false); editor.chain().focus().run(); }} onInsert={insertDiagram} />
  </div>;
}

function ToolbarButton({ label, active = false, disabled = false, expanded, controls, onClick, children }: { label: string; active?: boolean; disabled?: boolean; expanded?: boolean; controls?: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active || undefined} aria-expanded={expanded} aria-controls={controls} disabled={disabled} onClick={onClick}>{children}</button>;
}
