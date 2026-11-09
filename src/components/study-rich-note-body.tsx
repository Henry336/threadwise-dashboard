"use client";
/**
 * Rich WYSIWYG Markdown writing surface shared by the Study and Personal note editors.
 * Built on Tiptap: edits happen as a rich document, and Markdown is the stored format that goes
 * back to the parent through `onChange`. Adds safe links/images, Mermaid/UML diagram blocks with a
 * live preview, checklists, tables, and Tab/Shift+Tab indentation.
 */

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

/** Renders a Markdown image inside the editor through MarkdownImage, which applies the remote-image consent rules. */
function RichImageView({ node }: ReactNodeViewProps) {
  return <NodeViewWrapper className="study-rich-image" contentEditable={false}>
    <MarkdownImage src={String(node.attrs.src ?? "")} alt={String(node.attrs.alt ?? "")} />
    {node.attrs.alt && <span className="study-rich-image-alt">{String(node.attrs.alt)}</span>}
  </NodeViewWrapper>;
}

/**
 * Small keyboard-accessible menu that switches a Mermaid flow/class/state diagram between vertical and
 * horizontal layout. Custom-built instead of a native select, in line with the dashboard's branded controls.
 * Arrow/Home/End move focus, Escape and outside clicks close it, and focus returns to the trigger.
 */
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

/**
 * Editor view for code blocks. Plain code shows a language label; Mermaid blocks show a rendered preview
 * with an "Edit diagram" toggle, layout menu and syntax guidance. Easy syntax previews while you type
 * but is only rewritten to portable Mermaid on "Done", so passive autosave never changes what you typed.
 */
function RichCodeBlockView({ node, editor, getPos }: ReactNodeViewProps) {
  const isMermaid = node.attrs.language === "mermaid";
  const [editing, setEditing] = useState(!isMermaid || !node.textContent.trim());
  const normalized = isMermaid ? normalizeMermaidSource(node.textContent) : null;
  const diagram = isMermaid ? getMermaidDiagramInfo(normalized?.source ?? node.textContent) : null;
  /** Replaces this block's text in one editor transaction, so it stays undoable. */
  const replaceSource = (source: string) => {
    const position = typeof getPos === "function" ? getPos() : undefined;
    if (typeof position !== "number" || source === node.textContent) return;
    editor.view.dispatch(editor.state.tr.insertText(source, position + 1, position + node.nodeSize - 1));
  };
  const finishEditing = () => {
    if (normalized?.changed) replaceSource(normalized.source);
    setEditing(false);
  };
  /** Adds an empty paragraph after the diagram so the writer is not stuck inside the code block. */
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

/** Code block node that renders through RichCodeBlockView. */
const RichCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(RichCodeBlockView);
  },
});

/**
 * Rewrites every Mermaid block's easy syntax into portable Mermaid in one transaction.
 * Runs only on an explicit canonicalizing flush (filing or saving), never during autosave.
 * Replacements are applied back to front so earlier positions stay valid.
 */
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

/**
 * Indents or outdents every selected line inside a single code block. Returns false outside
 * code blocks so Tab falls through to the browser's normal focus movement.
 */
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

/**
 * Tab/Shift+Tab handling: nest or lift list and checklist items, otherwise indent code lines.
 * High priority so it runs before Tiptap's default keymaps.
 */
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

/**
 * Link mark that drops unsafe URLs (for example `javascript:`) both when reading and when writing Markdown.
 * Unsafe links keep their text but lose the link.
 */
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

/** Image node that renders through RichImageView. */
const SafeImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(RichImageView);
  },
});

/**
 * The full Tiptap extension list for Study and Personal notes. Base64 images are disallowed and
 * Markdown uses GFM, so notes stay portable as plain `.md` files.
 */
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

/**
 * Markdown sync is coalesced: emit 140 ms after typing pauses, and at least every 900 ms while typing.
 * Converting the whole document to Markdown on every keystroke caused typing lag and lost focus.
 */
const MARKDOWN_SYNC_DELAY_MS = 140;
const MARKDOWN_SYNC_MAX_WAIT_MS = 900;

/**
 * The rich editor component. Parents pass Markdown in `value` and receive Markdown through `onChange`.
 * It remembers the Markdown it last emitted so an autosave echo does not reset the document and the
 * cursor; only a genuine external change (an import or a newer draft) replaces the content.
 * `onFlushReady` gives the parent a function to force out the latest Markdown before save or close.
 */
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

  /**
   * Converts the editor to Markdown now and emits it if it changed. With canonicalize=true it first
   * normalizes Mermaid easy syntax. Returns the Markdown so callers can save it straight away.
   */
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

  /** Debounces Markdown emission after an edit, with a maximum wait so long typing bursts still sync. */
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
    /** Captures Escape while the diagram help is open so it closes only the help panel, not the whole note editor. */
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

  /** Applies, replaces or removes the link on the selection, rejecting unsafe addresses with a message. */
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
  /** Inserts a Mermaid block, either a starter flowchart or a template chosen from the help panel. */
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

/** Icon-only toolbar button with an accessible label and pressed/expanded state. */
function ToolbarButton({ label, active = false, disabled = false, expanded, controls, onClick, children }: { label: string; active?: boolean; disabled?: boolean; expanded?: boolean; controls?: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active || undefined} aria-expanded={expanded} aria-controls={controls} disabled={disabled} onClick={onClick}>{children}</button>;
}
