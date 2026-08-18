const DRAFT_PREFIX = "threadwise:draft:v2:";
const LEGACY_DRAFT_PREFIXES = ["threadwise-study-note-draft-", "threadwise-study-review-"];
export const DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

type DraftEnvelope<T> = {
  version: 2;
  ownerId: string;
  workspaceId: string;
  savedAt: number;
  value: T;
};

export function browserDraftKey(kind: string, ownerId: string, workspaceId: string, resourceId: string): string {
  return `${DRAFT_PREFIX}${encodeURIComponent(kind)}:${encodeURIComponent(ownerId)}:${encodeURIComponent(workspaceId)}:${encodeURIComponent(resourceId)}`;
}

export function readBrowserDraft<T>(storage: StorageLike, key: string, ownerId: string, workspaceId: string, now = Date.now()): T | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope<T>>;
    if (
      parsed.version !== 2
      || parsed.ownerId !== ownerId
      || parsed.workspaceId !== workspaceId
      || typeof parsed.savedAt !== "number"
      || parsed.savedAt > now + 60_000
      || now - parsed.savedAt > DRAFT_TTL_MS
      || parsed.value === undefined
    ) {
      storage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    try { storage.removeItem(key); } catch { /* Storage may be unavailable. */ }
    return null;
  }
}

export function writeBrowserDraft<T>(storage: StorageLike, key: string, ownerId: string, workspaceId: string, value: T, now = Date.now()): void {
  const envelope: DraftEnvelope<T> = { version: 2, ownerId, workspaceId, savedAt: now, value };
  storage.setItem(key, JSON.stringify(envelope));
}

export function clearBrowserDraft(storage: StorageLike, key: string): void {
  storage.removeItem(key);
}

export function clearThreadwiseDrafts(storage: StorageLike, keepWorkspaceId?: string): number {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && (key.startsWith(DRAFT_PREFIX) || LEGACY_DRAFT_PREFIXES.some((prefix) => key.startsWith(prefix)))) keys.push(key);
  }
  let removed = 0;
  for (const key of keys) {
    if (keepWorkspaceId && key.startsWith(DRAFT_PREFIX)) {
      try {
        const parsed = JSON.parse(storage.getItem(key) ?? "null") as Partial<DraftEnvelope<unknown>> | null;
        if (parsed?.version === 2 && parsed.workspaceId === keepWorkspaceId) continue;
      } catch { /* Invalid draft records should be removed. */ }
    }
    storage.removeItem(key);
    removed += 1;
  }
  return removed;
}
