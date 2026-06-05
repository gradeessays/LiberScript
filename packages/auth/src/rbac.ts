import { MemberRole, ROLE_RANK, type MemberRole as Role } from '@liberscript/core';

/** All role values, most → least privileged. */
export const ROLE_VALUES: Role[] = [
  MemberRole.OWNER,
  MemberRole.ADMIN,
  MemberRole.EDITOR,
  MemberRole.VIEWER,
];

/** True if `role` is at least as privileged as `required`. */
export function hasAtLeast(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/** Narrow an arbitrary string to a known role, or undefined. */
export function asRole(value: string | null | undefined): Role | undefined {
  return ROLE_VALUES.find((r) => r === value);
}
