/**
 * Single source of truth for cross-cutting domain enums and limits.
 * Prisma enums mirror these string values; keep them in sync.
 */

/** Who owns a project: an individual user or a team (organization). */
export const OwnerType = {
  USER: 'USER',
  ORGANIZATION: 'ORGANIZATION',
} as const;
export type OwnerType = (typeof OwnerType)[keyof typeof OwnerType];

/**
 * Team membership roles (project-sharing RBAC — not tenant isolation).
 * Lowercase to match the values better-auth's organization plugin persists.
 */
export const MemberRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;
export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole];

/** Ordered from most to least privileged; higher rank = more privilege. */
export const ROLE_RANK: Record<MemberRole, number> = {
  owner: 3,
  admin: 2,
  editor: 1,
  viewer: 0,
};

/** Invitation lifecycle states (values persisted by better-auth). */
export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELED: 'canceled',
} as const;
export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

/** Usage-based plan tiers. */
export const PlanTier = {
  FREE: 'FREE',
  PRO: 'PRO',
  TEAM: 'TEAM',
} as const;
export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

/** Bring-your-own-key AI providers. */
export const AiProvider = {
  OPENAI: 'OPENAI',
  ANTHROPIC: 'ANTHROPIC',
  GEMINI: 'GEMINI',
  OPENROUTER: 'OPENROUTER',
} as const;
export type AiProvider = (typeof AiProvider)[keyof typeof AiProvider];

/** Output formats the export engine can produce. */
export const ExportFormat = {
  EPUB: 'EPUB',
  PDF: 'PDF',
  DOCX: 'DOCX',
} as const;
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

/** Manuscript import formats the parser understands. */
export const SourceFormat = {
  DOCX: 'DOCX',
  EPUB: 'EPUB',
  MARKDOWN: 'MARKDOWN',
  TXT: 'TXT',
  PDF: 'PDF',
} as const;
export type SourceFormat = (typeof SourceFormat)[keyof typeof SourceFormat];

/** Lifecycle status shared by async jobs (parse / analysis / export). */
export const JobStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/** Categories of manuscript critique findings (AutoCrit-style). */
export const FindingCategory = {
  ADVERB: 'ADVERB',
  PASSIVE_VOICE: 'PASSIVE_VOICE',
  REPETITION: 'REPETITION',
  CLICHE: 'CLICHE',
  DIALOGUE_TAG: 'DIALOGUE_TAG',
  SENTENCE_VARIATION: 'SENTENCE_VARIATION',
  FILLER_WORD: 'FILLER_WORD',
  PACING: 'PACING',
  SHOW_VS_TELL: 'SHOW_VS_TELL',
} as const;
export type FindingCategory = (typeof FindingCategory)[keyof typeof FindingCategory];

export const FindingSeverity = {
  INFO: 'INFO',
  SUGGESTION: 'SUGGESTION',
  WARNING: 'WARNING',
} as const;
export type FindingSeverity = (typeof FindingSeverity)[keyof typeof FindingSeverity];

/** Metered usage event kinds for usage-based plans. */
export const UsageMetric = {
  PROJECTS: 'PROJECTS',
  WORDS_PROCESSED: 'WORDS_PROCESSED',
  ANALYSIS_RUNS: 'ANALYSIS_RUNS',
  EXPORTS: 'EXPORTS',
  COLLABORATORS: 'COLLABORATORS',
} as const;
export type UsageMetric = (typeof UsageMetric)[keyof typeof UsageMetric];

/**
 * Plan limits. `null` means unlimited. Enforced in tRPC middleware before the
 * action runs and surfaced in the usage dashboard.
 */
export interface PlanLimits {
  projects: number | null;
  collaboratorsPerProject: number | null;
  analysisRunsPerMonth: number | null;
  exportsPerMonth: number | null;
  aiEnabled: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    projects: 3,
    collaboratorsPerProject: 1,
    analysisRunsPerMonth: 10,
    exportsPerMonth: 5,
    aiEnabled: true,
  },
  PRO: {
    projects: null,
    collaboratorsPerProject: 3,
    analysisRunsPerMonth: 200,
    exportsPerMonth: null,
    aiEnabled: true,
  },
  TEAM: {
    projects: null,
    collaboratorsPerProject: null,
    analysisRunsPerMonth: null,
    exportsPerMonth: null,
    aiEnabled: true,
  },
};

/** Reading-speed constant used by stats (words per minute, adult prose). */
export const WORDS_PER_MINUTE = 250;

/** Manuscript upload size ceiling (bytes) — 50 MB. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
