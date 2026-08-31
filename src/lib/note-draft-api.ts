export class NoteDraftApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "NoteDraftApiError";
  }
}

export async function noteDraftRequest<T>(path: string, method = "GET", body?: unknown, keepalive = false): Promise<T> {
  const response = await fetch(`/api/threadwise/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    keepalive,
    headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const value = payload as { message?: string; error?: string };
    throw new NoteDraftApiError(value.message || "Threadwise could not save this note.", value.error);
  }
  return payload as T;
}
