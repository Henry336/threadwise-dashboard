import { describe, expect, it } from "vitest";
import { buildMarkdownExport, markdownExcerpt, markdownWithThreadwiseLinks, normalizeMarkdownWikiTarget, parseMarkdownFile, safeMarkdownFileName } from "./study-markdown";

describe("Study Markdown utilities", () => {
  it("converts wiki links outside code fences into Threadwise note links", () => {
    const source = "See [[Cache|cache behaviour]].\n```ts\nconst raw = '[[Not a link]]';\n```";
    const converted = markdownWithThreadwiseLinks(source);
    expect(converted).toContain("[cache behaviour](threadwise-note:Cache)");
    expect(converted).toContain("[[Not a link]]");
    expect(markdownWithThreadwiseLinks("`[[Inline sample]]` and [[Real note]]"))
      .toContain("`[[Inline sample]]` and [Real note](threadwise-note:Real%20note)");
    expect(normalizeMarkdownWikiTarget("  Real   Note ")).toBe("real note");
  });

  it("creates readable card excerpts without exposing diagram source", () => {
    expect(markdownExcerpt("# Pipeline\n```mermaid\ngraph LR\nA-->B\n```\n- **Cache** notes"))
      .toBe("Pipeline Diagram. Cache notes");
  });

  it("imports portable Markdown without restoring retired tags", () => {
    const imported = parseMarkdownFile("fallback.md", "---\ntitle: \"Cache notes\"\ntags: [cs2100, revision]\n---\n# Body\nText");
    expect(imported).toEqual({ title: "Cache notes", body: "# Body\nText" });
    const exported = buildMarkdownExport({ title: imported.title, body: imported.body, moduleCode: "CS2100", publicId: "SNOTE-1" });
    expect(exported).toContain('threadwise_id: "SNOTE-1"');
    expect(exported).not.toContain("tags:");
    expect(exported).toContain("# Body\nText\n");
    expect(safeMarkdownFileName('Cache: "notes"')).toBe("Cache notes.md");
  });
});
