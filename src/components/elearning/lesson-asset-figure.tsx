"use client";
import { useEffect, useId, useRef } from "react";
import type { LessonAsset } from "@/lib/elearning/types";
import type { LessonTranslationLanguage } from "@/lib/elearning/lesson-translation";

// One reference-lesson asset: a static image, or (INC-28 tier 2) a Remotion
// clip whose poster is its final all-steps frame. A narrated clip (`videos`)
// plays the render in the learner's language with sound and captions; an
// older silent clip (`video`) stays muted. Either way the clip never
// autoplays and preloads nothing until the learner presses play, so it
// costs no mobile data unasked and shows only the static poster under
// prefers-reduced-motion unless the learner chooses to play it. The alt
// text is the fallback text version; translated stories can supply a transcript.
export function LessonAssetFigure({
  asset: a,
  en,
  language,
  onEnded,
}: {
  asset: LessonAsset;
  en: boolean;
  language?: LessonTranslationLanguage;
  // Optional callback for a caller that needs to react when playback ends.
  onEnded?: () => void;
}) {
  const textId = useId();
  const alt = en ? a.alt_en : a.alt_fil;
  const caption = en ? a.caption_en : a.caption_fil;
  const video = (en ? a.videos?.en : a.videos?.fil) ?? a.video;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const player = videoRef.current;
    return () => { if (player && !player.paused) player.pause(); };
  }, [video?.path]);
  if (!video)
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
        ref={videoRef}
        // Keyed by file so switching language loads the other render.
        key={video.path}
        controls
        muted={!a.videos}
        playsInline
        preload="none"
        poster={video.poster?.path ?? a.path}
        width={854}
        height={480}
        aria-label={alt}
        aria-describedby={textId}
        className="h-auto w-full rounded-lg bg-canvas"
        onEnded={onEnded}
      >
        <source src={video.path} type="video/mp4" />
        {video.captions && (
          <track
            kind="captions"
            src={video.captions.path}
            srcLang={language ?? (en ? "en" : "fil")}
            label={language === "hil" ? "Hiligaynon (Ilonggo)" : language === "ceb" ? "Bisaya (Cebuano)" : en ? "English" : "Filipino"}
            default
          />
        )}
      </video>
      <figcaption className="text-sm">{caption}</figcaption>
      <details className="mt-1 text-sm">
        <summary className="cursor-pointer">{language === "hil" ? "Mga tikang bilang teksto" : language === "ceb" ? "Mga lakang isip teksto" : en ? "Steps as text" : "Mga hakbang bilang teksto"}</summary>
        {a.text_steps?.length ? <div id={textId}>
          <p>{alt}</p>
          <ol className="mt-3 space-y-3">
            {a.text_steps.map(step => <li key={step.id}><h3 className="font-semibold">{step.title}</h3><p>{step.text}</p></li>)}
          </ol>
        </div> : <p id={textId}>{alt}</p>}
      </details>
    </figure>
  );
}
