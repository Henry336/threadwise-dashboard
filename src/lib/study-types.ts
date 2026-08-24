export type StudyTrafficLight = "GREEN" | "AMBER" | "RED" | "UNASSESSED";
export type StudyItemStatus = "OPEN" | "IN_PROGRESS" | "PROCESSED" | "DONE" | "SKIPPED";
export type StudyItemType = "LECTURE" | "TUTORIAL" | "LAB" | "ASSIGNMENT" | "PROJECT" | "REVISION" | "TIMED_PRACTICE" | "READING" | "ADMINISTRATIVE";
export type StudyPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type StudyResourceKind = "NOTE" | "IMAGE" | "LINK" | "FILE" | "QUESTION";

export type StudyPlace = {
  id: string;
  providerId: string;
  kind: "venue" | "stop";
  displayName: string;
  subtitle?: string;
  aliases: string[];
  coordinates: { latitude: number; longitude: number };
  nearbyStops: Array<{
    id: string;
    title: string;
    shortLabel?: string;
    busStopCode?: string;
    distanceMetres: number;
    walkMinutes: number;
  }>;
};

export type StudyModule = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  displayOrder: number;
  color?: string | null;
  workloadGroup?: string | null;
  currentMastery: StudyTrafficLight;
  masteryReason?: string | null;
  canvasCourseId?: string | null;
  canvasLastSeenAt?: string | null;
  userArchivedAt?: string | null;
  updatedAt: string;
  summary?: {
    status: StudyTrafficLight;
    open: number;
    overdue: number;
    unprocessed: number;
    plannedMinutes: number;
    actualMinutes: number;
    nearestDeadline?: string;
    mistakesDue: number;
    timedPracticeMissing: boolean;
    consecutiveRed: boolean;
  };
};

export type StudyItem = {
  id: string;
  publicId: string;
  moduleId: string;
  type: StudyItemType;
  title: string;
  notes?: string | null;
  source: "MANUAL" | "CANVAS";
  status: StudyItemStatus;
  priority: StudyPriority;
  dueAt?: string | null;
  deadlineStatus?: "TRUSTED" | "NEEDS_CONFIRMATION" | "UNDATED";
  deadlineIssue?: string | null;
  plannedMinutes?: number | null;
  actualMinutes: number;
  mastery: StudyTrafficLight;
  masteryReason?: string | null;
  createdAt: string;
  updatedAt: string;
  week?: { number: number } | null;
  module: { id: string; code: string; name: string; color?: string | null };
  canvasAssignment?: {
    id: string;
    htmlUrl?: string | null;
    status: "ACTIVE" | "SUBMITTED" | "MISSING";
    submissionState?: string | null;
    needsReview: boolean;
    missingSince?: string | null;
    lastSeenAt: string;
  } | null;
};

export type StudyResource = {
  id: string;
  publicId: string;
  moduleId: string;
  kind: StudyResourceKind;
  title: string;
  body?: string | null;
  url?: string | null;
  tags: string[];
  mediaKind?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  caption?: string | null;
  ocrText?: string | null;
  ocrConfidence?: number | null;
  pinnedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  hasMoreBody?: boolean;
  hasMoreOcr?: boolean;
  module: { id: string; code: string; name: string; color?: string | null };
  noteMeta?: {
    outgoingLinks: Array<{
      target: string;
      label: string;
      resolved: boolean;
      resource?: { id: string; publicId: string; title: string; moduleCode: string };
    }>;
    backlinks: Array<{ id: string; publicId: string; title: string; moduleCode: string }>;
    revisions: Array<{ id: string; title: string; body: string; tags: string[]; source: string; createdAt: string }>;
    revisionLimit: number;
  };
};

export type StudyMistake = {
  id: string;
  publicId: string;
  moduleId: string;
  itemId?: string | null;
  source: string;
  category: "CONCEPTUAL_MISUNDERSTANDING" | "WRONG_APPROACH" | "EXECUTION_CARELESS" | "TIME_MANAGEMENT";
  cause: string;
  prevention: string;
  revisitAt?: string | null;
  status: "OPEN" | "REATTEMPT_DUE" | "RESOLVED";
  module: { id: string; code: string; name: string };
  updatedAt: string;
};

export type StudySession = {
  id: string;
  moduleId: string;
  itemId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  method: string;
  topic?: string | null;
  focusStructure?: string | null;
  techniques: string[];
  result?: string | null;
  topicsMixed: string[];
  attemptedScore?: number | null;
  maximumScore?: number | null;
  usedNotes?: boolean | null;
  timed: boolean;
  archivedAt?: string | null;
  module: { id?: string; code: string; name: string; color?: string | null };
  item?: { publicId: string; title: string } | null;
  resources: Array<{
    resource: StudyResource;
  }>;
};

export type StudyAnalysisStatus = "QUEUED" | "RUNNING" | "COMPLETE" | "FAILED";
export type StudyAnalysisMode = "CONNECTIONS" | "QUIZ" | "BOTH";

export type StudyAnalysisFinding = {
  title: string;
  detail: string;
  evidenceIds: string[];
};

export type StudyAnalysisEvidence = {
  id: string;
  kind: "SESSION" | "RESOURCE" | "WORK_ITEM" | "CANVAS_MATERIAL" | "CANVAS_ASSIGNMENT";
  authority: "LEARNER_RECORD" | "OCR_TRANSCRIPT" | "COURSE_MATERIAL" | "COURSE_METADATA" | "ACTIVITY_LOG";
  title: string;
  detail?: string;
  occurredAt?: string;
  sessionId?: string;
  resourceId?: string;
  resourceKind?: string;
  itemId?: string;
  canvasMaterialId?: string;
  canvasAssignmentId?: string;
  courseModulePosition?: number;
};

export type StudyAnalysisMisconception = {
  title: string;
  learnerClaim: string;
  correction: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidenceIds: string[];
};

export type StudyAnalysisQuizItem = {
  question: string;
  type: "MCQ" | "SHORT" | "APPLICATION" | "CONNECTION";
  options: string[];
  answer: string;
  explanation: string;
  difficulty: "FOUNDATIONAL" | "CHALLENGING" | "CREATIVE";
  evidenceIds: string[];
};

export type StudyNoteEditSuggestion = {
  id: string;
  resourceId: string;
  status: "PENDING" | "APPLIED" | "DISMISSED" | "SUPERSEDED";
  originalBody: string;
  suggestedBody: string;
  rationale: string;
  evidenceIds: string[];
  reviewedAt?: string;
};

export type StudyModuleAnalysis = {
  id: string;
  moduleId: string;
  mode: StudyAnalysisMode;
  status: StudyAnalysisStatus;
  requestedAt: string;
  completedAt?: string;
  stale: boolean;
  summary?: string;
  connections?: StudyAnalysisFinding[];
  misconceptions?: StudyAnalysisMisconception[];
  quiz?: StudyAnalysisQuizItem[];
  pace?: { status: "AHEAD" | "ON_TRACK" | "BEHIND" | "UNKNOWN"; detail: string; evidenceIds: string[] };
  nextSteps?: StudyAnalysisFinding[];
  noteEditSuggestions?: StudyNoteEditSuggestion[];
  evidence?: StudyAnalysisEvidence[];
  sessionCount: number;
  resourceCount: number;
  errorMessage?: string;
};

export type StudyModuleAnalysisResponse = {
  available: boolean;
  reason?: string;
  analysis: StudyModuleAnalysis | null;
};

export type StudySnapshot = {
  generatedAt: string;
  workspace: {
    id: string;
    semesterName: string;
    semesterStartDate?: string | null;
    timezone: string;
    activeModuleId?: string | null;
    weeklyReviewDay: number;
    weeklyReviewTime: string;
    weeklyPreviewDay: number;
    weeklyPreviewTime: string;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
    maxRemindersPerDay: number;
    timedPracticeStartWeek: number;
    studyBlockRemindersEnabled: boolean;
    canvasSyncEnabled: boolean;
    activeOriginId?: string | null;
    activeOriginUntil?: string | null;
  };
  weekNumber: number;
  week?: { id: string; number: number; reviewCompleted: boolean; topPriorities: string[] };
  overview: {
    overallStatus: StudyTrafficLight;
    amberWarning: boolean;
    redWarning: boolean;
    topPriorities: string[];
    nextBlock?: { label: string; moduleCode?: string; startsAt: string };
    openSession?: {
      id: string;
      moduleCode: string;
      method: string;
      topic?: string | null;
      focusStructure?: string | null;
      techniques: string[];
      startedAt: string;
      item?: { id: string; publicId: string; title: string };
    };
    attention: {
      generatedAt: string;
      items: Array<{
        id: string;
        publicId: string;
        title: string;
        moduleCode: string;
        score: number;
        reasons: string[];
        recommendedAction: string;
        dueAt?: string;
        plannedMinutes?: number;
        priority: StudyPriority;
        deadlineStatus?: "TRUSTED" | "NEEDS_CONFIRMATION" | "UNDATED";
        deadlineIssue?: string;
      }>;
      overdue: number;
      dueToday: number;
      dueThisWeek: number;
      undated: number;
      missingCanvas: number;
      redModules: string[];
    };
  };
  modules: StudyModule[];
  inactiveModules: StudyModule[];
  items: StudyItem[];
  resources: StudyResource[];
  mistakes: StudyMistake[];
  sessions: StudySession[];
  reviews: Array<{
    id: string;
    wins: string[];
    unresolvedTopics: string[];
    nextWeekPriorities: string[];
    summary?: string | null;
    completedAt: string;
    week: { number: number; startDate: string; endDate: string; overallStatus: StudyTrafficLight };
  }>;
  scheduleBlocks: Array<{
    id: string;
    moduleId?: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    label: string;
    blockType: string;
    startWeek?: number | null;
    endWeek?: number | null;
    excludedWeeks: number[];
    venueId?: string | null;
    venueName?: string | null;
    destinationStopId?: string | null;
    defaultOriginId?: string | null;
    travelBufferMinutes: number;
    reminderLeadMinutes: number;
    active: boolean;
    module?: { id: string; code: string; name: string } | null;
    defaultOrigin?: { id: string; name: string } | null;
    reminderReadiness?: {
      status: "READY" | "BLOCKED" | "OUT_OF_RANGE";
      mode: "TRAVEL" | "BLOCK";
      reasons: string[];
    };
  }>;
  reminderDiagnostics?: {
    lastCheckedAt?: string | null;
    status: string;
    summary?: Record<string, unknown> | null;
  };
  canvas: {
    configured: boolean;
    state?: {
      status: "NEVER" | "RUNNING" | "READY" | "ERROR";
      canvasUserName?: string | null;
      lastAttemptAt?: string | null;
      lastSuccessfulAt?: string | null;
      nextSyncAt: string;
      lastError?: string | null;
      lastSummary?: {
        courses?: number;
        coursesReturned?: number;
        coursesSkippedOutOfTerm?: number;
        assignmentsSeen?: number;
        imported?: number;
        updated?: number;
        ignoredSubmitted?: number;
        ignoredInactive?: number;
        courseModulesSeen?: number;
        materialsSeen?: number;
        pagesCached?: number;
        filesIndexed?: number;
        courseDiagnostics?: Array<{
          canvasCourseId: string;
          moduleCode: string;
          termName?: string;
          termScope: "CURRENT" | "UNKNOWN" | "OUTSIDE";
          skippedReason?: string;
          assignmentsReturned: number;
        }>;
      } | null;
      consecutiveFailures: number;
      updatedAt: string;
    } | null;
    missingAssignments: Array<{
      id: string;
      title: string;
      missingSince?: string | null;
      module: { code: string; name: string };
      item: { publicId: string; title: string; status: StudyItemStatus };
    }>;
  };
  origins: Array<{
    id: string;
    name: string;
    providerVenueId?: string | null;
    providerStopId?: string | null;
    isDefault: boolean;
    active: boolean;
  }>;
};

export type StudyView = "study-overview" | "study-timetable" | "study-modules" | "study-work" | "study-library" | "study-review" | "study-search" | "study-focus" | "study-settings";
