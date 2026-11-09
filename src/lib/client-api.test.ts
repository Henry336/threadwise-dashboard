import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ClientApiError } from "./client-api";

function respond(status: number, body: string, contentType: string) {
  const fetchMock = vi.fn(async () => new Response(body, { status, headers: { "content-type": contentType } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function failure(promise: Promise<unknown>) {
  try { await promise; } catch (error) { return error as ClientApiError; }
  throw new Error("expected the call to fail");
}

describe("browser api client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns parsed JSON and sends a same-origin, uncached JSON request", async () => {
    const fetchMock = respond(200, JSON.stringify({ ok: true }), "application/json");
    await expect(api("tasks/1", "PATCH", { title: "A" }, { keepalive: true })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/threadwise/tasks/1", expect.objectContaining({
      method: "PATCH", credentials: "same-origin", cache: "no-store", keepalive: true, body: JSON.stringify({ title: "A" }),
    }));
  });

  it("keeps the backend error code and status for conflict handling", async () => {
    respond(409, JSON.stringify({ error: "revision_conflict", message: "Another device saved first." }), "application/json");
    const error = await failure(api("note-drafts", "PATCH", {}));
    expect(error).toBeInstanceOf(ClientApiError);
    expect(error).toMatchObject({ status: 409, code: "revision_conflict", message: "Another device saved first." });
  });

  it("turns an HTML error page into a friendly message instead of a JSON parse error", async () => {
    respond(502, "<html><body>Bad gateway</body></html>", "text/html");
    expect(await failure(api("snapshot"))).toMatchObject({ status: 502, code: "request_failed", message: "That action could not be completed." });
  });

  it("survives a malformed JSON error body", async () => {
    respond(500, "{not json", "application/json");
    expect(await failure(api("snapshot"))).toMatchObject({ status: 500, code: "request_failed" });
  });
});
