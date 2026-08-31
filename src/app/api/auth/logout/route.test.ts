import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { revokeBrowserSession } = vi.hoisted(() => ({
  revokeBrowserSession: vi.fn(async () => undefined),
}));
vi.mock("../../../../lib/browser-session-registry", () => ({
  browserSessionIsActive: vi.fn(async () => true),
  revokeBrowserSession,
}));

import { createSessionToken, SESSION_COOKIE } from "../../../../lib/auth";
import { POST } from "./route";

const sessionId = "0c68a350-c061-4a86-a63f-842c132dc77d";

describe("dashboard logout", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "phase2-logout-test-secret-with-enough-entropy";
    process.env.NEXT_PUBLIC_APP_URL = "https://dashboard.example.test";
    revokeBrowserSession.mockClear();
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("revokes the exact server session before removing its local cookie", async () => {
    const token = createSessionToken({
      sessionId,
      telegramId: "123456789",
      firstName: "A",
      fullName: "A",
    }, Date.now() + 3_600_000);
    const request = new NextRequest("https://dashboard.example.test/api/auth/logout", {
      method: "POST",
      headers: {
        origin: "https://dashboard.example.test",
        cookie: `${SESSION_COOKIE}=${token}`,
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(revokeBrowserSession).toHaveBeenCalledWith("123456789", sessionId);
    expect(response.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=`);
    expect(response.headers.get("set-cookie")).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });

  it("rejects cross-origin logout without revoking anything", async () => {
    const response = await POST(new NextRequest("https://dashboard.example.test/api/auth/logout", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    }));
    expect(response.status).toBe(403);
    expect(revokeBrowserSession).not.toHaveBeenCalled();
  });

  it("does not pretend logout succeeded when server-side revocation is unavailable", async () => {
    revokeBrowserSession.mockRejectedValueOnce(new Error("registry unavailable"));
    const token = createSessionToken({
      sessionId,
      telegramId: "123456789",
      firstName: "A",
      fullName: "A",
    }, Date.now() + 3_600_000);
    const response = await POST(new NextRequest("https://dashboard.example.test/api/auth/logout", {
      method: "POST",
      headers: {
        origin: "https://dashboard.example.test",
        cookie: `${SESSION_COOKIE}=${token}`,
      },
    }));
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
