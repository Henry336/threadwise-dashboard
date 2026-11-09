import type { DashboardSnapshotData } from "./dashboard-snapshot-schema";

/* Snapshot types are derived from the zod contract so the two cannot drift. Task fields the
 * schema defaults stay optional: live refreshes reach the browser unparsed, and demo and
 * optimistic tasks are built by hand. */
type SnapshotTask = DashboardSnapshotData["tasks"][number];
export type DashboardTask = Omit<SnapshotTask, "reminderTimes" | "audience"> & Partial<Pick<SnapshotTask, "reminderTimes" | "audience">>;
export type DashboardSnapshot = Omit<DashboardSnapshotData, "tasks"> & { tasks: DashboardTask[] };
export type DashboardUser = DashboardSnapshot["user"];
export type Accent = DashboardUser["accent"];
export type DashboardWorkspace = DashboardSnapshot["workspace"];
export type DashboardTaskAssignee = NonNullable<DashboardTask["assignees"]>[number];
export type DashboardNote = DashboardSnapshot["notes"][number];
export type DashboardIdea = DashboardSnapshot["ideas"][number];
export type IdeaStatus = DashboardIdea["status"];
export type IdeaBrief = NonNullable<DashboardIdea["brief"]>;
export type DashboardImage = DashboardSnapshot["images"][number];
export type IntegrationStatus = DashboardSnapshot["integrations"][number];
export type DashboardSettings = DashboardSnapshot["settings"];
export type DashboardOverviewQuote = DashboardSettings["overviewQuotes"][number];
export type AvailabilityPoll = NonNullable<DashboardSnapshot["scheduling"]>["polls"][number];

export type TodayAgendaEntry = {
  id: string;
  publicId: string;
  title: string;
  mode: "INDIVIDUAL" | "GROUP" | "STUDY";
  workspaceId?: string;
  workspaceName?: string;
  moduleId?: string;
  moduleCode?: string;
  plannedFor?: string;
  firstPlannedFor?: string;
  dueAt?: string;
  status: string;
};

export type TodayAgenda = {
  localDate: string;
  timezone: string;
  scope: "PERSONAL" | "GROUP" | "STUDY";
  today: TodayAgendaEntry[];
  carryover: TodayAgendaEntry[];
  dueSoon: TodayAgendaEntry[];
  overdue: TodayAgendaEntry[];
  unscheduledCount: number;
  orderRevision: number;
  reorderable: boolean;
};

export type TaskCaptureDraftItem = {
  id: string;
  position: number;
  title: string;
  sourceText: string;
  plannedFor?: string | null;
  dueAt?: string | null;
  moduleId?: string | null;
  studyItemType?: string | null;
  warnings: string[];
  status: "READY" | "NEEDS_REVIEW" | "COMMITTED";
  included: boolean;
};

export type TaskCaptureDraft = {
  id: string;
  scope: "PERSONAL" | "GROUP" | "STUDY";
  timezone: string;
  status: "COLLECTING" | "REVIEWING" | "COMMITTING" | "COMMITTED" | "CANCELED" | "EXPIRED";
  expiresAt: string;
  items: TaskCaptureDraftItem[];
};

export type TaskImportAssignee = {
  telegramId?: string;
  username?: string;
  displayName?: string;
};

export type TaskImportItem = {
  id: string;
  importId: string;
  position: number;
  title: string;
  sourceText: string;
  dueAt?: string | null;
  assignees: TaskImportAssignee[];
  teamOwnerLabel?: string | null;
  initialStatus: "OPEN" | "DONE";
  included: boolean;
  warnings: string[];
  status: "READY" | "IMPORTED" | "SKIPPED" | "FAILED";
  errorMessage?: string | null;
  taskId?: string | null;
};

export type TaskImportReview = {
  id: string;
  workspaceId: string;
  requestedByTelegramId: string;
  requestedByName: string;
  status: "PENDING" | "IMPORTING" | "PARTIAL" | "IMPORTED" | "CANCELED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  workspace: { title: string; telegramChatId: string };
  items: TaskImportItem[];
};

export type SearchResult = {
  id: string;
  publicId: string;
  kind: "task" | "note" | "idea" | "image";
  title: string;
  excerpt?: string;
  createdAt?: string;
};

export type EntityKind = "task" | "note" | "idea" | "image";

export type CaptureKind = "task" | "note" | "idea";
export type CapturePreview = {
  kind: CaptureKind;
  confidence: number;
  reason: string;
  sourceText: string;
  payload: Record<string, unknown>;
};
