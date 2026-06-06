'use client';

import { use } from 'react';
import Link from 'next/link';
import { DesignStudio } from '@/components/design-studio';

export default function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-4">
      <div>
        <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← Project
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Design &amp; preview</h1>
      </div>
      <DesignStudio projectId={id} />
    </div>
  );
}
