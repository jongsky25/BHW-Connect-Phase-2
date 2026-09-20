"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  buildNarrationZones,
  findActiveTimingIndex,
  timingsMatchSection,
} from "@/lib/elearning/narration-zones";
import type { CourseModuleAudio } from "@/lib/elearning/types";

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

type Props = {
  audio: CourseModuleAudio;
  heading: string;
  body: string;
  takeaway: string;
  // Rendered between the body and the takeaway, matching the order
  // LessonSectionBlock's no-audio path already uses — this component owns
  // the heading/body/takeaway markup (for the highlighted spans) but the
  // visual itself is unrelated to narration, so the caller still renders it.
  visual?: ReactNode;
};

// INC-27: pre-rendered audio (scripts/tts-render.mjs) plus a sentence-level
// read-along. If `audio.timings` doesn't match what the CURRENT section
// text would produce — the text was edited after the audio was last
// rendered — this degrades to the plain, unhighlighted block rather than
// highlighting the wrong spans; the caller never has to know which case it
// got. `<audio preload="none">` so the file is fetched only once the BHW
// actually presses play, matching §5.2's on-demand (not inlined) budget.
export function LessonNarration({ audio, heading, body, takeaway, visual }: Props) {
  const t = useTranslations("training");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [activeIndex, setActiveIndex] = useState(-1);

  const matches = timingsMatchSection(audio.timings, { heading, body, takeaway });
  const zones = matches ? buildNarrationZones({ heading, body, takeaway }) : [];

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function tick() {
    const el = audioRef.current;
    if (!el) return;
    const index = findActiveTimingIndex(audio.timings, el.currentTime * 1000);
    setActiveIndex((prev) => (prev === index ? prev : index));
    rafRef.current = requestAnimationFrame(tick);
  }

  function handlePlayPause() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
    }
  }

  function handleSpeedChange(next: (typeof SPEEDS)[number]) {
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function handlePlay() {
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }

  function handlePause() {
    setPlaying(false);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }

  function handleEnded() {
    setPlaying(false);
    setActiveIndex(-1);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }

  if (!matches) {
    // Same markup LessonSectionBlock renders with no audio at all — a
    // stale (text-changed-since-render) audio row is treated exactly like
    // a missing one, never as a broken or mis-highlighting control.
    return (
      <>
        <h3 className="font-medium text-ink">{heading}</h3>
        <p className="whitespace-pre-wrap text-sm text-ink/80">{body}</p>
        {visual}
        {takeaway ? (
          <p className="border-l-2 border-secondary pl-3 text-sm font-medium text-ink">
            {takeaway}
          </p>
        ) : null}
      </>
    );
  }

  let bodyCursor = 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-ink/10 bg-ink/5 p-2">
        <audio
          ref={audioRef}
          src={audio.audio_url}
          preload="none"
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
        />
        <button
          type="button"
          onClick={handlePlayPause}
          aria-label={playing ? t("narrationPauseAction") : t("narrationPlayAction")}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-ink/15 text-ink"
        >
          <span aria-hidden="true">{playing ? "❙❙" : "►"}</span>
        </button>
        <label className="flex items-center gap-1 text-xs text-ink/70">
          {t("narrationSpeedLabel")}
          <select
            value={speed}
            onChange={(event) =>
              handleSpeedChange(Number(event.target.value) as (typeof SPEEDS)[number])
            }
            className="min-h-[44px] rounded-md border border-ink/15 bg-transparent px-1"
          >
            {SPEEDS.map((option) => (
              <option key={option} value={option}>
                {option}×
              </option>
            ))}
          </select>
        </label>
      </div>

      <h3 className="font-medium text-ink">
        {zones[0]?.zone === "heading" ? (
          <NarrationSpan
            active={activeIndex === 0}
            text={zones[0].text}
            playing={playing}
          />
        ) : (
          heading
        )}
      </h3>

      <p className="whitespace-pre-wrap text-sm text-ink/80">
        {zones.map((zone, i) => {
          if (zone.zone !== "body") return null;
          const isFirst = bodyCursor === 0;
          bodyCursor += 1;
          return (
            <span key={i}>
              {isFirst ? "" : " "}
              <NarrationSpan active={activeIndex === i} text={zone.text} playing={playing} />
            </span>
          );
        })}
      </p>

      {visual}

      {takeaway ? (
        <p className="border-l-2 border-secondary pl-3 text-sm font-medium text-ink">
          {zones[zones.length - 1]?.zone === "takeaway" ? (
            <NarrationSpan
              active={activeIndex === zones.length - 1}
              text={zones[zones.length - 1].text}
              playing={playing}
            />
          ) : (
            takeaway
          )}
        </p>
      ) : null}
    </>
  );
}

function NarrationSpan({
  active,
  text,
  playing,
}: {
  active: boolean;
  text: string;
  playing: boolean;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // Auto-scroll follows the highlight; suppressed under
    // prefers-reduced-motion since the scroll itself is motion, even
    // though playback and highlighting (audio, not motion) are not.
    if (!active || !playing || prefersReducedMotion()) return;
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active, playing]);

  return (
    <span
      ref={ref}
      data-active={active ? "true" : undefined}
      className={active ? "rounded bg-primary/20 underline decoration-primary decoration-2" : undefined}
    >
      {text}
    </span>
  );
}
