import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { MERMAID_TEMPLATES } from "../src/lib/study-mermaid-templates";

test("the installed browser renderer parses every Mermaid and UML guide example", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "The parser contract is viewport-independent.");
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: resolve(process.cwd(), "node_modules", "mermaid", "dist", "mermaid.min.js") });

  const failures = await page.evaluate(async (templates) => {
    const mermaid = (globalThis as unknown as {
      mermaid: { initialize: (configuration: object) => void; parse: (source: string) => Promise<unknown> };
    }).mermaid;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
    const invalid: Array<{ name: string; message: string }> = [];
    for (const template of templates) {
      try { await mermaid.parse(template.source); }
      catch (error) { invalid.push({ name: template.name, message: error instanceof Error ? error.message : String(error) }); }
    }
    return invalid;
  }, MERMAID_TEMPLATES.map(({ name, source }) => ({ name, source })));

  expect(failures).toEqual([]);
});
