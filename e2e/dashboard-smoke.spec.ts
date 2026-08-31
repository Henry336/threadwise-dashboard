import { expect, test, type Page } from "@playwright/test";

function trackCspViolations(page: Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/content security policy|refused to (?:apply|execute|load)/iu.test(message.text())) {
      violations.push(message.text());
    }
  });
  return violations;
}

test("unauthenticated dashboard access fails closed under the enforced nonce CSP", async ({ page }) => {
  const violations = trackCspViolations(page);
  const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  // A cold production worker may stream the route loading state before the server redirect arrives.
  await expect(page).toHaveURL(/\/$/u, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /your day/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /switch workspace/i })).toHaveCount(0);

  const policy = response?.headers()["content-security-policy"];
  expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/u);
  expect(policy?.match(/script-src [^;]+/u)?.[0]).not.toContain("'unsafe-inline'");
  expect(policy).toContain("style-src-attr 'unsafe-inline'");
  expect(policy).not.toContain("'unsafe-eval'");
  expect(violations).toEqual([]);
});

test("command palette owns focus, dismisses by keyboard, and restores its trigger", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Desktop command palette trigger is replaced by mobile navigation.");
  await page.goto("/dashboard?demo=1", { waitUntil: "load" });
  const trigger = page.getByRole("button", { name: /find anything/i });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: /find anything/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /find anything/i })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /find anything/i })).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("demo remains scrollable without viewport-wide horizontal overflow", async ({ page }) => {
  const violations = trackCspViolations(page);
  await page.goto("/dashboard?demo=1&view=tasks", { waitUntil: "load" });
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.viewportHeight);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(violations).toEqual([]);
});

test("private briefing controls are accessible and responsive in Personal settings", async ({ page }) => {
  await page.goto("/dashboard?demo=1&view=settings&tab=reminders", { waitUntil: "load" });
  await expect(page.getByText("Daily briefings", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /morning plan/i })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: /evening wrap-up/i })).not.toBeChecked();
  const morningTime = page.getByRole("button", { name: /morning delivery time/i });
  await morningTime.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox", { name: "Morning delivery time" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(morningTime).toBeFocused();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("destructive confirmation isolates the background and releases the page lock", async ({ page }) => {
  await page.goto("/dashboard?demo=1&view=settings&tab=privacy", { waitUntil: "load" });
  await page.getByRole("textbox", { name: "DELETE MY THREADWISE DATA" }).fill("DELETE MY THREADWISE DATA");
  await page.getByRole("button", { name: "Delete account and data" }).click();

  const confirmation = page.getByRole("alertdialog", { name: "Permanently delete your account?" });
  await expect(confirmation).toBeVisible();
  await expect(page.locator("body > [inert]")).not.toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  await confirmation.getByRole("button", { name: "Cancel" }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(page.locator("body > [inert]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("Personal notes open as a large rich editor and align checklist controls with their text", async ({ page }, testInfo) => {
  await page.goto("/dashboard?demo=1", { waitUntil: "load" });
  await page.getByRole("button", { name: "Write note" }).click();

  const dialog = page.getByRole("dialog", { name: "Untitled note" });
  await expect(dialog).toBeVisible();
  const document = dialog.locator('[contenteditable="true"][aria-label="Personal note"]');
  await expect(document).toBeVisible();
  await dialog.getByRole("button", { name: "Checklist" }).click();
  await document.pressSequentially("Write the reflection");

  const checkbox = document.locator('input[type="checkbox"]');
  const taskText = document.locator('li > div > p').first();
  await expect(checkbox).toBeVisible();
  const [checkboxBox, textBox] = await Promise.all([checkbox.boundingBox(), taskText.boundingBox()]);
  expect(checkboxBox).not.toBeNull();
  expect(textBox).not.toBeNull();
  expect(Math.abs((checkboxBox!.y + checkboxBox!.height / 2) - (textBox!.y + textBox!.height / 2))).toBeLessThanOrEqual(3);

  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Give this note a home." })).toBeVisible();
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  if (!testInfo.project.name.startsWith("mobile")) {
    await page.goto("/dashboard?demo=1&view=notes", { waitUntil: "load" });
    await page.getByRole("button", { name: /Actions for/u }).first().click();
    const exportAction = page.getByRole("menuitem", { name: "Export .md" });
    await expect(exportAction).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), exportAction.click()]);
    expect(download.suggestedFilename()).toMatch(/\.md$/u);
  }
});

test("rich notes keep typing focus, show list markers, and isolate the filing dialog", async ({ page }) => {
  await page.goto("/dashboard?demo=1", { waitUntil: "load" });
  await page.getByRole("button", { name: "Write note" }).click();

  const editorDialog = page.getByRole("dialog", { name: "Untitled note" });
  const document = editorDialog.locator('[contenteditable="true"][aria-label="Personal note"]');
  await document.click();
  await document.pressSequentially("1. First visible item");
  await expect(document.locator("ol > li")).toContainText("First visible item");
  await expect.poll(() => document.locator("ol").evaluate((element) => getComputedStyle(element).listStyleType)).toBe("decimal");

  await document.press("Enter");
  await document.pressSequentially("Second item typed without refocusing");
  await expect(document.locator("ol > li")).toHaveCount(2);
  await expect(document).toBeFocused();
  await expect(page.getByRole("dialog", { name: "Quick capture" })).toHaveCount(0);

  await editorDialog.getByRole("button", { name: "Save", exact: true }).click();
  const filingDialog = page.getByRole("dialog", { name: "Give this note a home." });
  await expect(filingDialog).toBeVisible();
  await expect(page.locator(".study-note-fullscreen > main")).toHaveAttribute("inert", "");
  await expect(filingDialog.getByRole("textbox", { name: "Title" })).toBeFocused();
});
