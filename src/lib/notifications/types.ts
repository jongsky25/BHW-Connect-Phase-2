export type NotificationType =
  | "announcement.created"
  | "survey.published"
  | "course.published"
  | "assessment.decided"
  | "forum.reply"
  | "flipchart.reviewed"
  | "user.transferred";

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
