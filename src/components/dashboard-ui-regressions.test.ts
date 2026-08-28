import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard UI regressions", () => {
  it("keeps an empty exact-reminder editor compact in every shared task flow", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "dashboard-app.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

    expect(component).toContain('className="tw-task-reminders"');
    expect(component).toContain('rows.length > 0 && <div className="tw-task-reminder-list"');
    expect(component).not.toContain('<fieldset className="tw-task-reminders">');
    expect(component).not.toContain("Times use your Threadwise timezone");
    expect(css).toContain(".tw-task-reminder-list {");
    expect(css).not.toContain(".tw-task-reminders legend");
  });

  it("explains personal reminder schedules without stretching adjacent inputs", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "dashboard-app.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
    const reminders = component.slice(component.indexOf('{tab === "reminders"'), component.indexOf('{tab === "connections"'));

    expect(reminders).not.toContain("Helpful, never noisy");
    expect(reminders).not.toContain("Default rhythm");
    expect(reminders).not.toContain("Due-nudge interval");
    expect(reminders).toContain("Regular follow-up frequency");
    expect(reminders).toContain("Deadline warning interval");
    expect(reminders).toContain("Daily limit for regular reminders");
    expect(css).toContain(".tw-settings-panel .tw-form-row { align-items: start; }");
    expect(css).toContain("align-content: start; display: grid");
  });

  it("keeps the personal quote library in the existing Settings and Overview flow", () => {
    const component = readFileSync(join(process.cwd(), "src", "components", "dashboard-app.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

    expect(component).toContain("Overview quotes");
    expect(component).toContain("Add quote");
    expect(component).toContain("overviewQuotes={data.settings.overviewQuotes}");
    expect(component).toContain("dailyOverviewLine(now, timezone, overviewQuotes)");
    expect(css).toContain(".tw-quote-manager {");
    expect(css).toContain(".tw-quote-composer {");
  });

  it("uses one progressive Today planner across Personal, Group, and Study", () => {
    const planner = readFileSync(join(process.cwd(), "src", "components", "today-planner.tsx"), "utf8");
    const dashboard = readFileSync(join(process.cwd(), "src", "components", "dashboard-app.tsx"), "utf8");
    const study = readFileSync(join(process.cwd(), "src", "components", "study-dashboard.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

    expect(dashboard).toContain("<TodayPlanner");
    expect(study).toContain('<TodayPlanner variant="study"');
    expect(planner).toContain("Nothing is saved until you approve the whole list.");
    expect(planner).toContain("Add more");
    expect(planner).toContain("No reminders were created.");
    expect(planner).toContain('title="Carryover"');
    expect(planner).toContain('title="Deadline watch"');
    expect(css).toContain(".today-agenda-grid");
    expect(css).toContain("@media (max-width: 600px)");
  });

  it("keeps private daily briefing consent in personal Reminder settings", () => {
    const dashboard = readFileSync(join(process.cwd(), "src", "components", "dashboard-app.tsx"), "utf8");
    const picker = readFileSync(join(process.cwd(), "src", "components", "study-choice-picker.tsx"), "utf8");
    const planner = readFileSync(join(process.cwd(), "src", "components", "today-planner.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
    expect(dashboard).toContain("Daily briefings");
    expect(dashboard).toContain("Morning plan");
    expect(dashboard).toContain("Evening wrap-up");
    expect(dashboard).toContain("assigned Group work, and Study work");
    expect(dashboard).toContain("delete payload.morningBriefEnabled");
    expect(dashboard).toContain('<StudyTimePicker label="Morning delivery time"');
    expect(dashboard).toContain('<StudyTimePicker label="Evening delivery time"');
    expect(picker).toContain('aria-label={`${label}: ${selected?.label ?? placeholder}`}');
    expect(css).toContain("@media (max-width: 640px) { .tw-briefing-row { grid-template-columns: 1fr; }");
    expect(planner).toContain('new URLSearchParams(window.location.search).get("draft")');
    expect(planner).toContain('`task-drafts/${encodeURIComponent(draftId)}`');
  });
});
