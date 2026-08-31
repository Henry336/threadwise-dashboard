import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, verifySessionToken } from "./auth";

vi.mock("./browser-session-registry", () => ({ browserSessionIsActive: vi.fn(async () => true) }));

const session = {
  sessionId: "0c68a350-c061-4a86-a63f-842c132dc77d",
  telegramId: "123456789",
  firstName: "A",
  fullName: "A",
};

describe("dashboard browser session authentication", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "phase6-synthetic-auth-secret-with-enough-entropy";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.AUTH_SECRET;
  });

  it("accepts an untampered session and fails closed on signature changes", () => {
    const token = createSessionToken(session, Date.now() + 7 * 24 * 60 * 60 * 1_000);
    expect(verifySessionToken(token)).toMatchObject({ telegramId: "123456789" });
    expect(verifySessionToken(`${token.slice(0, -1)}x`)).toBeNull();
  });

  it("rejects expired, malformed, and unsigned sessions", () => {
    const token = createSessionToken(session, Date.now() + 7 * 24 * 60 * 60 * 1_000);
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1_000);
    expect(verifySessionToken(token)).toBeNull();
    expect(verifySessionToken("not-a-token")).toBeNull();
    expect(verifySessionToken()).toBeNull();
  });

  it("rejects a correctly signed legacy cookie that has no revocable session id", () => {
    const payload = Buffer.from(JSON.stringify({
      telegramId: "123456789",
      firstName: "A",
      fullName: "A",
      expiresAt: Date.now() + 3_600_000,
    })).toString("base64url");
    const provided = createHmac("sha256", process.env.AUTH_SECRET!).update(payload).digest("base64url");
    expect(verifySessionToken(`${payload}.${provided}`)).toBeNull();
  });
});
