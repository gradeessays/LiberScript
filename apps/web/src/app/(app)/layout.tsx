import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { AppHeader } from '@/components/app-header';

// Authenticated pages read the session cookie (headers) — always server-rendered
// per request, never statically prerendered at build time.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen">
      <AppHeader userName={session.user.name} />
      <main className="px-4 py-6 sm:px-6 lg:px-10 xl:px-16 sm:py-8">{children}</main>
    </div>
  );
}
