import { describe, expect, it } from "vitest";
import { isAllowedThreadwiseProxyMethod, isAllowedThreadwiseProxyPath } from "./proxy-allowlist";

describe("dashboard BFF allowlist", () => {
  it.each([
    ["GET", "snapshot"],
    ["GET", "workspaces"],
    ["POST", "capture/preview"],
    ["PATCH", "tasks/TASK-1"],
    ["DELETE", "notes/NOTE-1"],
    ["GET", "images/IMG-1/content"],
  ])("allows the reviewed %s %s surface", (method, path) => {
    expect(isAllowedThreadwiseProxyPath(path)).toBe(true);
    expect(isAllowedThreadwiseProxyMethod(method, path)).toBe(true);
  });

  it.each([
    ["GET", "../admin/ai/status"],
    ["GET", "admin/ai/status"],
    ["POST", "privacy/export"],
    ["GET", "privacy/account"],
    ["POST", "images/IMG-1/content"],
    ["GET", "tasks/TASK-1/collaboration"],
  ])("rejects the forged %s %s surface", (method, path) => {
    expect(isAllowedThreadwiseProxyPath(path) && isAllowedThreadwiseProxyMethod(method, path)).toBe(false);
  });
});
