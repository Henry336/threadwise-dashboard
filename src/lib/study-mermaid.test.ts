import { describe, expect, it } from "vitest";
import { MERMAID_MAX_CHARACTERS, MERMAID_MAX_LINES, validateMermaidSource } from "./study-mermaid";

describe("Mermaid rendering budgets", () => {
  it("accepts a small ordinary diagram", () => {
    expect(validateMermaidSource("graph LR\nA-->B")).toEqual({ valid: true });
  });

  it("rejects oversized and configuration-bearing diagrams before loading Mermaid", () => {
    expect(validateMermaidSource("x".repeat(MERMAID_MAX_CHARACTERS + 1))).toMatchObject({ valid: false });
    expect(validateMermaidSource(Array.from({ length: MERMAID_MAX_LINES + 1 }, () => "A").join("\n"))).toMatchObject({ valid: false });
    expect(validateMermaidSource("%%{init: { 'theme': 'forest' }}%%\ngraph LR\nA-->B")).toMatchObject({ valid: false });
  });
});
