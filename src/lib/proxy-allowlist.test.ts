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
    ["GET", "today"],
    ["PATCH", "today/0c68a350-c061-4a86-a63f-842c132dc77d/plan"],
    ["POST", "today/0c68a350-c061-4a86-a63f-842c132dc77d/complete"],
    ["POST", "task-drafts"],
    ["GET", "task-drafts/0c68a350-c061-4a86-a63f-842c132dc77d"],
    ["POST", "task-drafts/0c68a350-c061-4a86-a63f-842c132dc77d/items"],
    ["PATCH", "task-drafts/0c68a350-c061-4a86-a63f-842c132dc77d/items/0c68a350-c061-4a86-a63f-842c132dc77e"],
    ["POST", "task-drafts/0c68a350-c061-4a86-a63f-842c132dc77d/commit"],
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
    ["POST", "today"],
    ["GET", "today/0c68a350-c061-4a86-a63f-842c132dc77d/plan"],
    ["GET", "today/0c68a350-c061-4a86-a63f-842c132dc77d/complete"],
    ["POST", "task-drafts/0c68a350-c061-4a86-a63f-842c132dc77d/items/0c68a350-c061-4a86-a63f-842c132dc77e"],
  ])("rejects the forged %s %s surface", (method, path) => {
    expect(isAllowedThreadwiseProxyPath(path) && isAllowedThreadwiseProxyMethod(method, path)).toBe(false);
  });
});
