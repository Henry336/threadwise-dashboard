import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { mermaidRenderConfiguration } from "../src/lib/study-mermaid";
import { MERMAID_TEMPLATES } from "../src/lib/study-mermaid-templates";

const EXPECTED_LABELS: Record<string, string[]> = {
  flowchart: ["Capture note", "Ready to file?"],
  "sequence-uml": ["Student", "Save note"],
  "class-uml": ["Note", "title", "contains"],
  "state-uml": ["Draft", "Saved"],
  "entity-relationship": ["USER", "title"],
  mindmap: ["Exam plan", "Topics"],
  gantt: ["Project plan", "Read sources"],
  timeline: ["Module milestones", "Choose topic"],
  journey: ["Filing a study note", "Write freely"],
  pie: ["Reading", "Practice"],
  "git-graph": ["Draft", "Add diagram"],
  quadrant: ["Task priority", "Quick wins"],
};

test("the installed browser renderer preserves visible text in every Mermaid and UML guide example", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "The parser contract is viewport-independent.");
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: resolve(process.cwd(), "node_modules", "mermaid", "dist", "mermaid.min.js") });
  await page.addScriptTag({ path: resolve(process.cwd(), "node_modules", "dompurify", "dist", "purify.min.js") });

  const failures = await page.evaluate(async ({ templates, configuration, expectedLabels }) => {
    const mermaid = (globalThis as unknown as {
      mermaid: { initialize: (configuration: object) => void; render: (id: string, source: string) => Promise<{ svg: string }> };
    }).mermaid;
    const purifier = (globalThis as unknown as { DOMPurify: { sanitize: (source: string, configuration: object) => string } }).DOMPurify;
    mermaid.initialize(configuration);
    const invalid: Array<{ name: string; message: string }> = [];
    for (const [index, template] of templates.entries()) {
      try {
        const rendered = await mermaid.render(`template-${index}`, template.source);
        const sanitized = purifier.sanitize(rendered.svg, { USE_PROFILES: { svg: true, svgFilters: true } });
        const document = new DOMParser().parseFromString(sanitized, "image/svg+xml");
        const visibleText = (document.documentElement.textContent ?? "").replace(/\s+/gu, " ");
        const missing = expectedLabels[template.id].filter((label: string) => !visibleText.includes(label));
        if (missing.length) invalid.push({ name: template.name, message: `Missing visible labels: ${missing.join(", ")}` });
      }
      catch (error) { invalid.push({ name: template.name, message: error instanceof Error ? error.message : String(error) }); }
    }
    return invalid;
  }, {
    templates: MERMAID_TEMPLATES.map(({ id, name, source }) => ({ id, name, source })),
    configuration: mermaidRenderConfiguration("neutral"),
    expectedLabels: EXPECTED_LABELS,
  });

  expect(failures).toEqual([]);
});

test("class UML labels remain native SVG text after strict sanitization in both themes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "The renderer contract is viewport-independent.");
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: resolve(process.cwd(), "node_modules", "mermaid", "dist", "mermaid.min.js") });
  await page.addScriptTag({ path: resolve(process.cwd(), "node_modules", "dompurify", "dist", "purify.min.js") });
  const source = MERMAID_TEMPLATES.find((template) => template.id === "class-uml")?.source ?? "";

  for (const theme of ["neutral", "dark"] as const) {
    const result = await page.evaluate(async ({ configuration, source: diagramSource, themeName }) => {
      const mermaid = (globalThis as unknown as { mermaid: { initialize: (configuration: object) => void; render: (id: string, source: string) => Promise<{ svg: string }> } }).mermaid;
      const purifier = (globalThis as unknown as { DOMPurify: { sanitize: (source: string, configuration: object) => string } }).DOMPurify;
      mermaid.initialize(configuration);
      const rendered = await mermaid.render(`class-${themeName}`, diagramSource);
      const sanitized = purifier.sanitize(rendered.svg, { USE_PROFILES: { svg: true, svgFilters: true } });
      const document = new DOMParser().parseFromString(sanitized, "image/svg+xml");
      return {
        text: (document.documentElement.textContent ?? "").replace(/\s+/gu, " "),
        textNodes: document.querySelectorAll("text").length,
        foreignObjects: document.querySelectorAll("foreignObject").length,
      };
    }, { configuration: mermaidRenderConfiguration(theme), source, themeName: theme });
    expect(result.foreignObjects).toBe(0);
    expect(result.textNodes).toBeGreaterThan(0);
    expect(result.text).toContain("Note");
    expect(result.text).toContain("title");
    expect(result.text).toContain("contains");
  }
});
