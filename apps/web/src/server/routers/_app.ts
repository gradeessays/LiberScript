import { createCallerFactory, router } from '../trpc';
import { healthRouter } from './health';
import { accountRouter } from './account';
import { projectRouter } from './project';
import { uploadRouter } from './upload';
import { chapterRouter } from './chapter';

export const appRouter = router({
  health: healthRouter,
  account: accountRouter,
  project: projectRouter,
  upload: uploadRouter,
  chapter: chapterRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
