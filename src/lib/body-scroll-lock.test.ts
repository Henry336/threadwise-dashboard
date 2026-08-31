import { describe, expect, it } from "vitest";
import { acquireBodyScrollLock } from "./body-scroll-lock";

function fakeBody(overflow = "") {
  return { style: { overflow } } as HTMLElement;
}

describe("body scroll lock", () => {
  it("restores the original overflow after nested locks release in mounting order", () => {
    const body = fakeBody("auto");
    const releaseDetails = acquireBodyScrollLock(body);
    const releaseDelete = acquireBodyScrollLock(body);

    releaseDetails();
    expect(body.style.overflow).toBe("hidden");

    releaseDelete();
    expect(body.style.overflow).toBe("auto");
  });

  it("restores the original overflow after nested locks release in reverse order", () => {
    const body = fakeBody();
    const releaseDetails = acquireBodyScrollLock(body);
    const releaseDelete = acquireBodyScrollLock(body);

    releaseDelete();
    expect(body.style.overflow).toBe("hidden");

    releaseDetails();
    releaseDetails();
    expect(body.style.overflow).toBe("");
  });
});
