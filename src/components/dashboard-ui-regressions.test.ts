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
});
