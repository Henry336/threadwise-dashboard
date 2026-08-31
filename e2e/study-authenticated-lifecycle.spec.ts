import { createHmac } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const AUTH_SECRET = "threadwise-playwright-study-fixture-secret";
const WORKSPACE_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_ID = "60000000-0000-4000-8000-000000000001";

function sessionToken() {
  const payload = Buffer.from(JSON.stringify({
    sessionId: SESSION_ID,
    telegramId: "900000001", firstName: "Study", fullName: "Study Owner",
    expiresAt: Date.now() + 3_600_000,
  })).toString("base64url");
  const signature = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

async function authenticate(context: BrowserContext) {
  await context.addCookies([
    { name: "threadwise_session", value: sessionToken(), domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "threadwise_workspace", value: WORKSPACE_ID, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}

async function openEditor(page: Page) {
  await page.goto("/dashboard?view=study-overview", { waitUntil: "load" });
  await expect(page.getByText("Synthetic Semester", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Write note" }).click();
  const dialog = page.getByRole("dialog", { name: "Untitled note" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Start writing|Saved across devices/u)).toBeVisible();
  return { dialog, document: dialog.locator('[contenteditable="true"][aria-label="Study note"]') };
}

test.describe("authenticated Study note lifecycle", () => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Synthetic credentials are only valid against the isolated local fixture.");
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ context }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "The authenticated lifecycle uses one serial desktop fixture; mobile rich-note behavior is covered separately.");
    await authenticate(context);
  });

  test("recovers an autosaved draft and files it as a canonical note", async ({ page }) => {
    let editor = await openEditor(page);
    await editor.dialog.locator('input[type="file"]').setInputFiles({ name: "not-markdown.txt", mimeType: "text/plain", buffer: Buffer.from("plain text") });
    await expect(editor.dialog.getByText("Choose a Markdown file ending in .md.", { exact: true })).toBeVisible();
    await editor.document.fill("# Phase 1 lifecycle\n\nRecovered securely across devices.");
    await expect(editor.dialog.getByText("Saved across devices", { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.reload({ waitUntil: "load" });
    await page.getByRole("button", { name: "Write note" }).click();
    editor = {
      dialog: page.getByRole("dialog", { name: /Phase 1 lifecycle|Untitled note/u }),
      document: page.locator('[contenteditable="true"][aria-label="Study note"]'),
    };
    await expect(editor.document).toContainText("Recovered securely across devices");
    await expect(editor.dialog.getByText(/Continued from your encrypted cross-device draft/u)).toBeVisible();
    await editor.dialog.getByRole("button", { name: "Save", exact: true }).click();
    const filing = page.getByRole("dialog", { name: "Where should this live?" });
    const title = filing.getByRole("textbox", { name: "Title" });
    await expect(title).toBeFocused();
    await title.fill("Phase 1 lifecycle");
    await filing.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(editor.dialog).toHaveCount(0);

    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.getByRole("heading", { name: "Phase 1 lifecycle" })).toBeVisible();
  });

  test("detects a stale cross-device edit instead of overwriting it", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    await Promise.all([authenticate(contextA), authenticate(contextB)]);
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const [editorA, editorB] = await Promise.all([openEditor(pageA), openEditor(pageB)]);

    await editorA.document.fill("Newer copy from device A");
    await expect(editorA.dialog.getByText("Saved across devices", { exact: true })).toBeVisible({ timeout: 10_000 });
    await editorB.document.fill("Stale copy from device B");
    await expect(editorB.dialog.getByText("Another device has a newer copy", { exact: true })).toBeVisible({ timeout: 10_000 });

    await Promise.all([contextA.close(), contextB.close()]);
  });

  test("benchmarks representative rich notes without blocking the editor", async ({ page }, testInfo) => {
    const editor = await openEditor(page);
    if (await editor.dialog.getByRole("button", { name: "Load newer copy" }).isVisible()) {
      await editor.dialog.getByRole("button", { name: "Load newer copy" }).click();
    }
    const measurements = [];
    for (const size of [10_000, 50_000, 99_500]) {
      const response = page.waitForResponse((candidate) => candidate.request().method() === "PATCH" && candidate.url().includes("/study/note-drafts"));
      const started = performance.now();
      await editor.document.fill(`Benchmark ${size}\n\n${"x".repeat(size - 20)}`);
      expect((await response).ok()).toBe(true);
      const durationMs = Math.round(performance.now() - started);
      measurements.push({ size, durationMs });
      expect(durationMs).toBeLessThan(8_000);
    }
    console.info(`Rich-note benchmark: ${JSON.stringify(measurements)}`);
    await testInfo.attach("rich-note-benchmark.json", { body: JSON.stringify(measurements, null, 2), contentType: "application/json" });
  });
});
