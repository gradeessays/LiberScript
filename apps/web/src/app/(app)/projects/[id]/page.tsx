'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';
import { UploadManuscript } from '@/components/upload-manuscript';

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();

  const project = trpc.project.get.useQuery(
    { id },
    {
      // While a manuscript is being parsed in the worker, poll until chapters appear.
      refetchInterval: (query) =>
        query.state.data && !query.state.data.manuscript ? 3000 : false,
    },
  );

  if (project.isLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (project.error) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{project.error.message}</p>
        <Link href="/dashboard" className="text-sm text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const data = project.data!;
  const manuscript = data.manuscript;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
          <div className="flex gap-2">
            <Link
              href={`/projects/${id}/design`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Design &amp; preview
            </Link>
            <Link href={`/projects/${id}/edit`} className={buttonVariants({ size: 'sm' })}>
              Open editor
            </Link>
          </div>
        </div>
        {manuscript && (
          <p className="text-muted-foreground">
            {manuscript.wordCount.toLocaleString()} words · {manuscript.readingMinutes} min read
            {manuscript.sourceFormat ? ` · imported from ${manuscript.sourceFormat}` : ''}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manuscript</CardTitle>
          <CardDescription>
            {manuscript
              ? 'Re-upload to replace the current manuscript.'
              : 'Upload a manuscript to detect chapters and compute stats.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadManuscript projectId={id} onParsed={() => void utils.project.get.invalidate({ id })} />
        </CardContent>
      </Card>

      {manuscript && (
        <Card>
          <CardHeader>
            <CardTitle>Chapters ({manuscript.chapters.length})</CardTitle>
            <CardDescription>Detected from your uploaded manuscript.</CardDescription>
          </CardHeader>
          <CardContent>
            {manuscript.chapters.length > 0 ? (
              <ol className="divide-y rounded-md border">
                {manuscript.chapters.map((ch, i) => (
                  <li key={ch.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <span>
                      <span className="text-muted-foreground">{i + 1}.</span> {ch.title}
                      {ch.subtitle && (
                        <span className="text-muted-foreground"> — {ch.subtitle}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {ch.wordCount.toLocaleString()} words
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Parsing… this updates automatically.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
