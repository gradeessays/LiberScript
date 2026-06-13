import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function GetStartedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center gap-8 px-4 py-10">
      <Link href="/">
        <Logo />
      </Link>
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}
