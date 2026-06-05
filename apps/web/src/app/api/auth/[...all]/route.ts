import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@liberscript/auth';

// better-auth runs on the Node runtime (Prisma adapter + crypto).
export const runtime = 'nodejs';

export const { GET, POST } = toNextJsHandler(auth);
