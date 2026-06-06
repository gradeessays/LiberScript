'use client';

import {
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@liberscript/ui';
import { trpc } from '@/lib/trpc/client';

const FORMATS = [
  { value: 'EPUB', label: 'EPUB' },
  { value: 'DOCX', label: 'Word (DOCX)' },
  { value: 'COVER_PDF', label: 'Cover PDF' },
] as const;

const STATUS_LABEL: Record<string, string> = {
  QUEUED: 'Queued…',
  RUNNING: 'Building…',
  SUCCEEDED: 'Ready',
  FAILED: 'Failed',
};

export function ExportPanel({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const jobs = trpc.export.list.useQuery(
    { projectId },
    {
      refetchInterval: (q) =>
        q.state.data?.some((j) => j.status === 'QUEUED' || j.status === 'RUNNING') ? 2500 : false,
    },
  );
  const create = trpc.export.create.useMutation({
    onSuccess: () => utils.export.list.invalidate({ projectId }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export</CardTitle>
        <CardDescription>
          Generate a downloadable file. Output matches your design &amp; cover.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <Button
              key={f.value}
              variant="outline"
              size="sm"
              disabled={create.isPending}
              onClick={() => create.mutate({ projectId, format: f.value })}
            >
              Export {f.label}
            </Button>
          ))}
        </div>
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}

        {jobs.data && jobs.data.length > 0 && (
          <ul className="divide-y rounded-md border text-sm">
            {jobs.data.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>
                  {j.format.replace('_', ' ')}
                  <span
                    className={
                      j.status === 'FAILED'
                        ? 'ml-2 text-destructive'
                        : 'ml-2 text-muted-foreground'
                    }
                  >
                    {STATUS_LABEL[j.status] ?? j.status}
                    {j.status === 'FAILED' && j.error ? ` — ${j.error}` : ''}
                  </span>
                </span>
                {j.downloadUrl && (
                  <a
                    href={j.downloadUrl}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    download={j.fileName ?? undefined}
                  >
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Print-ready interior PDF (paginated) is coming next.
        </p>
      </CardContent>
    </Card>
  );
}
