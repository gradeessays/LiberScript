import { z } from 'zod';

/**
 * Job catalog. Each job has a name and a zod-validated payload schema so the
 * producer (web) and consumer (worker) share one typed contract.
 */
export const JobName = {
  PING: 'ping',
  PARSE_MANUSCRIPT: 'parse-manuscript',
  RUN_ANALYSIS: 'run-analysis',
  GENERATE_EXPORT: 'generate-export',
  GENERATE_AI_METADATA: 'generate-ai-metadata',
} as const;
export type JobName = (typeof JobName)[keyof typeof JobName];

export const pingPayload = z.object({
  message: z.string().default('ping'),
  at: z.string().datetime().optional(),
});

export const parseManuscriptPayload = z.object({
  projectId: z.string(),
  assetId: z.string(),
  /** Replace the book's content, or append the parsed sections after it. */
  mode: z.enum(['replace', 'append']).default('replace'),
});

export const runAnalysisPayload = z.object({
  analysisRunId: z.string(),
  projectId: z.string(),
  aiEnhanced: z.boolean().default(false),
});

export const generateExportPayload = z.object({
  exportJobId: z.string(),
  projectId: z.string(),
});

export const generateAiMetadataPayload = z.object({
  projectId: z.string(),
  apiKeyId: z.string(),
  kind: z.enum(['blurb', 'keywords', 'categories', 'title']),
});

/** Map each job name to its payload schema. */
export const jobPayloadSchemas = {
  [JobName.PING]: pingPayload,
  [JobName.PARSE_MANUSCRIPT]: parseManuscriptPayload,
  [JobName.RUN_ANALYSIS]: runAnalysisPayload,
  [JobName.GENERATE_EXPORT]: generateExportPayload,
  [JobName.GENERATE_AI_METADATA]: generateAiMetadataPayload,
} as const;

export type JobPayloadMap = {
  [K in keyof typeof jobPayloadSchemas]: z.infer<(typeof jobPayloadSchemas)[K]>;
};
