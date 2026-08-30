import { describe, expect, it, vi } from "vitest";
import { MarkdownManager } from "@tiptap/markdown";

vi.mock("./study-markdown-media", () => ({ MarkdownImage: () => null, MermaidDiagram: () => null }));

import { studyRichNoteExtensions } from "./study-rich-note-body";

describe("Study rich-note Markdown contract", () => {
  it("round-trips the supported portable formatting and Mermaid source", () => {
    const manager = new MarkdownManager({ extensions: studyRichNoteExtensions });
    const source = [
      "## Systems",
      "",
      "**Bold**, *italic*, and ++underlined++ with `inline code`.",
      "",
      "- [ ] Revisit the proof",
      "",
      "![Architecture](https://example.com/architecture.png)",
      "",
      "```mermaid",
      "flowchart TD",
      "  A[Start] --> B[Finish]",
      "```",
    ].join("\n");

    const output = manager.serialize(manager.parse(source));
    expect(output).toContain("## Systems");
    expect(output).toContain("**Bold**");
    expect(output).toContain("*italic*");
    expect(output).toContain("++underlined++");
    expect(output).toContain("- [ ] Revisit the proof");
    expect(output).toContain("![Architecture](https://example.com/architecture.png)");
    expect(output).toContain("```mermaid");
    expect(output).toContain("A[Start] --> B[Finish]");

    const unsafe = manager.serialize(manager.parse("[unsafe](javascript:alert(1))"));
    expect(unsafe).not.toContain("javascript:");
  });
});
