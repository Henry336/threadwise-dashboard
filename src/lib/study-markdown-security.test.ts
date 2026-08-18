import { describe, expect, it } from "vitest";
import { markdownImagePolicy, safeMarkdownLink } from "./study-markdown-security";

describe("Markdown image privacy", () => {
  const origin = "https://threadwise.example";

  it("loads same-origin images without a network-consent prompt", () => {
    expect(markdownImagePolicy("/api/threadwise/study/images/a", origin)).toBe("same-origin");
    expect(markdownImagePolicy("https://threadwise.example/assets/a.png", origin)).toBe("same-origin");
  });

  it("requires consent for remote HTTPS and blocks insecure or embedded payloads", () => {
    expect(markdownImagePolicy("https://images.example/note.png", origin)).toBe("remote");
    expect(markdownImagePolicy("http://images.example/note.png", origin)).toBe("blocked");
    expect(markdownImagePolicy("data:image/png;base64,AAAA", origin)).toBe("blocked");
    expect(markdownImagePolicy("//images.example/note.png", origin)).toBe("blocked");
  });

  it("blocks executable and embedded link protocols", () => {
    expect(safeMarkdownLink("javascript:alert(1)")).toBe("");
    expect(safeMarkdownLink("data:text/html,<script>alert(1)</script>")).toBe("");
    expect(safeMarkdownLink("file:///etc/passwd")).toBe("");
    expect(safeMarkdownLink("https://docs.example/note")).toBe("https://docs.example/note");
    expect(safeMarkdownLink("mailto:student@example.com")).toBe("mailto:student@example.com");
    expect(safeMarkdownLink("/study/resources/one")).toBe("/study/resources/one");
  });
});
