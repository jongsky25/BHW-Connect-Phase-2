"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SpotFeedbackItem, SpotFeedbackStatus } from "@/lib/spot-feedback/types";

const STATUSES: SpotFeedbackStatus[] = ["new", "in_review", "resolved", "dismissed"];

export function SpotFeedbackList({ items, admin, status = "", pagePath = "", page, hasMore }: {
  items: SpotFeedbackItem[];
  admin: boolean;
  status?: string;
  pagePath?: string;
  page: number;
  hasMore: boolean;
}) {
  const t = useTranslations("spotFeedback");
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [image, setImage] = useState<SpotFeedbackItem | null>(null);

  function href(nextPage: number, nextStatus = status, nextPath = pagePath) {
    const base = admin ? "/admin/feedback" : "/feedback";
    const params = new URLSearchParams();
    if (admin && nextStatus) params.set("status", nextStatus);
    if (admin && nextPath) params.set("path", nextPath);
    if (nextPage > 0) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }

  async function changeStatus(id: string, next: SpotFeedbackStatus) {
    setError("");
    setBusyId(id);
    const { error: rpcError } = await createClient().rpc("rpc_spot_feedback_set_status", {
      p_id: id, p_status: next,
    });
    if (rpcError) setError(t("actionError"));
    else router.refresh();
    setBusyId(null);
  }

  async function reply(id: string) {
    const message = drafts[id]?.trim();
    if (!message) return;
    setError("");
    setBusyId(id);
    const { error: rpcError } = await createClient().rpc("rpc_spot_feedback_reply", {
      p_id: id, p_message: message,
    });
    if (rpcError) setError(t("actionError"));
    else {
      setDrafts((current) => ({ ...current, [id]: "" }));
      router.refresh();
    }
    setBusyId(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {admin ? (
        <div className="space-y-3">
        <nav aria-label={t("statusFilter")} className="flex flex-wrap gap-2">
          {["", ...STATUSES].map((value) => (
            <Link key={value || "all"} href={href(0, value)}
              aria-current={status === value ? "page" : undefined}
              className={`min-h-[44px] rounded-full border px-3 py-2 text-sm ${status === value ? "border-primary bg-primary text-on-primary" : "border-ink/20 text-ink"}`}>
              {value ? t(`status.${value}`) : t("all")}
            </Link>
          ))}
        </nav>
        <form action="/admin/feedback" className="flex flex-wrap items-end gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label className="flex flex-col gap-1 text-sm" htmlFor="feedback-page-path">
            {t("pageFilter")}
            <input id="feedback-page-path" name="path" defaultValue={pagePath} placeholder="/chat"
              className="min-h-[44px] rounded-md border border-ink/20 bg-canvas px-3 py-2" />
          </label>
          <button type="submit" className="min-h-[44px] rounded-md border border-ink/20 px-3 py-2 text-sm">{t("applyFilter")}</button>
          {pagePath ? <Link href={href(0, status, "")} className="min-h-[44px] px-3 py-2 text-sm underline">{t("clearFilter")}</Link> : null}
        </form>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {items.length === 0 ? <p className="rounded-md border border-ink/10 p-6 text-sm text-ink/70">{t("empty")}</p> : null}
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-ink/10 bg-canvas p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ink/5 px-2 py-1 font-medium">{t(`status.${item.status}`)}</span>
                {admin ? <span className="text-ink/70">{item.submitter?.full_name ?? item.submitter?.username ?? item.submitted_by}</span> : null}
              </div>
              <time className="text-ink/60" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
            </div>
            <Link href={item.page_path} className="mt-3 block break-all text-sm text-primary-text underline">{item.page_path}</Link>
            {item.element_label || item.element_tag ? (
              <p className="mt-1 text-xs text-ink/60">{t("elementContext", { element: item.element_label || item.element_tag || "" })}</p>
            ) : null}
            <p className="mt-3 whitespace-pre-wrap text-sm">{item.message}</p>
            {admin && item.element_selector ? <p className="mt-2 break-all font-mono text-xs text-ink/50">{item.element_selector}</p> : null}
            {item.screenshot_url ? (
              <button type="button" onClick={() => setImage(item)} className="mt-3 min-h-[44px] rounded-md border border-ink/20 px-3 py-2 text-sm underline">
                {t("viewScreenshot")}
              </button>
            ) : null}
            {admin ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
                <label htmlFor={`status-${item.id}`} className="text-sm font-medium">{t("statusLabel")}</label>
                <select id={`status-${item.id}`} value={item.status} disabled={busyId === item.id}
                  onChange={(event) => void changeStatus(item.id, event.target.value as SpotFeedbackStatus)}
                  className="min-h-[44px] rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm">
                  {STATUSES.map((value) => <option key={value} value={value}>{t(`status.${value}`)}</option>)}
                </select>
              </div>
            ) : null}
            <div className="mt-4 border-t border-ink/10 pt-4">
              <h3 className="text-sm font-semibold">{t("replies")}</h3>
              {item.spot_feedback_replies.length === 0 ? <p className="mt-2 text-sm text-ink/60">{t("noReplies")}</p> : null}
              <ul className="mt-2 space-y-2">
                {item.spot_feedback_replies.map((replyItem) => (
                  <li key={replyItem.id} className="rounded-md bg-ink/5 p-3 text-sm">
                    <p className="font-medium">{replyItem.author?.full_name ?? replyItem.author?.username ?? t("team")}</p>
                    <p className="mt-1 whitespace-pre-wrap">{replyItem.message}</p>
                  </li>
                ))}
              </ul>
              <label htmlFor={`reply-${item.id}`} className="mt-4 block text-sm font-medium">{t("replyLabel")}</label>
              <textarea id={`reply-${item.id}`} value={drafts[item.id] ?? ""} maxLength={4000} rows={2}
                onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                className="mt-1 w-full rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm" />
              <button type="button" disabled={busyId === item.id || !drafts[item.id]?.trim()}
                onClick={() => void reply(item.id)}
                className="mt-2 min-h-[44px] rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60">
                {t("sendReply")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between gap-3">
        {page > 0 ? <Link href={href(page - 1)} className="min-h-[44px] px-3 py-2 text-sm underline">{t("previous")}</Link> : <span />}
        {hasMore ? <Link href={href(page + 1)} className="min-h-[44px] px-3 py-2 text-sm underline">{t("next")}</Link> : null}
      </div>
      {image?.screenshot_url ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={t("viewScreenshot")}
          onClick={() => setImage(null)}>
          <div className="max-h-full max-w-full overflow-auto" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setImage(null)} className="mb-2 min-h-[44px] rounded-md bg-canvas px-4 py-2 text-sm">{t("close")}</button>
            <div className="relative w-fit">
              {/* Signed private Storage URL; image optimization is not configured for it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.screenshot_url} alt={t("screenshotPreview")} className="block max-h-[80vh] max-w-full" />
              {image.anchor_x !== null && image.anchor_y !== null ? (
                <span aria-label={t("pinLocation")} className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-danger ring-2 ring-white"
                  style={{ left: `${image.anchor_x * 100}%`, top: `${image.anchor_y * 100}%` }} />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
