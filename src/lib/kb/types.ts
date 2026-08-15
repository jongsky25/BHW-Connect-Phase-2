export type KbStatus = "draft" | "published";

export type KbCategory = {
  id: string;
  name_fil: string;
  name_en: string;
  slug: string;
  sort_order: number;
};

export type KbEntry = {
  id: string;
  category_id: string;
  question_fil: string;
  question_en: string;
  answer_fil: string;
  answer_en: string;
  keywords: string[];
  image_url: string | null;
  status: KbStatus;
  owner_user_id: string | null;
  review_due_on: string | null;
  updated_at: string;
  // INC-18b provenance. Optional rather than nullable: with the ai_gap_draft
  // flag off these columns are not selected at all, so "absent" and "null"
  // are genuinely different states here.
  ai_drafted_at?: string | null;
  ai_draft_confirmed_at?: string | null;
};

export type KbArticle = {
  id: string;
  category_id: string;
  title_fil: string;
  title_en: string;
  body_fil: object;
  body_en: object;
  status: KbStatus;
  owner_user_id: string | null;
  review_due_on: string | null;
  updated_at: string;
};

export type Synonym = {
  id: string;
  term: string;
  maps_to: string;
  language: "fil" | "en" | "taglish";
};

export type OwnerOption = {
  id: string;
  full_name: string;
  username: string;
};
