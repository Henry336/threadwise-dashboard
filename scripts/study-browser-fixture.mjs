import { createServer } from "node:http";
import { importSPKI, jwtVerify } from "jose";

const PORT = Number(process.env.STUDY_FIXTURE_PORT ?? 3107);
const WORKSPACE_ID = "10000000-0000-4000-8000-000000000001";
const MODULE_ID = "20000000-0000-4000-8000-000000000001";
const SESSION_ID = "60000000-0000-4000-8000-000000000001";
const now = () => new Date().toISOString();
let draft = null;
let resources = [];

const dashboard = () => ({
  workspace: { id: WORKSPACE_ID, kind: "GROUP", name: "Synthetic Study", role: "OWNER", memberCount: 1, mode: "STUDY" },
  user: { telegramId: "900000001", firstName: "Study", fullName: "Study Owner", timezone: "Asia/Singapore", accent: "iris" },
  generatedAt: now(),
  tasks: [], notes: [], ideas: [], images: [], expenses: [], activity: [], integrations: [],
  settings: {
    timezone: "Asia/Singapore", reminderIntervalMinutes: 180, quietHoursStart: "22:00", quietHoursEnd: "08:00",
    maxRemindersPerDay: 24, dueNudgeMinutes: 30, reminderMode: "INDIVIDUAL", expenseCurrency: "SGD",
    ocrLanguages: "eng", directNudgesEnabled: false, calendarAutoSync: false, excelAutoSync: false,
    overviewQuotes: [], morningBriefEnabled: false, morningBriefTime: "08:00",
    eveningDebriefEnabled: false, eveningDebriefTime: "21:00",
  },
});

const studySnapshot = () => ({
  generatedAt: now(),
  workspace: {
    id: WORKSPACE_ID, semesterName: "Synthetic Semester", semesterStartDate: "2026-08-10",
    timezone: "Asia/Singapore", activeModuleId: MODULE_ID, weeklyReviewDay: 7, weeklyReviewTime: "20:00",
    weeklyPreviewDay: 7, weeklyPreviewTime: "18:00", quietHoursStart: "22:00", quietHoursEnd: "08:00",
    maxRemindersPerDay: 24, timedPracticeStartWeek: 4, studyBlockRemindersEnabled: true,
    canvasSyncEnabled: false, activeOriginId: null, activeOriginUntil: null,
  },
  weekNumber: 1,
  week: { id: "30000000-0000-4000-8000-000000000001", number: 1, reviewCompleted: false, topPriorities: [] },
  overview: {
    overallStatus: "UNASSESSED", amberWarning: false, redWarning: false, topPriorities: [],
    attention: { generatedAt: now(), items: [], overdue: 0, dueToday: 0, dueThisWeek: 0, undated: 0, missingCanvas: 0, redModules: [] },
  },
  modules: [{
    id: MODULE_ID, code: "CS2100", name: "Computer Organisation", active: true, displayOrder: 0,
    pinnedAt: null, color: "#168b83", workloadGroup: null, currentMastery: "UNASSESSED",
    masteryReason: null, canvasCourseId: null, canvasLastSeenAt: null, userArchivedAt: null, updatedAt: now(),
  }],
  inactiveModules: [], items: [], resources, mistakes: [], sessions: [], reviews: [], scheduleBlocks: [],
  canvas: { configured: false, state: null, missingAssignments: [] },
  origins: [],
});

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

async function authorize(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/u, "");
  const publicKeyText = process.env.STUDY_FIXTURE_PUBLIC_KEY?.replace(/\\n/g, "\n");
  if (!token || !publicKeyText) return false;
  try {
    const publicKey = await importSPKI(publicKeyText, "EdDSA");
    const verified = await jwtVerify(token, publicKey, { issuer: "threadwise-dashboard", audience: "threadwise-api", subject: "900000001" });
    return Boolean(verified.payload.jti);
  } catch {
    return false;
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `localhost:${PORT}`}`);
  if (url.pathname === "/health") return json(response, 200, { ok: true });
  if (!url.pathname.startsWith("/api/v1/dashboard") || !await authorize(request)) return json(response, 401, { error: "unauthorized" });

  const path = url.pathname.slice("/api/v1/dashboard".length).replace(/^\/+|\/+$/gu, "");
  if (path === `browser-sessions/${SESSION_ID}` && request.method === "GET") {
    return json(response, 200, { session: { id: SESSION_ID, expiresAt: new Date(Date.now() + 3_600_000).toISOString() } });
  }
  if (path === "workspaces" && request.method === "GET") {
    return json(response, 200, { workspaces: [dashboard().workspace] });
  }
  if (!path && request.method === "GET") return json(response, 200, dashboard());
  if (request.headers["x-threadwise-workspace"] !== WORKSPACE_ID) return json(response, 403, { error: "workspace_forbidden" });
  if (path === "study/snapshot" && request.method === "GET") return json(response, 200, { study: studySnapshot() });

  if (path === "study/note-drafts" && request.method === "GET") return json(response, 200, { draft });
  if (path === "study/note-drafts" && request.method === "PATCH") {
    const input = await body(request);
    const expectedRevision = Number(input.expectedRevision ?? 0);
    if (expectedRevision !== (draft?.revision ?? 0)) {
      return json(response, 409, { error: "revision_conflict", message: "Another device has a newer copy. Load it before continuing." });
    }
    const timestamp = now();
    draft = {
      id: draft?.id ?? "40000000-0000-4000-8000-000000000001",
      resourceUpdatedAt: input.resourceUpdatedAt ?? null,
      moduleId: input.moduleId ?? MODULE_ID,
      title: String(input.title ?? ""), body: String(input.body ?? ""), revision: expectedRevision + 1,
      updatedAt: timestamp, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    };
    return json(response, 200, { draft });
  }
  if (path.startsWith("study/note-drafts/") && request.method === "DELETE") {
    draft = null;
    return json(response, 200, { deleted: true });
  }
  if (path === "study/resources" && request.method === "POST") {
    const input = await body(request);
    const timestamp = now();
    const resource = {
      id: "50000000-0000-4000-8000-000000000001", publicId: "NOTE-1", moduleId: input.moduleId,
      kind: "NOTE", title: String(input.title), body: String(input.body), tags: [], pinnedAt: null,
      createdAt: timestamp, updatedAt: timestamp,
      module: { id: MODULE_ID, code: "CS2100", name: "Computer Organisation", color: "#168b83" },
    };
    resources = [resource];
    return json(response, 201, { resource });
  }

  return json(response, 404, { error: "fixture_route_missing", path, method: request.method });
}).listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`Study browser fixture listening on ${PORT}\n`);
});
