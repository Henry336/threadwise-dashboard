import { describe, expect, it } from "vitest";
import { browserDraftKey, clearThreadwiseDrafts, DRAFT_TTL_MS, readBrowserDraft, writeBrowserDraft } from "./browser-drafts";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
}

describe("browser drafts", () => {
  it("scopes drafts to an owner, workspace, resource, and seven-day lifetime", () => {
    const storage = new MemoryStorage();
    const key = browserDraftKey("note", "owner-a", "workspace-a", "note-a");
    writeBrowserDraft(storage, key, "owner-a", "workspace-a", { body: "safe" }, 1_000);

    expect(readBrowserDraft(storage, key, "owner-a", "workspace-a", 1_001)).toEqual({ body: "safe" });
    expect(readBrowserDraft(storage, key, "owner-b", "workspace-a", 1_001)).toBeNull();
  });

  it("deletes expired, malformed, legacy, and previous-workspace drafts", () => {
    const storage = new MemoryStorage();
    const expired = browserDraftKey("note", "owner", "old", "a");
    const current = browserDraftKey("note", "owner", "current", "b");
    writeBrowserDraft(storage, expired, "owner", "old", { body: "expired" }, 1_000);
    writeBrowserDraft(storage, current, "owner", "current", { body: "keep" }, 1_000);
    storage.setItem("threadwise-study-note-draft-old-a", "legacy");

    expect(readBrowserDraft(storage, expired, "owner", "old", 1_000 + DRAFT_TTL_MS + 1)).toBeNull();
    expect(clearThreadwiseDrafts(storage, "current")).toBe(1);
    expect(readBrowserDraft(storage, current, "owner", "current", 1_001)).toEqual({ body: "keep" });
  });
});
