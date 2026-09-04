import { describe, expect, it } from "vitest";
import {
  MERMAID_MAX_CHARACTERS,
  MERMAID_MAX_LINES,
  MERMAID_MAX_STATEMENTS,
  getMermaidDiagramInfo,
  mermaidRenderConfiguration,
  normalizeMermaidSource,
  setMermaidLayout,
  validateMermaidSource,
  withTimeout,
} from "./study-mermaid";

describe("Mermaid rendering budgets", () => {
  it("accepts a small ordinary diagram", () => {
    expect(validateMermaidSource("graph LR\nA-->B")).toEqual({ valid: true });
  });

  it("rejects oversized and configuration-bearing diagrams before loading Mermaid", () => {
    expect(validateMermaidSource("x".repeat(MERMAID_MAX_CHARACTERS + 1))).toMatchObject({ valid: false });
    expect(validateMermaidSource(Array.from({ length: MERMAID_MAX_LINES + 1 }, () => "A").join("\n"))).toMatchObject({ valid: false });
    expect(validateMermaidSource("%%{init: { 'theme': 'forest' }}%%\ngraph LR\nA-->B")).toMatchObject({ valid: false });
  });

  it("rejects statement exhaustion and bounds hung render work", async () => {
    expect(validateMermaidSource(Array.from({ length: MERMAID_MAX_STATEMENTS + 1 }, () => "A-->B").join(";")))
      .toMatchObject({ valid: false });
    await expect(withTimeout(new Promise<never>(() => undefined), 5)).rejects.toThrow("timed out");
  });

  it("keeps strict SVG rendering while requiring native text labels", () => {
    expect(mermaidRenderConfiguration("dark")).toMatchObject({
      securityLevel: "strict",
      theme: "dark",
      htmlLabels: false,
      flowchart: { htmlLabels: false },
    });
  });
});

describe("Threadwise Mermaid easy syntax", () => {
  it("normalizes class headers, members, and deterministic relationships", () => {
    const input = [
      "%% a portable Mermaid comment",
      "uml class",
      "  class Note {",
      "    public title: String",
      "    private save(): void",
      "  }",
      "  Note extends Resource",
      "  Note implements Searchable",
      "  Module contains Note",
      "  Workspace has Module",
      "  Note uses Index",
    ].join("\n");
    const result = normalizeMermaidSource(input);
    expect(result.issues).toEqual([]);
    expect(result.source).toContain("classDiagram");
    expect(result.source).toContain("+String title");
    expect(result.source).toContain("-save() void");
    expect(result.source).toContain("Resource <|-- Note");
    expect(result.source).toContain("Searchable <|.. Note");
    expect(result.source).toContain("Module *-- Note");
    expect(result.source).toContain("Workspace o-- Module");
    expect(result.source).toContain("Note ..> Index");
    expect(result.source).toContain("%% a portable Mermaid comment");
  });

  it("normalizes sequence and state aliases without guessing malformed lines", () => {
    expect(normalizeMermaidSource("uml sequence\n  Student sends API: Save\n  API replies Student: OK").source)
      .toBe("sequenceDiagram\n  Student->>API: Save\n  API-->>Student: OK");
    expect(normalizeMermaidSource("uml state\n  start -> Draft\n  Draft -> Saved: autosave\n  Saved -> end").source)
      .toBe("stateDiagram-v2\n  [*] --> Draft\n  Draft --> Saved : autosave\n  Saved --> [*]");

    const malformed = normalizeMermaidSource("uml class\n  Note extends a complicated parent");
    expect(malformed.source).toContain("Note extends a complicated parent");
    expect(malformed.issues).toEqual([{ line: 2, message: expect.stringContaining("simple class names") }]);
  });

  it("leaves official syntax, quoted labels, and unrelated prose unchanged", () => {
    const source = "flowchart LR\n  A[\"Has punctuation: yes\"] --> B[Done]\n  %% users has context";
    expect(normalizeMermaidSource(source)).toEqual({ source, changed: false, issues: [] });
  });
});

describe("Mermaid layout controls", () => {
  it("detects and rewrites supported flowchart layouts", () => {
    expect(getMermaidDiagramInfo("flow\n  A --> B")).toMatchObject({ label: "Flowchart", layout: "vertical", layoutSupported: true });
    expect(setMermaidLayout("flow\n  A --> B", "horizontal")).toBe("flowchart LR\n  A --> B");
    expect(setMermaidLayout("flowchart RL\n  A --> B", "default")).toBe("flowchart TD\n  A --> B");
  });

  it("adds, replaces, and removes class or state direction lines", () => {
    const source = "classDiagram\n  class Note";
    expect(setMermaidLayout(source, "horizontal")).toBe("classDiagram\n  direction LR\n  class Note");
    expect(setMermaidLayout(setMermaidLayout(source, "horizontal"), "vertical")).toContain("direction TB");
    expect(setMermaidLayout(setMermaidLayout(source, "horizontal"), "default")).toBe(source);
    expect(getMermaidDiagramInfo("stateDiagram-v2\n direction LR\n A --> B")).toMatchObject({ label: "State diagram", layout: "horizontal" });
  });

  it("does not expose ineffective orientation for sequence or unsupported diagrams", () => {
    expect(getMermaidDiagramInfo("sequenceDiagram\n A->>B: Hi")).toMatchObject({ label: "Sequence diagram", layout: null, layoutSupported: false });
    expect(getMermaidDiagramInfo("erDiagram\n A ||--o{ B : has")).toMatchObject({ label: "Mermaid diagram", layoutSupported: false });
  });
});
