'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@liberscript/ui';
import { organization, signOut } from '@liberscript/auth/client';
import { trpc } from '@/lib/trpc/client';
import { ThemeToggle } from './theme-toggle';

export function AppHeader({ userName }: { userName: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  // Reuse the cached account query (shared with the dashboard) instead of two
  // separate better-auth org endpoints on every page load.
  const me = trpc.account.me.useQuery();

  async function onSwitch(value: string) {
    await organization.setActive({ organizationId: value === 'personal' ? null : value });
    await utils.account.me.invalidate();
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Liberscript
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/settings/team" className="hover:text-foreground">
              Team
            </Link>
            <Link href="/settings/ai" className="hover:text-foreground">
              AI Keys
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <select
            aria-label="Active workspace"
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={me.data?.activeOrganizationId ?? 'personal'}
            onChange={(e) => onSwitch(e.target.value)}
          >
            <option value="personal">Personal</option>
            {me.data?.organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push('/sign-in') } })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
