export type Announcement = {
  id: string;
  org_unit_id: string;
  author_user_id: string;
  body_fil: string;
  body_en: string;
  link_url: string | null;
  image_url: string | null;
  created_at: string;
  org_units: { name: string } | null;
  users: { full_name: string } | null;
};
