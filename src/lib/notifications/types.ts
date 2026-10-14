export type NotificationType =
  | "announcement.created"
  | "survey.published"
  | "course.published"
  | "assessment.decided"
  | "assessment.arrangement"
  | "assessment.formal_feedback"
  | "assessment.chapter_review"
  | "forum.reply"
  | "flipchart.reviewed"
  | "user.transferred"
  | "feedback.reply"
  | "practice.feedback_released";

export type Notification = {
  id: string;
  notification_type: NotificationType;
  title_fil: string;
  title_en: string;
  body_fil: string;
  body_en: string;
  link_path: string | null;
  created_at: string;
};
