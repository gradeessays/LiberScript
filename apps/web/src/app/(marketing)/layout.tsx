import type { ReactNode } from 'react';
import Link from 'next/link';
import { buttonVariants } from '@liberscript/ui';
import { getServerSession } from '@/lib/auth-server';
import { Logo } from '@/components/logo';
import { SiteFooter } from '@/components/site-footer';

const NAV_LINKS = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Guides', href: '/guides' },
  { label: 'About', href: '/about' },
];

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Link href="/dashboard" className={buttonVariants({ size: 'sm' })}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                  Sign in
                </Link>
                <Link href="/get-started" className={buttonVariants({ size: 'sm' })}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
