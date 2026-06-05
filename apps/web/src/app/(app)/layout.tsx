import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { AppHeader } from '@/components/app-header';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen">
      <AppHeader userName={session.user.name} />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
