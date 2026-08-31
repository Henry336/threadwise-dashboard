import { describe, expect, it } from "vitest";
import { validateMermaidSource } from "./study-mermaid";
import { MERMAID_SYNTAX_SECTIONS, MERMAID_TEMPLATES } from "./study-mermaid-templates";

describe("Study Mermaid and UML guide", () => {
  it("offers bounded, unique, insertable examples", () => {
    expect(new Set(MERMAID_TEMPLATES.map((template) => template.id)).size).toBe(MERMAID_TEMPLATES.length);
    expect(MERMAID_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    for (const template of MERMAID_TEMPLATES) {
      expect(validateMermaidSource(template.source)).toEqual({ valid: true });
      expect(template.source).not.toContain("%%{");
      expect(template.source.toLowerCase()).not.toContain("@startuml");
      expect(template.docsUrl).toMatch(/^https:\/\/mermaid\.js\.org\/syntax\//u);
    }
  });

  it("covers Mermaid UML class, sequence, and state notation", () => {
    const uml = MERMAID_TEMPLATES.filter((template) => template.family === "UML");
    expect(uml.map((template) => template.id)).toEqual(expect.arrayContaining(["class-uml", "sequence-uml", "state-uml"]));
    expect(uml.map((template) => template.source.split("\n")[0])).toEqual(expect.arrayContaining(["classDiagram", "sequenceDiagram", "stateDiagram-v2"]));
  });

  it("provides a substantial searchable quick reference", () => {
    expect(MERMAID_SYNTAX_SECTIONS.flatMap((section) => section.entries).length).toBeGreaterThanOrEqual(30);
  });
});
