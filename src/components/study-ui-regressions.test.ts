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

  it("opens day-agenda block details from the entire row", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "study-timetable.tsx"), "utf8");
    const agenda = component.slice(component.indexOf('className="study-day-agenda"'), component.indexOf("{panel.mode === \"details\""));

    expect(agenda).toContain('<button className="study-agenda-block"');
    expect(agenda).toContain('onClick={() => dispatchPanel({ type: "open-details", blockId: block.id })}');
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
});
