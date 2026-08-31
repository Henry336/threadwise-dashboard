import { describe, expect, it } from "vitest";
import { indentationRemovalWidth, selectedLineStarts } from "./study-editor-indentation";

describe("Study editor Tab indentation", () => {
  const source = "flowchart TD\n  A --> B\n    B --> C";

  it("finds the current line and every fully or partly selected line", () => {
    expect(selectedLineStarts(source, 2, 2)).toEqual([0]);
    expect(selectedLineStarts(source, 15, source.length)).toEqual([13, 23]);
  });

  it("does not include a line when a selection ends exactly at its start", () => {
    expect(selectedLineStarts(source, 0, 13)).toEqual([0]);
  });

  it("removes one tab or at most one two-space indentation level", () => {
    expect(indentationRemovalWidth("\tA", 0)).toBe(1);
    expect(indentationRemovalWidth("    A", 0)).toBe(2);
    expect(indentationRemovalWidth(" A", 0)).toBe(1);
    expect(indentationRemovalWidth("A", 0)).toBe(0);
  });
});
