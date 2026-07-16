import { importPKCS8, SignJWT } from "jose";
import { z } from "zod";
import { getDemoSnapshot } from "./demo-data";
import type { SessionUser } from "./auth";
import type { DashboardSnapshot } from "./types";

const text = (max: number) => z.string().trim().min(1).max(max);
const isoDate = z.string().datetime({ offset: true });
const timezone = text(80).refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}, "Invalid timezone");

const DashboardSnapshotSchema = z.object({
  user: z.object({
    telegramId: z.string().regex(/^[1-9]\d{0,19}$/),
    firstName: text(120),
    fullName: text(240),
    username: text(64).optional(),
    avatarUrl: z.string().url().max(2_000).optional(),
    timezone,
    accent: z.enum(["iris", "coral", "mint"]),
  }),
  generatedAt: isoDate,
  tasks: z.array(z.object({
    id: text(100), publicId: text(50), title: text(500), description: z.string().max(5_000).optional(),
    dueAt: isoDate.optional(), status: z.enum(["OPEN", "DONE", "CANCELED"]), recurring: z.boolean().optional(),
    pinned: z.boolean().optional(), reminderCount: z.number().int().min(0).max(100_000).optional(), assignee: text(200).optional(),
  })).max(50),
  notes: z.array(z.object({
    id: text(100), publicId: text(50), title: text(500), summary: z.string().max(10_000), tags: z.array(text(100)).max(50),
    createdAt: isoDate, pinned: z.boolean().optional(),
  })).max(50),
  ideas: z.array(z.object({
    id: text(100), publicId: text(50), title: text(500), concept: z.string().max(10_000),
    status: z.enum(["RAW", "CLARIFIED", "SELECTED", "PROTOTYPING", "BUILT", "PAUSED", "REJECTED"]),
    tags: z.array(text(100)).max(50), createdAt: isoDate,
  })).max(50),
  expenses: z.array(z.object({
    id: text(100), publicId: text(50), merchant: text(500), description: text(2_000), total: z.number().finite(),
    currency: z.string().regex(/^[A-Z]{3}$/), category: text(200), transactionAt: isoDate,
  })).max(50),
  activity: z.array(z.object({ day: text(12), captures: z.number().int().min(0).max(10_000), completed: z.number().int().min(0).max(10_000) })).length(7),
  integrations: z.array(z.object({
    name: z.enum(["Gmail", "Calendar", "Excel"]), state: z.enum(["connected", "attention", "available"]), detail: text(500),
  })).max(3),
});

async function createServiceToken(telegramId: string) {
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

export async function getDashboardSnapshot(
  user: SessionUser | null,
  options: { demo?: boolean } = {},
): Promise<DashboardSnapshot> {
  if (options.demo) return getDemoSnapshot();
  if (!user) throw new Error("A signed-in user is required");

  const baseUrl = process.env.THREADWISE_API_URL;
  if (!baseUrl) throw new Error("THREADWISE_API_URL is not configured");

  const token = await createServiceToken(user.telegramId);
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Threadwise API returned ${response.status}`);
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > 1_000_000) throw new Error("Threadwise API response is too large");
  const body = await response.text();
  if (body.length > 1_000_000) throw new Error("Threadwise API response is too large");
  return DashboardSnapshotSchema.parse(JSON.parse(body)) as DashboardSnapshot;
}
