import "server-only";

import { importPKCS8, SignJWT } from "jose";
import { getDemoSnapshot, getGroupDemoSnapshot } from "./demo-data";
import type { SessionUser } from "./auth";
import type { DashboardSettings, DashboardSnapshot, DashboardWorkspace } from "./types";
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

export async function threadwiseFetch(user: SessionUser, path = "", init: RequestInit = {}, workspace = "personal") {
  const token = await createServiceToken(user.telegramId);
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (workspace !== "personal") headers.set("X-Threadwise-Workspace", workspace);
  return fetch(`${apiBaseUrl()}${suffix}`, {
    ...init,
    headers,
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
  options: { demo?: boolean; workspace?: string } = {},
): Promise<DashboardSnapshot> {
  if (options.demo) return options.workspace === "group" ? getGroupDemoSnapshot() : getDemoSnapshot();
  if (!user) throw new Error("A signed-in user is required");

  const response = await threadwiseFetch(user, "", {}, options.workspace);
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
    workspace: parsed.workspace ?? {
      id: "personal",
      kind: "PERSONAL",
      name: parsed.user.firstName,
      role: "OWNER",
    },
    images: parsed.images ?? [],
    settings: parsed.settings ?? defaultSettings(parsed.user.timezone),
  } as DashboardSnapshot;
}

export async function getDashboardWorkspaces(user: SessionUser | null): Promise<DashboardWorkspace[]> {
  if (!user) return [];
  try {
    const response = await threadwiseFetch(user, "workspaces");
    if (!response.ok) return [];
    const body = await response.json() as { workspaces?: unknown };
    if (!Array.isArray(body.workspaces)) return [];
    return body.workspaces.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const value = item as Record<string, unknown>;
      if (
        typeof value.id !== "string"
        || typeof value.name !== "string"
        || !["PERSONAL", "GROUP"].includes(String(value.kind))
        || !["OWNER", "ADMIN", "MEMBER"].includes(String(value.role))
      ) return [];
      return [{
        id: value.id,
        kind: value.kind as DashboardWorkspace["kind"],
        name: value.name.slice(0, 240),
        role: value.role as DashboardWorkspace["role"],
        ...(typeof value.memberCount === "number" ? { memberCount: value.memberCount } : {}),
      }];
    }).slice(0, 100);
  } catch {
    // Workspace discovery is additive. A healthy selected snapshot must remain usable
    // if the optional switcher list has a transient network failure.
    return [];
  }
}
