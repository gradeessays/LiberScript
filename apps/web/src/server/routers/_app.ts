import { createCallerFactory, router } from '../trpc';
import { healthRouter } from './health';
import { accountRouter } from './account';
import { projectRouter } from './project';
import { uploadRouter } from './upload';
import { chapterRouter } from './chapter';
import { formattingRouter } from './formatting';
import { coverRouter } from './cover';
import { exportRouter } from './export';
import { analysisRouter } from './analysis';
import { aiRouter } from './ai';
import { adminRouter } from './admin';
import { styleProfileRouter } from './style-profile';
import { metadataRouter } from './metadata';
import { billingRouter } from './billing';

export const appRouter = router({
  health: healthRouter,
  account: accountRouter,
  project: projectRouter,
  upload: uploadRouter,
  chapter: chapterRouter,
  formatting: formattingRouter,
  cover: coverRouter,
  export: exportRouter,
  analysis: analysisRouter,
  ai: aiRouter,
  admin: adminRouter,
  styleProfile: styleProfileRouter,
  metadata: metadataRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
