// Super admin + linked test personas (migration 20260925000000). A persona
// is a real account the super admin switches the browser into, so every
// role's features — and how they relate — can be exercised from one login.

export type PersonaRole = "bhw" | "admin" | "assessor" | "designer";

export const PERSONA_ROLES: PersonaRole[] = ["bhw", "assessor", "designer", "admin"];

export type SuperAdminPersona = {
  persona_user_id: string;
  username: string;
  full_name: string;
  role: PersonaRole;
  status: "invited" | "active" | "deactivated";
  org_unit_id: string;
  org_unit_name: string;
  org_unit_level: string;
  course_progress_count: number;
  test_attempt_count: number;
  assessment_count: number;
  certificate_count: number;
  survey_response_count: number;
  onboarding_completed_at: string | null;
  created_at: string;
};

export type PersonaResetResult = {
  course_progress_cleared: number;
  test_attempts_cleared: number;
  assessments_cleared: number;
  certificates_cleared: number;
  enrollments_cleared: number;
  survey_responses_cleared: number;
  notifications_cleared: number;
  assessments_released: number;
};

// What the persona bar needs while the browser is signed in as a persona.
// Written at switch time because, as a persona, nothing can read the
// super admin's persona list without first restoring the super admin.
export type PersonaSnapshot = {
  owner: string;
  personas: { id: string; username: string; role: PersonaRole }[];
};

export type SuperAdminErrorKey =
  | "notAuthorizedError"
  | "sessionExpiredError"
  | "personaNotFoundError"
  | "personaInactiveError"
  | "outOfScopeError"
  | "invalidRoleError"
  | "genericError";

export type SuperAdminActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: SuperAdminErrorKey };

export function mapSuperAdminRpcError(message: string | undefined): SuperAdminErrorKey {
  if (!message) return "genericError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("persona not found")) return "personaNotFoundError";
  if (message.includes("persona is not active")) return "personaInactiveError";
  if (message.includes("out of scope")) return "outOfScopeError";
  if (message.includes("invalid role")) return "invalidRoleError";
  return "genericError";
}

export function isPersonaRole(value: unknown): value is PersonaRole {
  return typeof value === "string" && (PERSONA_ROLES as string[]).includes(value);
}

export function parsePersonaSnapshot(raw: string | undefined): PersonaSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersonaSnapshot>;
    if (typeof parsed.owner !== "string" || !Array.isArray(parsed.personas)) return null;
    const personas = parsed.personas.filter(
      (p): p is PersonaSnapshot["personas"][number] =>
        !!p &&
        typeof p.id === "string" &&
        typeof p.username === "string" &&
        isPersonaRole(p.role),
    );
    return { owner: parsed.owner, personas };
  } catch {
    return null;
  }
}
