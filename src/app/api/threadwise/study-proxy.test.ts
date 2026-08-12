import { describe, expect, it } from "vitest";
import { isAllowedThreadwiseProxyMethod, isAllowedThreadwiseProxyPath } from "../../../lib/proxy-allowlist";

describe("Study API proxy allowlist", () => {
  it.each([
    ["GET", "study/snapshot"],
    ["GET", "study/search"],
    ["GET", "study/places"],
    ["POST", "study/items"],
    ["PATCH", "study/items/item-1"],
    ["DELETE", "study/resources/resource-1"],
    ["GET", "study/resources/resource-1/content"],
    ["POST", "study/canvas/sync"],
    ["PATCH", "study/settings"],
    ["PATCH", "study/schedule/block-1"],
    ["POST", "study/nusmods/import"],
  ])("allows %s %s", (method, path) => {
    expect(isAllowedThreadwiseProxyPath(path)).toBe(true);
    expect(isAllowedThreadwiseProxyMethod(method, path)).toBe(true);
  });

  it.each([
    ["GET", "study/items"],
    ["DELETE", "study/settings"],
    ["POST", "study/resources/resource-1/content"],
    ["GET", "study/private-debug"],
    ["POST", "study/canvas/token"],
  ])("rejects forged or unsupported %s %s", (method, path) => {
    expect(isAllowedThreadwiseProxyPath(path) && isAllowedThreadwiseProxyMethod(method, path)).toBe(false);
  });
});
