export type ForumStatus = "visible" | "hidden";

export type ForumCategory = {
  id: string;
  slug: string;
  name_fil: string;
  name_en: string;
  description_fil: string;
  description_en: string;
  sort_order: number;
};

export type ForumThread = {
  id: string;
  category_id: string;
  author_user_id: string;
  author_full_name: string;
  author_username: string;
  title: string;
  body: string;
  tags: string[];
  status: ForumStatus;
  hidden_reason: string | null;
  created_at: string;
  forum_categories: { name_fil: string; name_en: string } | null;
};

export type ForumPost = {
  id: string;
  thread_id: string;
  author_user_id: string;
  author_full_name: string;
  author_username: string;
  body: string;
  status: ForumStatus;
  hidden_reason: string | null;
  created_at: string;
};

export type ForumThreadModerationRow = {
  id: string;
  title: string;
  author_full_name: string;
  status: ForumStatus;
  hidden_reason: string | null;
  created_at: string;
  forum_categories: { name_fil: string; name_en: string } | null;
};

export type ForumPostModerationRow = {
  id: string;
  thread_id: string;
  body: string;
  author_full_name: string;
  status: ForumStatus;
  hidden_reason: string | null;
  created_at: string;
  forum_threads: { title: string } | null;
};
