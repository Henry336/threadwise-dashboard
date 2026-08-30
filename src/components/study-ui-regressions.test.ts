import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Study UI regressions", () => {
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
    expect(editor).toContain('noteApi<{ draft: RemoteDraft | null }>(`study/note-drafts${query}`)');
    expect(editor).toContain('"study/note-drafts", "PATCH"');
    expect(editor).toContain("Saved across devices");
    expect(editor).toContain("Where should this live?");
    expect(editor).not.toContain("Tags");
    expect(body).toContain('contentType: "markdown"');
    expect(body).toContain("current.getMarkdown()");
    expect(body).toContain("Mermaid diagram");
    expect(body).toContain("Continue writing below");
    expect(body).not.toContain("Preview");
    expect(css).toContain(".study-note-fullscreen");
    expect(css).toContain("height: calc(100dvh - 32px)");
    expect(css).toContain("@media (max-width: 700px)");
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
