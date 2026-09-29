export type SpotFeedbackStatus = "new" | "in_review" | "resolved" | "dismissed";

export type SpotFeedbackReply = {
  id: string;
  author_id: string;
  message: string;
  created_at: string;
  author: { full_name: string; username: string } | null;
};

export type SpotFeedbackItem = {
  id: string;
  submitted_by: string;
  page_path: string;
  message: string;
  element_selector: string | null;
  element_label: string | null;
  element_tag: string | null;
  anchor_x: number | null;
  anchor_y: number | null;
  screenshot_path: string | null;
  screenshot_url: string | null;
  status: SpotFeedbackStatus;
  created_at: string;
  submitter: { full_name: string; username: string } | null;
  spot_feedback_replies: SpotFeedbackReply[];
};
