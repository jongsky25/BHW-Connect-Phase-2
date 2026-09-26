"use client";
import { useId } from "react";
import type { LessonAsset } from "@/lib/elearning/types";

// One reference-lesson asset: a static image, or (INC-28 tier 2) a muted
// Remotion clip whose poster is its final all-steps frame. The clip never
// autoplays and preloads nothing until the learner presses play, so it
// costs no mobile data unasked and shows only the static poster under
// prefers-reduced-motion unless the learner chooses to play it. The alt
// text doubles as the clip's text version, shown on request.
export function LessonAssetFigure({
  asset: a,
  en,
  onEnded,
}: {
  asset: LessonAsset;
  en: boolean;
  // Fired when a video asset finishes playing. Used by the lesson-level
  // featured asset to gate lesson completion on having watched it.
  onEnded?: () => void;
}) {
  const textId = useId();
  const alt = en ? a.alt_en : a.alt_fil;
  const caption = en ? a.caption_en : a.caption_fil;
  if (!a.video)
    return (
      <figure className="my-4">
        {/* Public static assets; text alternatives remain visible if an image fails. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.path} width={720} height={360} loading="lazy" alt={alt} className="h-auto w-full rounded-lg" />
        <figcaption className="text-sm">{caption}</figcaption>
      </figure>
    );
  return (
    <figure className="my-4">
      <video
        controls
        muted
        playsInline
        preload="none"
        poster={a.path}
        width={854}
        height={480}
        aria-label={alt}
        aria-describedby={textId}
        className="h-auto w-full rounded-lg bg-canvas"
        onEnded={onEnded}
      >
        <source src={a.video.path} type="video/mp4" />
      </video>
      <figcaption className="text-sm">{caption}</figcaption>
      <details className="mt-1 text-sm">
        <summary className="cursor-pointer">{en ? "Steps as text" : "Mga hakbang bilang teksto"}</summary>
        <p id={textId}>{alt}</p>
      </details>
    </figure>
  );
}
