import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard dialog consistency", () => {
  it("does not use browser-native confirmation or alert dialogs", () => {
    const files = [
      "dashboard-app.tsx",
      "group-scheduling.tsx",
      "study-dashboard.tsx",
      "study-deep-work.tsx",
      "study-dialog.tsx",
      "study-timetable.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), "src", "components", file), "utf8");
      expect(source, file).not.toContain("window.confirm(");
      expect(source, file).not.toContain("window.alert(");
    }
  });

  it("uses the reference-counted body lock for the shared confirmation layer", () => {
    const source = readFileSync(resolve(process.cwd(), "src", "components", "confirmation-dialog.tsx"), "utf8");
    expect(source).toContain("useBodyScrollLock();");
    expect(source).toContain('element.setAttribute("inert", "")');
    expect(source).not.toContain('document.body.style.overflow = "hidden"');
  });
});
