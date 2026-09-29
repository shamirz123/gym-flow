import type { Role } from "../generated/prisma/client.js";

const ALL: Role[] = ["OWNER", "RECEPTIONIST", "TRAINER"];
const DESK: Role[] = ["OWNER", "RECEPTIONIST"];
const OWNER: Role[] = ["OWNER"];

/**
 * Who can do what.
 * OWNER: everything · RECEPTIONIST: members, fees, attendance, inbox · TRAINER: view members + attendance
 */
export const PERMISSIONS = {
  "dashboard:view": ALL,
  "revenue:view": OWNER,
  "members:view": ALL,
  "members:write": DESK,
  "members:delete": OWNER,
  "payments:view": DESK,
  "payments:write": DESK,
  "payments:delete": OWNER,
  "attendance:view": ALL,
  "attendance:checkin": ALL,
  "inbox:view": DESK,
  "inbox:write": DESK,
  "content:view": ALL,
  "content:write": OWNER,
  "staff:manage": OWNER,
  "billing:manage": OWNER,
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export const can = (role: Role, perm: Permission) => (PERMISSIONS[perm] as readonly Role[]).includes(role);

// Sent to the frontend so it can show only what this role may use
export const permissionsFor = (role: Role) => (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can(role, p));
