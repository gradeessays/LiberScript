import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import { ac, roles } from './permissions';

/**
 * Browser auth client. Mirrors the server's organization access-control config
 * so client-side permission checks match the server.
 */
export const authClient = createAuthClient({
  plugins: [organizationClient({ ac, roles })],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  organization,
  useListOrganizations,
  useActiveOrganization,
} = authClient;
