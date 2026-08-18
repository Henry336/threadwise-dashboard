import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, verifySessionToken } from "./auth";

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
    const token = createSessionToken({ telegramId: "123456789", firstName: "A", fullName: "A" });
    expect(verifySessionToken(token)).toMatchObject({ telegramId: "123456789" });
    expect(verifySessionToken(`${token.slice(0, -1)}x`)).toBeNull();
  });

  it("rejects expired, malformed, and unsigned sessions", () => {
    const token = createSessionToken({ telegramId: "123456789", firstName: "A", fullName: "A" });
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1_000);
    expect(verifySessionToken(token)).toBeNull();
    expect(verifySessionToken("not-a-token")).toBeNull();
    expect(verifySessionToken()).toBeNull();
  });
});
