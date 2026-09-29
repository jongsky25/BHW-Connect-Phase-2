import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpotFeedbackItem } from "./types";

const COLUMNS = `id, submitted_by, page_path, message, element_selector, element_label,
  element_tag, anchor_x, anchor_y, screenshot_path, status, created_at,
  submitter:users!spot_feedback_submitted_by_fkey(full_name, username),
  spot_feedback_replies(id, author_id, message, created_at,
    author:users!spot_feedback_replies_author_id_fkey(full_name, username))`;

export async function loadSpotFeedback(
  supabase: SupabaseClient,
  options: { mine?: string; status?: string; page?: number; pagePath?: string },
): Promise<{ items: SpotFeedbackItem[]; hasMore: boolean }> {
  const page = Math.max(0, Math.min(100, options.page ?? 0));
  let query = supabase.from("spot_feedback").select(COLUMNS).order("created_at", { ascending: false });
  if (options.mine) query = query.eq("submitted_by", options.mine);
  if (options.pagePath?.startsWith("/") && options.pagePath.length <= 300) {
    query = query.eq("page_path", options.pagePath);
  }
  if (options.status && ["new", "in_review", "resolved", "dismissed"].includes(options.status)) {
    query = query.eq("status", options.status);
  }
  const { data, error } = await query.range(page * 50, page * 50 + 50);
  if (error) throw error;
  const rows = (data ?? []) as unknown as SpotFeedbackItem[];
  const items = await Promise.all(rows.slice(0, 50).map(async (item) => {
    let screenshot_url: string | null = null;
    if (item.screenshot_path) {
      const { data: signed } = await supabase.storage.from("spot-feedback")
        .createSignedUrl(item.screenshot_path, 15 * 60);
      screenshot_url = signed?.signedUrl ?? null;
    }
    return {
      ...item,
      screenshot_url,
      spot_feedback_replies: [...(item.spot_feedback_replies ?? [])]
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    };
  }));
  return { items, hasMore: rows.length > 50 };
}
