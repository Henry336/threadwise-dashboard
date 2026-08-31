import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("action menu focus", () => {
  it("does not let initial keyboard focus scroll and immediately dismiss the menu", () => {
    const source = readFileSync(resolve(process.cwd(), "src", "components", "action-menu.tsx"), "utf8");
    expect(source.match(/focus\(\{ preventScroll: true \}\)/gu)).toHaveLength(2);
    expect(source).not.toContain('addEventListener("scroll", close');
    expect(source).toContain('addEventListener("wheel", close');
    expect(source).toContain('addEventListener("touchmove", close');
  });
});
