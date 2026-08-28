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
