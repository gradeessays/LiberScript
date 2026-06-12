'use client';

import { useEffect, useState } from 'react';
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
} from '@liberscript/ui';
import { PAYMENT_PROVIDERS, PLAN_FIELD_KEYS, type PaymentProvider, type PlanFieldKey } from '@liberscript/core';
import { trpc } from '@/lib/trpc/client';

const PLAN_FIELD_LABELS: Record<PlanFieldKey, string> = {
  proMonthly: 'Pro — Monthly',
  proAnnual: 'Pro — Annual',
  teamMonthly: 'Team — Monthly',
  teamAnnual: 'Team — Annual',
};

interface ProviderData {
  provider: PaymentProvider;
  label: string;
  enabled: boolean;
  secretFieldsSet: Record<string, boolean>;
  config: Record<string, unknown>;
}

export default function AdminPaymentsPage() {
  const utils = trpc.useUtils();
  const providers = trpc.admin.listPaymentProviders.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment providers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure Stripe, PayPal, and Paystack credentials and plan IDs. Only enabled providers
          with all required fields set appear on the billing page.
        </p>
      </div>

      {providers.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {providers.data?.map((data) => (
            <ProviderCard
              key={data.provider}
              data={data}
              onSaved={() => void utils.admin.listPaymentProviders.invalidate()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({ data, onSaved }: { data: ProviderData; onSaved: () => void }) {
  const def = PAYMENT_PROVIDERS[data.provider];
  const save = trpc.admin.savePaymentProvider.useMutation({ onSuccess: onSaved });

  const [enabled, setEnabled] = useState(data.enabled);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of def.configFields) {
      const value = data.config[field.key];
      initial[field.key] = typeof value === 'string' ? value : (field.options?.[0]?.value ?? '');
    }
    return initial;
  });
  const [plans, setPlans] = useState<Record<string, string>>(() => {
    const existingPlans = (data.config.plans as Record<string, string> | undefined) ?? {};
    const initial: Record<string, string> = {};
    for (const key of PLAN_FIELD_KEYS) initial[key] = existingPlans[key] ?? '';
    return initial;
  });

  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  function handleSave() {
    save.mutate({
      provider: data.provider,
      enabled,
      secrets,
      config: { ...config, plans },
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{def.label}</CardTitle>
          <label className="flex items-center gap-2 text-sm font-normal">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled
          </label>
        </div>
        <CardDescription>
          Webhook URL:{' '}
          <span className="font-mono">
            {origin}/api/webhooks/{data.provider.toLowerCase()}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {def.secretFields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <Input
                type="password"
                placeholder={
                  data.secretFieldsSet[field.key]
                    ? '•••• configured (leave blank to keep)'
                    : field.placeholder
                }
                value={secrets[field.key] ?? ''}
                onChange={(e) => setSecrets((s) => ({ ...s, [field.key]: e.target.value }))}
              />
            </div>
          ))}
          {def.configFields.map((field) =>
            field.options ? (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={config[field.key] ?? field.options[0]?.value ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <Input
                  placeholder={field.placeholder}
                  value={config[field.key] ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                />
              </div>
            ),
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Plans ({def.planLabel})</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLAN_FIELD_KEYS.map((key) => (
              <Input
                key={key}
                placeholder={PLAN_FIELD_LABELS[key]}
                value={plans[key] ?? ''}
                onChange={(e) => setPlans((p) => ({ ...p, [key]: e.target.value }))}
              />
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
        {save.error && <p className="text-sm text-destructive">{save.error.message}</p>}
        {save.isSuccess && !save.isPending && <p className="text-sm text-emerald-600">Saved.</p>}
      </CardFooter>
    </Card>
  );
}
