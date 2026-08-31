import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(name: string): string {
  return readFileSync(resolve(process.cwd(), "src", "components", name), "utf8");
}

function lineCount(value: string): number {
  return value.split(/\r?\n/u).length;
}

describe("Study component boundaries", () => {
  it("keeps the shell separate from Deep Work and shared dialog behavior", () => {
    const shell = source("study-dashboard.tsx");
    const deepWork = source("study-deep-work.tsx");
    const dialog = source("study-dialog.tsx");

    expect(shell).toContain('import { StudyDeepWork } from "./study-deep-work"');
    expect(shell).toContain('import { StudyDialog } from "./study-dialog"');
    expect(shell).not.toContain("function StudyModuleAnalysisPanel");
    expect(deepWork).toContain("export function StudyDeepWork");
    expect(deepWork).toContain("function StudyModuleAnalysisPanel");
    expect(dialog).toContain("export function StudyDialog");
    expect(lineCount(shell)).toBeLessThanOrEqual(1_000);
    expect(lineCount(deepWork)).toBeLessThanOrEqual(500);
  });
});
