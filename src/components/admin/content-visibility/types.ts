// RFT C3 (docs/role-feature-toggles-plan.md §4.5): the content types
// rpc_content_set_visibility accepts, shared by every consumer of this kit.
export type VisibilityContentType =
  | "kb_entry"
  | "kb_article"
  | "announcement"
  | "survey"
  | "course"
  | "flipchart"
  | "forum_thread";

export type VisibilityAction = "hide" | "show" | "archive" | "restore";

// forum_thread's hide/show stays INC-13 moderation (rpc_forum_thread_moderate,
// its own reason field); this kit only archives/restores it (plan §4.5).
export function actionsFor(contentType: VisibilityContentType): VisibilityAction[] {
  return contentType === "forum_thread" ? ["archive", "restore"] : ["hide", "show", "archive", "restore"];
}

export type VisibilityState = {
  hidden_at: string | null;
  archived_at: string | null;
};
