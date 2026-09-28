"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Size = { scale: number; width: number; height: number };

export function FittedLessonPage({
  content,
  pager,
  maxContentWidth,
  en,
}: {
  content: ReactNode;
  pager: ReactNode;
  maxContentWidth: number;
  en: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Size>({ scale: 1, width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const scale = fit.scale * zoom;

  useLayoutEffect(() => {
    const frame = viewport.current;
    const sheet = page.current;
    if (!frame || !sheet) return;
    let animationFrame = 0;

    const measure = () => {
      const style = getComputedStyle(frame);
      const availableWidth = frame.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const availableHeight = frame.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      if (!availableWidth || !availableHeight) return;

      // Text height changes in steps when lines wrap. Sample layout widths
      // and keep the one with the largest readable scale that fits both axes.
      const minWidth = Math.min(maxContentWidth, availableWidth);
      let fitWidth = minWidth;
      let fitScale = 0;
      for (let i = 0; i <= 24; i++) {
        const candidateWidth = minWidth + (maxContentWidth - minWidth) * i / 24;
        sheet.style.width = `${candidateWidth}px`;
        const candidateScale = Math.min(
          1,
          availableWidth / candidateWidth,
          (availableHeight - 2) / Math.max(sheet.scrollHeight, 1),
        );
        if (candidateScale > fitScale) {
          fitScale = candidateScale;
          fitWidth = candidateWidth;
        }
      }
      // Zoom changes the lesson's layout width too. Text wraps within the
      // gadget instead of requiring horizontal panning after magnification.
      const width = Math.min(fitWidth, availableWidth / (fitScale * zoom));
      sheet.style.width = `${width}px`;
      const height = sheet.scrollHeight;
      const next: Size = {
        scale: fitScale,
        width,
        height,
      };
      setFit((previous) =>
        Math.abs(previous.scale - next.scale) < 0.001 &&
        Math.abs(previous.width - next.width) < 1 &&
        Math.abs(previous.height - next.height) < 1
          ? previous
          : next,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(measure);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(frame);
    observer?.observe(sheet);
    window.addEventListener("resize", schedule);
    measure();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(animationFrame);
    };
  }, [maxContentWidth, zoom]);

  function changeZoom(next: number) {
    setZoom(next);
    if (next === 1 && viewport.current) {
      viewport.current.scrollTo?.({ top: 0, left: 0 });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-center gap-2 border-b border-ink/15 px-2 py-1">
        <button type="button" aria-label={en ? "Zoom out" : "Liitan"} disabled={zoom <= 1}
          onClick={() => changeZoom(Math.max(1, zoom - 0.25))}
          className="rounded border border-ink/25 px-3 py-1 disabled:opacity-40">−</button>
        <output aria-live="polite" className="min-w-14 text-center text-sm">{zoom}×</output>
        <button type="button" aria-label={en ? "Zoom in" : "Lakihan"} disabled={zoom >= 3}
          onClick={() => changeZoom(Math.min(3, zoom + 0.25))}
          className="rounded border border-ink/25 px-3 py-1 disabled:opacity-40">+</button>
        <button type="button" onClick={() => changeZoom(1)}
          className="rounded border border-ink/25 px-3 py-1 text-sm">
          {en ? "Fit" : "I-akma"}
        </button>
      </div>
      <div ref={viewport} data-reader-viewport className={`min-h-0 flex-1 px-3 py-2 sm:px-6 ${zoom > 1 ? "overflow-auto" : "flex flex-col justify-center overflow-hidden"}`}>
        <div style={{ width: fit.width ? fit.width * scale : "100%", height: fit.height ? fit.height * scale : "100%", marginInline: "auto" }}>
          <div ref={page} style={{ width: fit.width || "100%", transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {content}
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-ink/15 px-3 py-2 sm:px-6">{pager}</div>
    </div>
  );
}
