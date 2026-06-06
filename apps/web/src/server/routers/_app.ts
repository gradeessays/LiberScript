import { createCallerFactory, router } from '../trpc';
import { healthRouter } from './health';
import { accountRouter } from './account';
import { projectRouter } from './project';
import { uploadRouter } from './upload';
import { chapterRouter } from './chapter';
import { formattingRouter } from './formatting';
import { coverRouter } from './cover';
import { exportRouter } from './export';

export const appRouter = router({
  health: healthRouter,
  account: accountRouter,
  project: projectRouter,
  upload: uploadRouter,
  chapter: chapterRouter,
  formatting: formattingRouter,
  cover: coverRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
