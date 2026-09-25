export type AdminUserRow = {
  id: string;
  username: string;
  full_name: string;
  role: "bhw" | "admin" | "assessor" | "designer";
  org_unit_id: string;
  status: "invited" | "active" | "deactivated";
  contact_number: string | null;
  email: string | null;
  address: string | null;
  // users.org_unit_id is a many-to-one FK, so PostgREST embeds this as a
  // single object — typed loosely because the generated client types
  // still infer an array. Read it through orgUnitName().
  org_units: OrgUnitEmbed;
};

export type OrgUnitEmbed = { name: string } | { name: string }[] | null;

export function orgUnitName(embed: OrgUnitEmbed | undefined): string | null {
  const unit = Array.isArray(embed) ? embed[0] : embed;
  return unit?.name ?? null;
}

export type OrgUnitOption = {
  id: string;
  name: string;
  level: string;
};

export type AdminCourseProgressRow = {
  id: string;
  course_id: string;
  bhw_user_id: string;
  status: "in_progress" | "content_completed" | "certified" | "failed_assessment";
  started_at: string;
  content_completed_at: string | null;
  courses: { title_fil: string; title_en: string } | null;
  users: {
    username: string;
    full_name: string;
    org_units: OrgUnitEmbed;
  } | null;
};

export type AdminModuleProgressCount = {
  course_progress_id: string;
  completed_count: number;
};

export type AdminTestAttemptRow = {
  course_id: string;
  bhw_user_id: string;
  phase: "pretest" | "posttest";
  score_percent: number;
};
