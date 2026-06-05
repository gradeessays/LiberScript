import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/_app';

/** Typed tRPC React hooks bound to the app router. */
export const trpc = createTRPCReact<AppRouter>();
