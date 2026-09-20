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
  org_units: { name: string }[] | null;
};

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
    org_units: { name: string }[] | null;
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
