'use client';

import { useState } from 'react';
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
import { slugify, MemberRole } from '@liberscript/core';
import {
  organization,
  useActiveOrganization,
  useListOrganizations,
} from '@liberscript/auth/client';

const ASSIGNABLE_ROLES = [MemberRole.ADMIN, MemberRole.EDITOR, MemberRole.VIEWER];
type AssignableRole = 'admin' | 'editor' | 'viewer';

export default function TeamSettingsPage() {
  const { data: organizations, refetch: refetchList } = useListOrganizations();
  const { data: active, refetch: refetchActive } = useActiveOrganization();

  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>(MemberRole.EDITOR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error } = await organization.create({
      name: teamName,
      slug: `${slugify(teamName)}-${Math.random().toString(36).slice(2, 6)}`,
    });
    if (!error && data) {
      await organization.setActive({ organizationId: data.id });
    }
    setBusy(false);
    if (error) {
      setError(error.message ?? 'Could not create team.');
      return;
    }
    setTeamName('');
    await Promise.all([refetchList(), refetchActive()]);
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    setError(null);
    setBusy(true);
    const { error } = await organization.inviteMember({
      email: inviteEmail,
      role: inviteRole as AssignableRole,
      organizationId: active.id,
    });
    setBusy(false);
    if (error) {
      setError(error.message ?? 'Could not send invitation.');
      return;
    }
    setInviteEmail('');
    await refetchActive();
  }

  async function changeRole(memberId: string, role: string) {
    if (!active) return;
    await organization.updateMemberRole({
      memberId,
      role: role as AssignableRole,
      organizationId: active.id,
    });
    await refetchActive();
  }

  async function removeMember(memberId: string) {
    if (!active) return;
    await organization.removeMember({ memberIdOrEmail: memberId, organizationId: active.id });
    await refetchActive();
  }

  async function cancelInvite(invitationId: string) {
    await organization.cancelInvitation({ invitationId });
    await refetchActive();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="text-muted-foreground">
          Create a team to share projects and collaborate. Switch the active workspace from the
          header.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Create a team</CardTitle>
          <CardDescription>You&apos;ll become its owner.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createTeam} className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="teamName">Team name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Acme Publishing"
                required
              />
            </div>
            <Button type="submit" disabled={busy || !teamName}>
              Create
            </Button>
          </form>
          {organizations && organizations.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              You belong to {organizations.length} team{organizations.length === 1 ? '' : 's'}.
            </p>
          )}
        </CardContent>
      </Card>

      {active ? (
        <Card>
          <CardHeader>
            <CardTitle>{active.name}</CardTitle>
            <CardDescription>Manage members and invitations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={invite} className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="inviteEmail">Invite by email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="writer@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteRole">Role</Label>
                <select
                  id="inviteRole"
                  className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={busy || !inviteEmail}>
                Invite
              </Button>
            </form>

            <div>
              <h3 className="mb-2 text-sm font-medium">Members</h3>
              <ul className="divide-y rounded-md border">
                {active.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm">{m.user.email}</span>
                    <div className="flex items-center gap-2">
                      {m.role === MemberRole.OWNER ? (
                        <span className="text-xs text-muted-foreground">owner</span>
                      ) : (
                        <>
                          <select
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            value={m.role}
                            onChange={(e) => changeRole(m.id, e.target.value)}
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}>
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {active.invitations.filter((i) => i.status === 'pending').length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Pending invitations</h3>
                <ul className="divide-y rounded-md border">
                  {active.invitations
                    .filter((i) => i.status === 'pending')
                    .map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-sm">
                          {i.email} <span className="text-muted-foreground">({i.role})</span>
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => cancelInvite(i.id)}>
                          Cancel
                        </Button>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardDescription>
              No active team. Create one above or switch to a team from the header to manage members.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
