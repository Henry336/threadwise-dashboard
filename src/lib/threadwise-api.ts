import "server-only";

import { importPKCS8, SignJWT } from "jose";
import { getDemoSnapshot } from "./demo-data";
import type { SessionUser } from "./auth";
import type { DashboardSettings, DashboardSnapshot } from "./types";
import { parseDashboardSnapshot } from "./dashboard-snapshot-schema";

function defaultSettings(timeZone: string): DashboardSettings {
  return {
    timezone: timeZone, reminderIntervalMinutes: 180, quietHoursStart: "22:00", quietHoursEnd: "08:00",
    maxRemindersPerDay: 24, dueNudgeMinutes: 5, reminderMode: "INDIVIDUAL",
    expenseCurrency: "SGD", ocrLanguages: "eng", directNudgesEnabled: false,
  };
}

export async function createServiceToken(telegramId: string) {
  const privateKey = process.env.DASHBOARD_API_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!privateKey) throw new Error("DASHBOARD_API_PRIVATE_KEY is not configured");
  const key = await importPKCS8(privateKey, "EdDSA");
  return new SignJWT({})
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setIssuer("threadwise-dashboard")
    .setAudience("threadwise-api")
    .setSubject(telegramId)
    .setIssuedAt()
    .setExpirationTime("60s")
    .setJti(crypto.randomUUID())
    .sign(key);
}

function apiBaseUrl() {
  const baseUrl = process.env.THREADWISE_API_URL;
  if (!baseUrl) throw new Error("THREADWISE_API_URL is not configured");
  return `${baseUrl.replace(/\/$/, "")}/api/v1/dashboard`;
}

export async function threadwiseFetch(user: SessionUser, path = "", init: RequestInit = {}) {
  const token = await createServiceToken(user.telegramId);
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";
  return fetch(`${apiBaseUrl()}${suffix}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(12_000),
  });
}

export class ThreadwiseApiError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(`Threadwise API returned ${status} (${code})`);
    this.name = "ThreadwiseApiError";
  }
}

export class DashboardDataContractError extends Error {
  constructor() {
    super("Threadwise returned dashboard data in an incompatible format.");
    this.name = "DashboardDataContractError";
  }
}

export async function getDashboardSnapshot(
  user: SessionUser | null,
  options: { demo?: boolean } = {},
): Promise<DashboardSnapshot> {
  if (options.demo) return getDemoSnapshot();
  if (!user) throw new Error("A signed-in user is required");

  const response = await threadwiseFetch(user);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let code = "unknown";
    try {
      const parsed = JSON.parse(body) as { error?: unknown };
      if (typeof parsed.error === "string" && /^[a-z0-9_-]{1,80}$/i.test(parsed.error)) code = parsed.error;
    } catch {
      // Keep upstream response bodies out of application logs.
    }
    throw new ThreadwiseApiError(response.status, code);
  }
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > 2_000_000) throw new Error("Threadwise API response is too large");
  const body = await response.text();
  if (body.length > 2_000_000) throw new Error("Threadwise API response is too large");
  let parsed: ReturnType<typeof parseDashboardSnapshot>;
  try {
    parsed = parseDashboardSnapshot(JSON.parse(body));
  } catch {
    throw new DashboardDataContractError();
  }
  return {
    ...parsed,
    images: parsed.images ?? [],
    settings: parsed.settings ?? defaultSettings(parsed.user.timezone),
  } as DashboardSnapshot;
}
