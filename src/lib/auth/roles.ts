// RFT A2 (docs/role-feature-toggles-plan.md §5): the single source of truth
// for the four user types, replacing the union literal that used to be
// duplicated across app-user.ts, admin/types.ts, super-admin/types.ts and
// layout.tsx.

export const APP_ROLES = ["bhw", "admin", "assessor", "designer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

// The user types an admin can preview as (View-as, plan §4.4). Admins are
// never previewable — nothing is ever hidden from an admin (plan §2 D2).
export const PREVIEWABLE_ROLES = ["bhw", "assessor", "designer"] as const;

export type PreviewableRole = (typeof PREVIEWABLE_ROLES)[number];
