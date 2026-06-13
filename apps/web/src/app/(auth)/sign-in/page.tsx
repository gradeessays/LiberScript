'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@liberscript/ui';
import { signIn, sendVerificationEmail } from '@liberscript/auth/client';

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendMsg(null);
    setUnverified(null);
    setPending(true);
    const { error } = await signIn.email({ email, password });
    setPending(false);
    if (error) {
      const code = (error as { code?: string }).code;
      if (error.status === 403 || code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(email);
        setError('Your email isn’t verified yet — verify it to sign in.');
      } else {
        setError(error.message ?? 'Sign in failed.');
      }
      return;
    }
    router.push('/dashboard');
  }

  async function resendVerification() {
    if (!unverified) return;
    setResendMsg('Sending…');
    const { error } = await sendVerificationEmail({
      email: unverified,
      callbackURL: '/dashboard',
    });
    if (!error) {
      setResendMsg('New verification email sent — check your inbox (and spam).');
      return;
    }
    const msg = error.message ?? '';
    // Already verified → the block was stale; just sign in again.
    if (/already verified/i.test(msg)) {
      setResendMsg('Your email is already verified — try signing in again.');
      setUnverified(null);
      setError(null);
      return;
    }
    setResendMsg(msg || 'Could not send — please try again in a minute.');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your Liberscript workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/reset-password"
                className="text-xs text-muted-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {unverified && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700/50 dark:bg-amber-950/30">
              <p className="text-muted-foreground">
                The verification link may have expired. Send a fresh one to{' '}
                <span className="font-medium">{unverified}</span>.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={resendVerification}
              >
                Resend verification email
              </Button>
              {resendMsg && <p className="mt-2 text-muted-foreground">{resendMsg}</p>}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {googleEnabled && (
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => signIn.social({ provider: 'google', callbackURL: '/dashboard' })}
          >
            Continue with Google
          </Button>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          New to Liberscript?{' '}
          <Link href="/get-started" className="font-medium text-primary hover:underline">
            Choose a plan to get started
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
