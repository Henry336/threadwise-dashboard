import { describe, expect, it } from "vitest";
import { miniAppRedirect } from "./telegram-start-param";

const workspace = "6cd8f63005f448c0b7fbffacbc4ff1a2";

describe("Find a time Mini App deep links", () => {
  it("selects the group workspace before opening a poll", () => {
    const redirect = new URL(miniAppRedirect(`ftp_${workspace}_TIMEA1B2C3`), "https://threadwise.local");
    expect(redirect.pathname).toBe("/api/workspace/select");
    expect(redirect.searchParams.get("workspace")).toBe("6cd8f630-05f4-48c0-b7fb-ffacbc4ff1a2");
    expect(redirect.searchParams.get("next")).toBe("/dashboard?view=schedule&poll=TIME-A1B2C3");
  });

  it("opens the create form only for a valid group start parameter", () => {
    const redirect = new URL(miniAppRedirect(`ftn_${workspace}`), "https://threadwise.local");
    expect(redirect.searchParams.get("next")).toBe("/dashboard?view=schedule&new=1");
    expect(miniAppRedirect("ftn_not-a-workspace")).toBe("/dashboard");
    expect(miniAppRedirect(undefined)).toBe("/dashboard");
  });
});
