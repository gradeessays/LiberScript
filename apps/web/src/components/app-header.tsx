'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@liberscript/ui';
import {
  organization,
  signOut,
  useActiveOrganization,
  useListOrganizations,
} from '@liberscript/auth/client';
import { ThemeToggle } from './theme-toggle';

export function AppHeader({ userName }: { userName: string }) {
  const router = useRouter();
  const { data: organizations } = useListOrganizations();
  const { data: active } = useActiveOrganization();

  async function onSwitch(value: string) {
    await organization.setActive({ organizationId: value === 'personal' ? null : value });
    router.refresh();
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
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
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <select
            aria-label="Active workspace"
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={active?.id ?? 'personal'}
            onChange={(e) => onSwitch(e.target.value)}
          >
            <option value="personal">Personal</option>
            {organizations?.map((org) => (
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
