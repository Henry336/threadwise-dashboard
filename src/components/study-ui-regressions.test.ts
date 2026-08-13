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

    expect(component).toContain("<b>{block.label}</b><span>{block.module?.code ?? block.blockType}</span>");
    expect(component).toContain('density === "narrow" ? <b>{block.label}</b>');
    expect(component).toContain("<b>{item.title}</b><span>{item.module.code}</span>");
    expect(component).not.toContain("shortBlockLabel");
  });
});
