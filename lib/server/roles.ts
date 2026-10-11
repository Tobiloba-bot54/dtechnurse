// File: DTECHNURSE-SITE-main/lib/server/roles.ts
// Roles are intentionally extensible. New accounts must never receive admin access by default.
export type AccountRole = string;
export function canManageSite(role: AccountRole | null | undefined): boolean { return role === 'admin'; }
