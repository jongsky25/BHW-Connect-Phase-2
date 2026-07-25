export type FlipChartStatus = "draft" | "in_review" | "published";

export type FlipChart = {
  id: string;
  author_user_id: string;
  author_full_name: string;
  author_username: string;
  title_fil: string;
  title_en: string;
  status: FlipChartStatus;
  review_note: string | null;
  created_at: string;
};

export type FlipChartPage = {
  id: string;
  flip_chart_id: string;
  position: number;
  client_image_url: string;
  client_caption_fil: string;
  client_caption_en: string;
  script_fil: string;
  script_en: string;
};

export type DraftFlipChartPage = {
  client_image_url: string;
  client_caption_fil: string;
  client_caption_en: string;
  script_fil: string;
  script_en: string;
};

export function emptyDraftPage(): DraftFlipChartPage {
  return { client_image_url: "", client_caption_fil: "", client_caption_en: "", script_fil: "", script_en: "" };
}
