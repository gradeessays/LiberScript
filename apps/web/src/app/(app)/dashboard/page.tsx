'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';
import { DashboardUpload } from '@/components/dashboard-upload';

/**
 * The workspace entry point: open straight into the editor for the most recently
 * edited book. New users (no books yet) get a create-or-upload screen instead.
 */
export default function DashboardPage() {
  const router = useRouter();
  const me = trpc.account.me.useQuery();
  const projects = trpc.project.list.useQuery();
  const [title, setTitle] = useState('');

  const create = trpc.project.create.useMutation({
    onSuccess: (p) => router.replace(`/projects/${p.id}/edit`),
  });

  const latestId = projects.data?.[0]?.id;
  useEffect(() => {
    if (latestId) router.replace(`/projects/${latestId}/edit`);
  }, [latestId, router]);

  if (projects.isLoading || latestId) {
    return <p className="text-sm text-muted-foreground">Opening your workspace…</p>;
  }

  // Empty state — create the first book or upload a manuscript.
  return (
    <div className="mx-auto max-w-xl space-y-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {me.data ? `Welcome, ${me.data.user.name}` : 'Welcome'}
        </h1>
        <p className="text-muted-foreground">
          Create your first book or upload a manuscript — we&apos;ll detect its structure for you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New book</CardTitle>
          <CardDescription>Start from scratch, or import an existing file.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({ title: title.trim() || 'Untitled book' });
            }}
            className="flex items-center gap-3"
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book title"
              maxLength={200}
            />
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </form>
          {create.error && <p className="mt-2 text-sm text-destructive">{create.error.message}</p>}

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <DashboardUpload />
        </CardContent>
      </Card>
    </div>
  );
}
