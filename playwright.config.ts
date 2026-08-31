import { generateKeyPairSync } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const fixtureAuthSecret = "threadwise-playwright-study-fixture-secret";
const fixtureKeys = externalBaseUrl ? null : generateKeyPairSync("ed25519");
const fixturePrivateKey = fixtureKeys?.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const fixturePublicKey = fixtureKeys?.publicKey.export({ type: "spki", format: "pem" }).toString();

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: externalBaseUrl ?? "http://localhost:3106",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: externalBaseUrl ? undefined : [
    {
      command: "node scripts/study-browser-fixture.mjs",
      url: "http://127.0.0.1:3107/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, STUDY_FIXTURE_PORT: "3107", STUDY_FIXTURE_PUBLIC_KEY: fixturePublicKey! },
    },
    {
      command: "npm start -- --port 3106",
      url: "http://localhost:3106",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        AUTH_SECRET: fixtureAuthSecret,
        DASHBOARD_API_PRIVATE_KEY: fixturePrivateKey!,
        THREADWISE_API_URL: "http://127.0.0.1:3107",
        NEXT_PUBLIC_APP_URL: "http://localhost:3106",
      },
    },
  ],
});
