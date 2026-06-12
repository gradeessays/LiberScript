import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { isAdminEmail } from '@liberscript/core';
import { getServerSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!isAdminEmail(session?.user.email)) {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
