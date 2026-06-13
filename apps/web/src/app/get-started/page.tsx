'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  cn,
} from '@liberscript/ui';
import { signUp, useSession } from '@liberscript/auth/client';
import { PaymentProvider, PLAN_PRICING, PlanInterval } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';

const PLAN_ORDER = [PlanInterval.DAY, PlanInterval.WEEK, PlanInterval.MONTH, PlanInterval.YEAR] as const;

const PLAN_TAGLINE: Record<PlanInterval, string> = {
  DAY: 'Try it for 24 hours',
  WEEK: 'A full week to draft and revise',
  MONTH: 'Our most popular plan',
  YEAR: 'Best value for serious authors',
};

const PLAN_FEATURES = [
  'Unlimited books and projects',
  'Every export format: EPUB, PDF, DOCX',
  'BYO-AI writing, critique, and KDP metadata tools',
  'Custom fonts and premium design themes',
  'No watermark on exports',
];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function isPlanInterval(value: string | null): value is PlanInterval {
  return value !== null && Object.values(PlanInterval).includes(value as PlanInterval);
}

function PlanPicker({ plan, onSelect }: { plan: PlanInterval; onSelect: (plan: PlanInterval) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PLAN_ORDER.map((interval) => {
        const pricing = PLAN_PRICING[interval];
        const selected = interval === plan;
        return (
          <button
            key={interval}
            type="button"
            onClick={() => onSelect(interval)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-background hover:border-primary/40',
            )}
          >
            <p className="text-sm font-semibold">{pricing.label}</p>
            <p className="text-sm text-muted-foreground">{formatPrice(pricing.amountCents)}</p>
          </button>
        );
      })}
    </div>
  );
}

function PaymentStep({ plan }: { plan: PlanInterval }) {
  const pricing = PLAN_PRICING[plan];
  const providers = trpc.billing.listProviders.useQuery();
  const checkout = trpc.billing.checkout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const activeProviders = providers.data ?? [];
  const cardProvider =
    activeProviders.find((p) => p.provider === PaymentProvider.STRIPE) ??
    activeProviders.find((p) => p.provider === PaymentProvider.PAYSTACK);
  const paypalProvider = activeProviders.find((p) => p.provider === PaymentProvider.PAYPAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {pricing.label}: {formatPrice(pricing.amountCents)}
        </CardTitle>
        <CardDescription>
          {PLAN_TAGLINE[plan]} &middot; {pricing.durationDays} day{pricing.durationDays === 1 ? '' : 's'} of full
          access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
          {PLAN_FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {checkout.error && <p className="w-full text-sm text-destructive">{checkout.error.message}</p>}
        {providers.error && (
          <p className="w-full text-sm text-destructive">
            Couldn&apos;t load payment options: {providers.error.message}
          </p>
        )}
        {cardProvider && (
          <Button
            className="w-full"
            disabled={checkout.isPending}
            onClick={() => checkout.mutate({ provider: cardProvider.provider, interval: plan })}
          >
            {checkout.isPending && checkout.variables?.provider === cardProvider.provider
              ? 'Redirecting…'
              : 'Pay with card'}
          </Button>
        )}
        {paypalProvider && (
          <Button
            className="w-full"
            variant="outline"
            disabled={checkout.isPending}
            onClick={() => checkout.mutate({ provider: PaymentProvider.PAYPAL, interval: plan })}
          >
            {checkout.isPending && checkout.variables?.provider === PaymentProvider.PAYPAL
              ? 'Redirecting…'
              : 'PayPal'}
          </Button>
        )}
        {!cardProvider && !paypalProvider && !providers.isLoading && (
          <p className="text-center text-sm text-muted-foreground">
            Payments aren&apos;t configured yet. Check back soon.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}

function SignupStep({ plan }: { plan: PlanInterval }) {
  const pricing = PLAN_PRICING[plan];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { data, error } = await signUp.email({
      name,
      email,
      password,
      callbackURL: `/get-started?plan=${plan}`,
    });
    setPending(false);
    if (error) {
      setError(error.message ?? 'Sign up failed.');
      return;
    }
    if (!data?.token) {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a verification link to <strong>{email}</strong>. Confirm it and we&apos;ll bring you right back
            here to finish setting up your {pricing.label.toLowerCase()}.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          One step left for your {pricing.label.toLowerCase()} ({formatPrice(pricing.amountCents)}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Creating account…' : `Continue to payment`}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="font-medium text-primary hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="flex h-32 items-center justify-center pt-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </CardContent>
    </Card>
  );
}

function GetStartedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');
  const plan: PlanInterval = isPlanInterval(planParam) ? planParam : PlanInterval.MONTH;

  const { data: sessionData, isPending: sessionPending } = useSession();
  const sub = trpc.billing.getSubscription.useQuery(undefined, { enabled: Boolean(sessionData) });

  const hasAccess = Boolean(sessionData) && sub.data?.limits.projects === null;

  useEffect(() => {
    if (hasAccess) {
      router.replace('/dashboard');
    }
  }, [hasAccess, router]);

  function selectPlan(next: PlanInterval) {
    router.replace(`/get-started?plan=${next}`, { scroll: false });
  }

  let body: React.ReactNode;
  if (sessionPending || hasAccess || (sessionData && sub.isLoading)) {
    body = <LoadingCard />;
  } else if (sessionData) {
    body = <PaymentStep plan={plan} />;
  } else {
    body = <SignupStep plan={plan} />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Choose your plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every plan unlocks the full LiberScript toolkit. Pick whatever fits how you write, and switch any time.
        </p>
      </div>
      <PlanPicker plan={plan} onSelect={selectPlan} />
      {body}
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <Suspense fallback={null}>
      <GetStartedInner />
    </Suspense>
  );
}
