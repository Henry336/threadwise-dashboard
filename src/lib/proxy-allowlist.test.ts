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
    ["PATCH", "today/order"],
    ["PATCH", "today/0c68a350-c061-4a86-a63f-842c132dc77d/plan"],
    ["POST", "today/0c68a350-c061-4a86-a63f-842c132dc77d/complete"],
    ["POST", "task-drafts"],
    ["GET", "task-drafts/0c68a350-c061-4a86-a63f-842c132dc77d"],
    ["POST", "task-drafts/0c68a350-c061-4a86-a63f-842c132dc77d/items"],
    ["PATCH", "task-drafts/0c68a350-c061-4a86-a63f-842c132dc77d/items/0c68a350-c061-4a86-a63f-842c132dc77e"],
    ["POST", "task-drafts/0c68a350-c061-4a86-a63f-842c132dc77d/commit"],
    ["GET", "study/note-drafts"],
    ["PATCH", "study/note-drafts"],
    ["DELETE", "study/note-drafts/0c68a350-c061-4a86-a63f-842c132dc77d"],
    ["GET", "note-drafts"],
    ["PATCH", "note-drafts"],
    ["DELETE", "note-drafts/0c68a350-c061-4a86-a63f-842c132dc77d"],
    ["POST", "study/calendar/connect"],
    ["POST", "study/calendar/sync"],
    ["POST", "study/calendar/stop"],
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
    ["POST", "today/order"],
    ["GET", "today/0c68a350-c061-4a86-a63f-842c132dc77d/plan"],
    ["GET", "today/0c68a350-c061-4a86-a63f-842c132dc77d/complete"],
    ["POST", "task-drafts/0c68a350-c061-4a86-a63f-842c132dc77d/items/0c68a350-c061-4a86-a63f-842c132dc77e"],
    ["POST", "study/note-drafts"],
    ["GET", "study/note-drafts/0c68a350-c061-4a86-a63f-842c132dc77d"],
    ["DELETE", "study/note-drafts/not-a-uuid"],
    ["POST", "note-drafts"],
    ["GET", "note-drafts/0c68a350-c061-4a86-a63f-842c132dc77d"],
    ["DELETE", "note-drafts/not-a-uuid"],
    ["GET", "study/calendar/sync"],
    ["DELETE", "study/calendar/stop"],
  ])("rejects the forged %s %s surface", (method, path) => {
    expect(isAllowedThreadwiseProxyPath(path) && isAllowedThreadwiseProxyMethod(method, path)).toBe(false);
  });
});
