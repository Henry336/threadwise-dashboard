import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Study UI regressions", () => {
  it("keeps every rendered dashboard choice on the shared accessible picker", () => {
    const read = (name: string) => readFileSync(join(process.cwd(), "src", "components", name), "utf8");
    const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, "");
    const studySource = withoutComments(read("study-dashboard.tsx"));
    const renderedStudy = studySource.replace(/function DeepWork\([\s\S]*?\r?\n\}\r?\n\r?\ntype DeepWorkPhaseOneProps/u, "type DeepWorkPhaseOneProps");

    for (const source of [
      withoutComments(read("dashboard-app.tsx")),
      withoutComments(read("group-scheduling.tsx")),
      withoutComments(read("group-workspace.tsx")),
      withoutComments(read("task-import-review.tsx")),
      renderedStudy,
    ]) expect(source).not.toContain("<select");

    const picker = read("study-choice-picker.tsx");
    expect(picker).toContain('name={name} value={value}');
    expect(picker).toContain('role="listbox"');
    expect(picker).toContain('role="option"');
    expect(picker).toContain("StudyFormChoicePicker");
  });

  it("names image navigation and deletion actions for assistive technology", () => {
    const dashboard = readFileSync(join(process.cwd(), "src", "components", "dashboard-app.tsx"), "utf8");
    const collections = readFileSync(join(process.cwd(), "src", "components", "phase-two-collections.tsx"), "utf8");

    expect(dashboard).toContain('aria-label="Open saved images"');
    expect(dashboard).toContain('aria-label={`Open ${image.caption ?? image.fileName ?? "saved image"}`}');
    expect(collections).toContain('aria-label={`Delete ${image.caption ?? image.fileName ?? "image"}`}');
  });

  it("keeps toolbar search inputs inside the shared 46px control height", () => {
    const css = readFileSync(join(process.cwd(), "src", "app", "study-dashboard.css"), "utf8");
    const genericFields = css.lastIndexOf(".study-shell input,");
    const toolbarOverride = css.indexOf(".study-shell .study-toolbar > label > input");

    expect(toolbarOverride).toBeGreaterThan(genericFields);
    expect(css.slice(toolbarOverride, toolbarOverride + 260)).toContain("height: 44px");
    expect(css.slice(toolbarOverride, toolbarOverride + 260)).toContain("border: 0");
  });

  it("renders timetable titles before metadata at every density", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "study-timetable.tsx"), "utf8");
    const horizontal = component.slice(component.indexOf("function HorizontalWeekGrid"), component.indexOf("const DAY_NAMES"));

    expect(horizontal).toContain("<b>{block.label}</b>");
    expect(horizontal).toContain('density !== "narrow" && <span>{block.module?.code ?? block.blockType}</span>');
    expect(horizontal).not.toContain("<small>{formatClock(block.startTime)}");
    expect(component).toContain("<b>{item.title}</b><span>{item.module.code}</span>");
    expect(component).not.toContain("shortBlockLabel");
  });

  it("uses Threadwise choice popovers for module analysis instead of native selects", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");
    const analysis = component.slice(component.indexOf('className="study-module-analysis"'), component.indexOf("function StudyCitationLinks"));

    expect(analysis).toContain('<StudyChoicePicker label="Module"');
    expect(analysis).toContain('<StudyChoicePicker label="Review type"');
    expect(analysis).toContain("allowEmpty={false}");
    expect(analysis).not.toContain("<select");
  });

  it("uses the branded module picker in Study Work without changing the persisted all value", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");
    const work = component.slice(component.indexOf("function Work("), component.indexOf("function LibraryView("));

    expect(work).toContain('<StudyChoicePicker');
    expect(work).toContain('label="Module filter"');
    expect(work).toContain('placeholder="All modules"');
    expect(work).toContain('value={moduleFilter === "all" ? "" : moduleFilter}');
    expect(work).toContain('onChange={(next) => onModuleFilter(next || "all")}');
    expect(work).not.toContain("<ModuleSelect");
    expect(work).not.toContain("<select");
  });

  it("uses branded choice controls throughout the timetable block editor", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "study-timetable.tsx"), "utf8");
    const editor = component.slice(component.indexOf("function TimetableEditor"));

    expect(editor).toContain('<StudyChoicePicker label="Module"');
    expect(editor).toContain('<StudyChoicePicker label="Type"');
    expect(editor).toContain('<StudyChoicePicker label="Day"');
    expect(editor).toContain('<StudyTimePicker label="Starts"');
    expect(editor).toContain('<StudyTimePicker label="Ends"');
    expect(editor).toContain('<StudyChoicePicker label="Usual origin"');
    expect(editor).toContain('<div className="study-timetable-weeks wide">');
    expect(editor).toContain('<StudyPlaceCombobox optional');
    expect(editor).not.toContain("<select");
    expect(editor).not.toContain('type="time"');
  });

  it("lets laptop users persistently collapse and restore the Study sidebar", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src", "app", "study-dashboard.css"), "utf8");

    expect(component).toContain('usePersistentState("threadwise-study-desktop-sidebar-open", true)');
    expect(component).toContain('id="study-sidebar"');
    expect(component).toContain('aria-controls="study-sidebar"');
    expect(component).toContain("aria-expanded={desktopSidebarOpen}");
    expect(component).toContain('desktopSidebarOpen ? "" : " sidebar-collapsed"');
    expect(css).toContain("@media (min-width: 861px)");
    expect(css).toContain(".study-shell.sidebar-collapsed { grid-template-columns: 0 minmax(0, 1fr); }");
    expect(css).toContain(".study-icon.desktop { display: none; }");
  });

  it("uses theme-aware Threadwise scrollbars for Study navigation and the horizontal timetable", () => {
    const css = readFileSync(join(process.cwd(), "src", "app", "study-dashboard.css"), "utf8");

    expect(css).toContain("--study-scrollbar-thumb:");
    expect(css).toContain("--study-scrollbar-thumb-hover:");
    expect(css).toContain('[data-theme="dark"] .study-shell');
    expect(css).toContain(".study-sidebar nav::-webkit-scrollbar { width: 10px; }");
    expect(css).toContain(".study-horizontal-grid::-webkit-scrollbar { height: 10px; }");
    expect(css).toContain("scrollbar-color: var(--study-scrollbar-thumb) transparent;");
    expect(css).toContain("background-clip: padding-box;");
    expect(css).toContain(".study-horizontal-grid::-webkit-scrollbar-button { display: none;");
    expect(css).toContain(".study-sidebar nav::-webkit-scrollbar { display: none; }");
  });

  it("opens Study images at natural resolution and returns to fit mode before closing", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src", "app", "study-dashboard.css"), "utf8");
    const viewer = component.slice(component.indexOf("function StudyImageViewer"), component.indexOf("function Review("));

    expect(viewer).toContain("const [expanded, setExpanded] = useState(false)");
    expect(viewer).toContain('expanded ? "Fit" : "Full size"');
    expect(viewer).toContain('className="study-image-stage-toggle"');
    expect(viewer).toContain('expanded ? "Fit image to window" : "View image at full resolution"');
    expect(viewer).toContain("if (expanded) setExpanded(false)");
    expect(css).toContain(".study-image-lightbox.is-expanded .study-image-stage-toggle > img");
    expect(css).toContain("max-width: none; max-height: none;");
  });

  it("opens day-agenda block details from the entire row", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "study-timetable.tsx"), "utf8");
    const agenda = component.slice(component.indexOf('className="study-day-agenda"'), component.indexOf("{panel.mode === \"details\""));

    expect(agenda).toContain('<button className="study-agenda-block"');
    expect(agenda).toContain('onClick={() => dispatchPanel({ type: "open-details", blockId: block.id, occurrenceDate: activeDay.key })}');
    expect(agenda).not.toContain('<article className="study-agenda-block"');
  });

  it("replaces block details with one deletion dialog and uses the shared scroll lock", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "study-timetable.tsx"), "utf8");

    expect(component).toContain('panel.mode === "details" && panelBlock && !deleteOpen');
    expect(component).toContain("useBodyScrollLock();");
    expect(component).not.toContain('document.body.style.overflow = "hidden"');
  });

  it("keeps the top-three plan at its content height", () => {
    const css = readFileSync(join(process.cwd(), "src", "app", "study-dashboard.css"), "utf8");
    const ruleStart = css.indexOf(".study-plan { grid-column: 2;");
    const rule = css.slice(ruleStart, ruleStart + 120);

    expect(rule).toContain("align-self: start");
    expect(rule).not.toContain("grid-row");
    expect(css).toContain(".study-plan form > footer");
    expect(css).toContain(".study-review-step .study-priority-fields label");
    const planRules = css.slice(css.indexOf(".study-plan { grid-column: 2;"), css.indexOf(".study-search-box"));
    expect(planRules).not.toContain("padding-left: 46px");
  });

  it("keeps weekly review chrome fixed while module signals scroll independently", () => {
    const css = readFileSync(join(process.cwd(), "src", "app", "study-dashboard.css"), "utf8");
    const overlay = css.slice(css.indexOf(".study-sheet-overlay {"), css.indexOf(".study-sheet {"));
    const wideSheet = css.slice(css.lastIndexOf(".study-sheet.wide {", css.indexOf(".study-review-wizard")), css.indexOf(".study-review-wizard"));
    const wizard = css.slice(css.indexOf(".study-review-wizard {"), css.indexOf(".study-review-progress {"));
    const step = css.slice(css.indexOf(".study-review-step {"), css.indexOf(".study-review-step > div:first-child"));

    expect(overlay).not.toContain("backdrop-filter");
    expect(wideSheet).toContain("grid-template-rows: auto minmax(0, 1fr)");
    expect(wideSheet).toContain("width: max(920px, 56vw)");
    expect(wizard).toContain("grid-template-rows: auto minmax(0, 1fr) auto");
    expect(step).toContain("overflow-y: auto");
    expect(step).toContain("overscroll-behavior: contain");
    expect(css).toContain(".study-review-wizard > footer");
  });

  it("opens a full-screen Study writing space with inline formatting and cross-device drafts", () => {
    const dashboard = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");
    const editor = readFileSync(join(process.cwd(), "src", "components", "study-note-editor.tsx"), "utf8");
    const body = readFileSync(join(process.cwd(), "src", "components", "study-rich-note-body.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src", "app", "study-dashboard.css"), "utf8");

    expect(dashboard).toContain('onWriteNote={() => setEditor({ kind: "resource", resourceKind: "NOTE" })}');
    expect(dashboard).toContain("Write note");
    expect(editor).toContain('noteDraftRequest<{ draft: RemoteDraft | null }>(`study/note-drafts${query}`)');
    expect(editor).toContain('noteDraftRequest<{ draft: RemoteDraft }>("study/note-drafts", "PATCH"');
    expect(editor).toContain("Saved across devices");
    expect(editor).toContain("Where should this live?");
    expect(editor).not.toContain("Tags");
    expect(body).toContain('contentType: "markdown"');
    expect(body).toContain("current.getMarkdown()");
    expect(body).toContain("scheduleMarkdownSync(current)");
    expect(body).toContain("MARKDOWN_SYNC_MAX_WAIT_MS");
    expect(body).toContain("onFlushReady?.(flushMarkdown)");
    expect(body).toContain("Mermaid diagram");
    expect(body).toContain("Mermaid and UML syntax help");
    expect(body).toContain("lastLocallyEmittedMarkdownRef");
    expect(body).toContain('"Shift-Tab"');
    expect(body).toContain("Continue writing below");
    expect(body).not.toContain("Preview");
    expect(css).toContain(".study-note-fullscreen");
    expect(css).toContain(".study-mermaid-help");
    expect(css).toContain('.study-rich-document ul[data-type="taskList"] li > label { min-height: 1.72em; display: flex; align-items: center; }');
    expect(css).toContain('.study-rich-document ul[data-type="taskList"] li > div > p:first-child { margin-top: 0; }');
    expect(css).toContain('.study-rich-document ol { list-style-type: decimal; }');
    expect(css).toContain('.study-rich-document ul:not([data-type="taskList"]) { list-style-type: disc; }');
    expect(editor).toContain('role="dialog" aria-modal="true"');
    expect(editor).toContain('inert={filing ? true : undefined}');
    expect(editor).toContain('window.addEventListener("pagehide", preserveLatestDraft)');
    expect(editor).toContain("Choose a Markdown file ending in .md.");
    expect(css).toContain("height: calc(100dvh - 32px)");
    expect(css).toContain("@media (max-width: 700px)");
  });

  it("rolls the same secure rich writing space into Personal notes without module filing", () => {
    const dashboard = readFileSync(join(process.cwd(), "src", "components", "dashboard-app.tsx"), "utf8");
    const editor = readFileSync(join(process.cwd(), "src", "components", "personal-note-editor.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src", "app", "study-dashboard.css"), "utf8");

    expect(dashboard).toContain("<PersonalNoteEditor");
    expect(dashboard).toContain('(activeView === "today" && data.workspace.kind === "PERSONAL")');
    expect(dashboard).toContain('view === "today" ? "Write note"');
    expect(editor).toContain('noteDraftRequest<{ draft: RemoteDraft | null }>(`note-drafts${query}`)');
    expect(editor).toContain('noteDraftRequest<{ draft: RemoteDraft }>("note-drafts", "PATCH"');
    expect(editor).toContain('ariaLabel="Personal note"');
    expect(editor).toContain("full-text search, Telegram, and your other signed-in devices");
    expect(editor).not.toContain("StudyChoicePicker");
    expect(editor).not.toContain("Tags");
    expect(css).toContain(".personal-note-fullscreen");
  });

  it("never treats rich-editor keystrokes as global navigation shortcuts", () => {
    const dashboard = readFileSync(join(process.cwd(), "src", "components", "dashboard-app.tsx"), "utf8");

    expect(dashboard).toContain("target.isContentEditable");
    expect(dashboard).toContain("target.closest(\"[contenteditable='true']\")");
  });

  it("keeps mobile search controls named when their visible labels collapse", () => {
    const personal = readFileSync(join(process.cwd(), "src", "components", "dashboard-app.tsx"), "utf8");
    const study = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");

    expect(personal).toContain('className="tw-search-button" aria-label="Find anything"');
    expect(study).toContain('className="study-search-jump" aria-label="Search this semester"');
  });

  it("pins Study modules persistently with a labelled, stateful control", () => {
    const dashboard = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");
    const types = readFileSync(join(process.cwd(), "src", "lib", "study-types.ts"), "utf8");

    expect(types).toContain("pinnedAt?: string | null");
    expect(dashboard).toContain('{ pinned: !module.pinnedAt }');
    expect(dashboard).toContain('aria-pressed={Boolean(module.pinnedAt)}');
    expect(dashboard).toContain('module.pinnedAt ? `Unpin ${module.code}` : `Pin ${module.code}`');
  });

  it("retires visible note tags while preserving Study note content and modules", () => {
    const dashboard = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");
    const markdown = readFileSync(join(process.cwd(), "src", "lib", "study-markdown.ts"), "utf8");
    const editor = dashboard.slice(dashboard.indexOf("function StudyEditor"));

    expect(editor).not.toContain('name="tags"');
    expect(editor).not.toContain("splitTags");
    expect(markdown).not.toContain("tags:");
  });
});
