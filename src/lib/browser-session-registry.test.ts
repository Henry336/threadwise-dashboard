import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./threadwise-api", () => ({ createServiceToken: vi.fn(async () => "signed-service-token") }));

import { browserSessionIsActive, registerBrowserSession, revokeBrowserSession } from "./browser-session-registry";

const sessionId = "0c68a350-c061-4a86-a63f-842c132dc77d";

describe("browser session registry client", () => {
  beforeEach(() => {
    process.env.THREADWISE_API_URL = "https://api.example.test";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("registers a bounded server session without exposing credentials to the browser", async () => {
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ session: { id: sessionId, expiresAt } }), { status: 200 }));
    await expect(registerBrowserSession("123456789")).resolves.toMatchObject({ id: sessionId });
    expect(fetch).toHaveBeenCalledWith("https://api.example.test/api/v1/dashboard/browser-sessions", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ ttlSeconds: 604_800 }),
      headers: expect.objectContaining({ Authorization: "Bearer signed-service-token" }),
    }));
  });

  it("fails closed when a session is revoked, expired, malformed, or the registry is unavailable", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "session_inactive" }), { status: 401 }));
    await expect(browserSessionIsActive("123456789", sessionId)).resolves.toBe(false);
    await expect(browserSessionIsActive("123456789", "malformed")).resolves.toBe(false);
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));
    await expect(browserSessionIsActive("123456789", sessionId)).resolves.toBe(false);
  });

  it("revokes the signed owner's exact session", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ revoked: true }), { status: 200 }));
    await expect(revokeBrowserSession("123456789", sessionId)).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(`https://api.example.test/api/v1/dashboard/browser-sessions/${sessionId}`, expect.objectContaining({ method: "DELETE" }));
  });

  it("does not claim logout succeeded when upstream rejected revocation", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }));
    await expect(revokeBrowserSession("123456789", sessionId)).rejects.toThrow(
      "Threadwise could not revoke the browser session.",
    );
  });
});
