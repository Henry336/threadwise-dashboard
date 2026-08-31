import { expect, test } from "@playwright/test";

test("unauthenticated dashboard access fails closed and carries the staged nonce CSP", async ({ page }) => {
  const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  // A cold production worker may stream the route loading state before the server redirect arrives.
  await expect(page).toHaveURL(/\/$/u, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /your day/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /switch workspace/i })).toHaveCount(0);

  const policy = response?.headers()["content-security-policy-report-only"];
  expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/u);
  expect(policy).not.toContain("'unsafe-inline'");
  expect(policy).not.toContain("'unsafe-eval'");
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
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Export .md" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.md$/u);
  }
});
