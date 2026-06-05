import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Link href="/" className="text-xl font-semibold tracking-tight">
        Liberscript
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
