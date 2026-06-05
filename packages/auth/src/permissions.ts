import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/organization/access';

/**
 * Access-control statements: the built-in organization statements (member /
 * invitation / org management) extended with Liberscript's product resources.
 * Roles below grant subsets of these.
 */
export const statement = {
  ...defaultStatements,
  project: ['create', 'read', 'update', 'delete', 'share'],
  manuscript: ['read', 'update'],
  analysis: ['create'],
  export: ['create'],
  billing: ['manage'],
} as const;

export const ac = createAccessControl(statement);

/** Full control of the team, its members, billing, and all content. */
export const owner = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete', 'share'],
  manuscript: ['read', 'update'],
  analysis: ['create'],
  export: ['create'],
  billing: ['manage'],
});

/** Manages members and content but cannot delete the org or manage billing. */
export const admin = ac.newRole({
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete', 'share'],
  manuscript: ['read', 'update'],
  analysis: ['create'],
  export: ['create'],
});

/** Works on content (write manuscripts, run analysis, export) but no admin. */
export const editor = ac.newRole({
  project: ['create', 'read', 'update'],
  manuscript: ['read', 'update'],
  analysis: ['create'],
  export: ['create'],
});

/** Read-only access to shared projects. */
export const viewer = ac.newRole({
  project: ['read'],
  manuscript: ['read'],
});

export const roles = { owner, admin, editor, viewer };
