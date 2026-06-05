'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@liberscript/ui';
import { organization, useSession } from '@liberscript/auth/client';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const invitationId = params.id;
  const { data: sessionData, isPending: sessionPending } = useSession();

  const [orgName, setOrgName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionPending || !sessionData) return;
    organization.getInvitation({ query: { id: invitationId } }).then(({ data, error }) => {
      if (error) setError(error.message ?? 'Invitation not found or expired.');
      else setOrgName(data?.organizationName ?? 'this team');
    });
  }, [invitationId, sessionData, sessionPending]);

  async function accept() {
    setBusy(true);
    setError(null);
    const { data, error } = await organization.acceptInvitation({ invitationId });
    if (!error && data) {
      await organization.setActive({ organizationId: data.invitation.organizationId });
    }
    setBusy(false);
    if (error) {
      setError(error.message ?? 'Could not accept invitation.');
      return;
    }
    router.push('/dashboard');
  }

  if (!sessionPending && !sessionData) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to accept</CardTitle>
            <CardDescription>You need an account to join this team.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/sign-in?redirect=/accept-invitation/${invitationId}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Go to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Team invitation</CardTitle>
          <CardDescription>
            {orgName ? `You've been invited to join ${orgName}.` : 'Loading invitation…'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={accept} disabled={busy || !orgName} className="w-full">
            {busy ? 'Joining…' : 'Accept invitation'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
