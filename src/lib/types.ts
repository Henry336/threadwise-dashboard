export type Accent = "iris" | "coral" | "mint";

export type DashboardUser = {
  telegramId: string;
  firstName: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  timezone: string;
  accent: Accent;
};

export type DashboardWorkspace = {
  id: string;
  kind: "PERSONAL" | "GROUP";
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  memberCount?: number;
};

export type DashboardTaskAssignee = {
  id: string;
  telegramId?: string;
  username?: string;
  displayName: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED";
  statusReason?: string;
  respondedAt?: string;
  updatedAt: string;
};

export type DashboardTask = {
  id: string;
  publicId: string;
  title: string;
  description?: string;
  dueAt?: string;
  nextReminderAt?: string;
  snoozedUntil?: string;
  reminderIntervalMinutes?: number;
  status: "OPEN" | "DONE" | "CANCELED";
  recurrenceRule?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  recurring?: boolean;
  pinned?: boolean;
  reminderCount?: number;
  calendarEventId?: string;
  calendarEventUrl?: string;
  calendarSyncedAt?: string;
  assignee?: string;
  assignees?: DashboardTaskAssignee[];
  createdAt?: string;
  updatedAt?: string;
};

export type DashboardNote = {
  id: string;
  publicId: string;
  title: string;
  body?: string;
  summary: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  pinned?: boolean;
};

export type IdeaStatus =
  | "RAW"
  | "CLARIFIED"
  | "SELECTED"
  | "PROTOTYPING"
  | "BUILT"
  | "PAUSED"
  | "REJECTED";

export type IdeaBrief = {
  buildability: number;
  usefulness: number;
  novelty: number;
  portfolioValue: number;
  monetization: number;
  difficulty: number;
  risk: number;
  summary: string;
  marketNotes: string;
  dos: string[];
  donts: string[];
};

export type DashboardIdea = {
  id: string;
  publicId: string;
  title: string;
  concept: string;
  status: IdeaStatus;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  pinned?: boolean;
  brief?: IdeaBrief;
};

export type DashboardImage = {
  id: string;
  publicId: string;
  mediaKind: string;
  mimeType?: string;
  fileName?: string;
  caption?: string;
  ocrText?: string;
  ocrConfidence?: number;
  createdAt: string;
  updatedAt?: string;
  pinned?: boolean;
};

export type DashboardExpense = {
  id: string;
  publicId: string;
  merchant?: string;
  description: string;
  total: number;
  currency: string;
  category?: string;
  transactionAt: string;
  paymentMethod?: string;
  notes?: string;
  excelSyncedAt?: string;
  createdAt?: string;
};

export type IntegrationStatus = {
  name: "Calendar" | "Excel";
  provider: "calendar" | "excel";
  state: "connected" | "attention" | "available";
  detail: string;
  accountEmail?: string;
  autoSync: boolean;
  syncedCount: number;
  unsyncedCount: number;
  workbookName?: string;
  workbookUrl?: string;
};

export type DashboardSettings = {
  timezone: string;
  reminderIntervalMinutes: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  maxRemindersPerDay: number;
  dueNudgeMinutes: number;
  reminderMode: "INDIVIDUAL" | "DIGEST";
  expenseCurrency: string;
  ocrLanguages: string;
  directNudgesEnabled: boolean;
  calendarAutoSync: boolean;
  excelAutoSync: boolean;
};

export type SearchResult = {
  id: string;
  publicId: string;
  kind: "task" | "note" | "idea" | "image" | "expense";
  title: string;
  excerpt?: string;
  createdAt?: string;
};

export type AvailabilityPoll = {
  id: string;
  publicId: string;
  title: string;
  status: "OPEN" | "FINALIZED" | "CANCELED";
  startDate: string;
  endDate: string;
  timezone: string;
  durationMinutes: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
  revision: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  telegramMessageId?: string;
  slots: string[];
  bestSlots: Array<{ startAt: string; endAt: string; availableCount: number }>;
  respondentCount: number;
  memberCount: number;
  respondents: Array<{ telegramId: string; displayName: string }>;
  pendingMembers: Array<{ telegramId: string; displayName: string; username?: string }>;
  viewerResponse?: { timezone: string; availableStarts: string[]; wantsCalendar: boolean };
  finalStartAt?: string;
  finalEndAt?: string;
  finalizedAt?: string;
  viewerCalendar?: { connected: boolean; synced: boolean; eventUrl?: string };
};

export type DashboardSnapshot = {
  workspace: DashboardWorkspace;
  user: DashboardUser;
  generatedAt: string;
  tasks: DashboardTask[];
  notes: DashboardNote[];
  ideas: DashboardIdea[];
  images: DashboardImage[];
  expenses: DashboardExpense[];
  activity: { day: string; captures: number; completed: number }[];
  integrations: IntegrationStatus[];
  settings: DashboardSettings;
  collaboration?: {
    viewerTelegramId: string;
    members: Array<{
      telegramId: string;
      username?: string;
      displayName: string;
      initials: string;
      role: "OWNER" | "ADMIN" | "MEMBER";
      lastSeenAt: string;
      openTasks: number;
      blockedTasks: number;
      awaitingTasks: number;
    }>;
    activity: Array<{
      id: string;
      type: string;
      actorTelegramId: string;
      actorName: string;
      taskPublicId?: string;
      taskTitle?: string;
      summary: string;
      createdAt: string;
    }>;
    summary: {
      overdue: number;
      unassigned: number;
      awaitingAcknowledgement: number;
      blocked: number;
      createdThisWeek: number;
      completedThisWeek: number;
      handoffsThisWeek: number;
    };
  };
  scheduling?: { polls: AvailabilityPoll[] };
};

export type EntityKind = "task" | "note" | "idea" | "expense" | "image";
export type ThreadwiseEntity = DashboardTask | DashboardNote | DashboardIdea | DashboardExpense | DashboardImage;

export type ApiErrorBody = { error: string; message?: string };

export type CaptureKind = "task" | "note" | "idea" | "expense";
export type CapturePreview = {
  kind: CaptureKind;
  confidence: number;
  reason: string;
  sourceText: string;
  payload: Record<string, unknown>;
};
