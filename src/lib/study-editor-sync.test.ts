import { describe, expect, it } from "vitest";
import { shouldReplaceEditorDocument } from "./study-editor-sync";

describe("Study rich-editor synchronization", () => {
  it("does not replace locally emitted Markdown after a parent render", () => {
    expect(shouldReplaceEditorDocument("Typed locally", "Typed locally", "Normalized locally")).toBe(false);
  });

  it("applies a genuinely newer external document", () => {
    expect(shouldReplaceEditorDocument("Newer device copy", "Typed locally", "Typed locally")).toBe(true);
  });

  it("does not replace content the editor already holds", () => {
    expect(shouldReplaceEditorDocument("Already current", "Older local copy", "Already current")).toBe(false);
  });
});
