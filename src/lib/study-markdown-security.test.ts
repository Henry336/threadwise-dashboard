import { describe, expect, it } from "vitest";
import { markdownImagePolicy } from "./study-markdown-security";

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
});
