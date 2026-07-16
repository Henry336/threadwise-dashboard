export type DashboardUser = {
  telegramId: string;
  firstName: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  timezone: string;
  accent: "iris" | "coral" | "mint";
};
export type DashboardTask = {
  id: string;
  publicId: string;
  title: string;
  description?: string;
  dueAt?: string;
  status: "OPEN" | "DONE" | "CANCELED";
  recurring?: boolean;
  pinned?: boolean;
  reminderCount?: number;
  assignee?: string;
};

export type DashboardNote = {
  id: string;
  publicId: string;
  title: string;
  summary: string;
  tags: string[];
  createdAt: string;
  pinned?: boolean;
};

export type DashboardIdea = {
  id: string;
  publicId: string;
  title: string;
  concept: string;
  status: "RAW" | "CLARIFIED" | "SELECTED" | "PROTOTYPING" | "BUILT" | "PAUSED" | "REJECTED";
  tags: string[];
  createdAt: string;
};

export type DashboardExpense = {
  id: string;
  publicId: string;
  merchant: string;
  description: string;
  total: number;
  currency: string;
  category: string;
  transactionAt: string;
};

export type IntegrationStatus = {
  name: "Gmail" | "Calendar" | "Excel";
  state: "connected" | "attention" | "available";
  detail: string;
};

export type DashboardSnapshot = {
  user: DashboardUser;
  generatedAt: string;
  tasks: DashboardTask[];
  notes: DashboardNote[];
  ideas: DashboardIdea[];
  expenses: DashboardExpense[];
  activity: { day: string; captures: number; completed: number }[];
  integrations: IntegrationStatus[];
};
