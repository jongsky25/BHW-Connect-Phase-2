"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { usePreview } from "@/components/preview/preview-provider";
import { describeSpot, type SpotElement } from "@/lib/spot-feedback/element";

type Pick = { x: number; y: number; element: SpotElement; pagePath: string };

export function SpotFeedbackWidget() {
  const t = useTranslations("spotFeedback");
  const isPreview = usePreview();
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState<Pick | null>(null);
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!picking) return;
    function click(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("[data-spot-feedback-ui]")) return;
      event.preventDefault();
      event.stopPropagation();
      const element = document.elementFromPoint(event.clientX, event.clientY) ?? target;
      setPick({
        x: Math.min(1, Math.max(0, event.clientX / document.documentElement.clientWidth)),
        y: Math.min(1, Math.max(0, event.clientY / document.documentElement.clientHeight)),
        element: describeSpot(element),
        pagePath: window.location.pathname,
      });
      setPicking(false);
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") setPicking(false);
    }
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", keydown);
    };
  }, [picking]);

  useEffect(() => {
    if (pick) inputRef.current?.focus();
  }, [pick]);

  useEffect(() => {
    if (!pick) return;
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) close();
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [pick, busy]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function close() {
    setPick(null);
    setMessage("");
    setScreenshot(null);
    setPreviewUrl(null);
    setError("");
  }

  async function capture() {
    if (!pick || capturing) return;
    setCapturing(true);
    setError("");
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(document.body, {
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
        x: window.scrollX,
        y: window.scrollY,
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
        scale: Math.min(window.devicePixelRatio || 1, 1),
        useCORS: true,
        logging: false,
        ignoreElements: (element) => Boolean(element.closest("[data-spot-feedback-ui]")),
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob || blob.size > 5 * 1024 * 1024) throw new Error("capture failed");
      setScreenshot(new File([blob], "page.png", { type: "image/png" }));
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setError(t("captureError"));
    } finally {
      setCapturing(false);
    }
  }

  async function submit() {
    if (!pick || !message.trim() || busy) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("message", message.trim());
    form.set("page_path", pick.pagePath);
    form.set("element_selector", pick.element.selector);
    form.set("element_label", pick.element.label);
    form.set("element_tag", pick.element.tag);
    form.set("anchor_x", String(pick.x));
    form.set("anchor_y", String(pick.y));
    if (screenshot) form.set("screenshot", screenshot);
    try {
      const response = await fetch("/api/spot-feedback", { method: "POST", body: form });
      if (!response.ok) throw new Error("submit failed");
      close();
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 5000);
    } catch {
      setError(t("sendError"));
    } finally {
      setBusy(false);
    }
  }

  if (isPreview) return null;
  return (
    <div data-spot-feedback-ui>
      {picking ? (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-ink/10 bg-canvas px-4 py-3 shadow-lg sm:bottom-auto sm:top-0" data-spot-feedback-ui>
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <p className="text-sm font-medium">{t("pickHint")}</p>
            <button type="button" onClick={() => setPicking(false)} className="min-h-[44px] rounded-md border border-ink/20 px-3 py-2 text-sm">{t("cancel")}</button>
          </div>
        </div>
      ) : null}
      {!pick && !picking ? (
        <div className="fixed bottom-4 right-4 z-[50] flex flex-col items-end gap-2" data-spot-feedback-ui>
          {success ? <p role="status" className="rounded-md bg-canvas px-3 py-2 text-sm shadow">{t("sent")}</p> : null}
          <Link href="/feedback" className="rounded-full border border-ink/20 bg-canvas px-4 py-2 text-sm shadow">{t("mine")}</Link>
          <button type="button" onClick={() => setPicking(true)} className="min-h-[48px] rounded-full bg-primary px-5 py-3 font-medium text-on-primary shadow-lg">
            {t("button")}
          </button>
        </div>
      ) : null}
      {pick ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" data-spot-feedback-ui>
          <section role="dialog" aria-modal="true" aria-labelledby="spot-feedback-title" className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-canvas p-5 shadow-xl sm:rounded-xl">
            <h2 id="spot-feedback-title" className="text-xl font-semibold">{t("title")}</h2>
            <p className="mt-1 text-sm text-ink/70">{t("onPage", { page: pick.pagePath })}</p>
            {pick.element.label ? <p className="mt-1 text-sm text-ink/70">{t("onElement", { element: pick.element.label })}</p> : null}
            <label htmlFor="spot-feedback-message" className="mt-4 block text-sm font-medium">{t("messageLabel")}</label>
            <textarea id="spot-feedback-message" ref={inputRef} value={message} maxLength={4000} rows={4}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-1 w-full rounded-md border border-ink/20 bg-canvas px-3 py-2 text-ink focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30" />
            <div className="mt-4 rounded-md border border-ink/10 p-3">
              <p className="text-sm font-medium">{t("screenshotTitle")}</p>
              <p className="mt-1 text-xs text-ink/70">{t("screenshotPrivacy")}</p>
              {previewUrl ? (
                <div className="mt-3">
                  {/* Browser-generated object URL; next/image does not optimize local captures. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt={t("screenshotPreview")} className="max-h-48 w-full rounded-md border border-ink/10 object-contain" />
                  <button type="button" onClick={() => { setScreenshot(null); setPreviewUrl(null); }} className="mt-2 min-h-[44px] text-sm underline">{t("removeScreenshot")}</button>
                </div>
              ) : (
                <button type="button" disabled={capturing} onClick={capture} className="mt-2 min-h-[44px] rounded-md border border-ink/20 px-3 py-2 text-sm disabled:opacity-60">
                  {capturing ? t("capturing") : t("attachScreenshot")}
                </button>
              )}
            </div>
            {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={close} disabled={busy} className="min-h-[44px] rounded-md border border-ink/20 px-4 py-2">{t("cancel")}</button>
              <button type="button" onClick={submit} disabled={busy || !message.trim()} className="min-h-[44px] rounded-md bg-primary px-4 py-2 font-medium text-on-primary disabled:opacity-60">
                {busy ? t("sending") : t("send")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
