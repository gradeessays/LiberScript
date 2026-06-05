'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

export default function DashboardPage() {
  const utils = trpc.useUtils();
  const me = trpc.account.me.useQuery();
  const projects = trpc.project.list.useQuery();
  const [title, setTitle] = useState('');

  const create = trpc.project.create.useMutation({
    onSuccess: () => {
      setTitle('');
      void utils.project.list.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {me.data ? `Welcome, ${me.data.user.name}` : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          {me.data?.activeOrganizationId
            ? `Team workspace (role: ${me.data.activeRole ?? 'member'}).`
            : 'Your personal workspace.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New book</CardTitle>
          <CardDescription>Create a project, then upload your manuscript.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) create.mutate({ title: title.trim() });
            }}
            className="flex items-center gap-3"
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book title"
              maxLength={200}
            />
            <Button type="submit" disabled={create.isPending || !title.trim()}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </form>
          {create.error && <p className="mt-2 text-sm text-destructive">{create.error.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your books</CardTitle>
          <CardDescription>Projects in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : projects.data && projects.data.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {projects.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.manuscript
                        ? `${p.manuscript.wordCount.toLocaleString()} words · ${p.manuscript.readingMinutes} min read`
                        : 'No manuscript yet'}
                    </p>
                  </div>
                  <Link
                    href={`/projects/${p.id}`}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No books yet. Create your first one above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
