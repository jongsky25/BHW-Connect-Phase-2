"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import {
  buildNarrationZones,
  findActiveTimingIndex,
  splitIntoSentences,
  timingsMatchSection,
} from "@/lib/elearning/narration-zones";
import { prefersReducedMotion } from "@/lib/elearning/reduced-motion";
import type { ReferenceNarrationEntry } from "@/lib/elearning/reference-narration";

import {
  NARRATION_SPEEDS as SPEEDS, useNarrationSpeed, setNarrationSpeed,
  useNarrationContinuation, enterNarrationScope, setNarrationContinuation,
  armNarrationContinuation, pauseNarrationContinuation, shouldContinueNarration,
} from "@/lib/elearning/narration-preferences";

// This approved records paragraph ends with a training-data disclaimer. Keep
// its exact text and narration, but set the final sentence apart visually.
const recordsFictionBody = {
  en: "After speaking with Aling Nena, BHW Riza returns to the health station. She has a fictional note about the conversation, but she will not put it into just any list. She asks the midwife, “What information is needed, and what will it be used for?” Accurate records help the health team understand community needs and plan programs. Every example in this lesson is fictional; it contains no real personal data or official form.",
  fil: "Pagkatapos kausapin si Aling Nena, bumalik si BHW Riza sa health station. May kathang-isip siyang tala ng napag-usapan, ngunit hindi niya ito basta ilalagay sa kahit aling listahan. Tinanong niya ang midwife: “Anong impormasyon ang kailangan, at para saan ito gagamitin?” Mahalaga ang wastong tala sa pag-unawa sa pangangailangan ng komunidad at sa pagpaplano ng programa. Ang lahat ng halimbawa sa araling ito ay kathang-isip; wala itong tunay na personal na datos o opisyal na form.",
};
const recordsFictionSentence = {
  en: "Every example in this lesson is fictional; it contains no real personal data or official form.",
  fil: "Ang lahat ng halimbawa sa araling ito ay kathang-isip; wala itong tunay na personal na datos o opisyal na form.",
};

// Authors mark emphasis with **bold** in Read bodies; show it as bold rather
// than literal asterisks. The narration loader strips the markers from speech.
function Emphasis({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}
    </>
  );
}

// Body sentences grouped by paragraph, or null when a sentence runs across a
// paragraph break (then the highlighted body renders as one paragraph so the
// sentence indexes still line up with the recorded timings).
function paragraphSentences(body: string): string[][] | null {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(splitIntoSentences);
  const flat = paragraphs.flat();
  const whole = splitIntoSentences(body);
  return flat.length === whole.length && flat.every((s, i) => s === whole[i]) ? paragraphs : null;
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Spoken({ text, active, playing }: { text: string; active: boolean; playing: boolean }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    // Following the highlight is motion; playback and highlighting are not.
    if (!active || !playing || prefersReducedMotion()) return;
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active, playing]);
  return (
    <span
      ref={ref}
      data-active={active ? "true" : undefined}
      className={active ? "rounded bg-primary/20 underline decoration-primary decoration-2" : undefined}
    >
      <Emphasis text={text} />
    </span>
  );
}

type Props = {
  heading: string;
  body: string;
  takeaway: string;
  narration?: ReferenceNarrationEntry;
  en: boolean;
  continuationScope?: string;
  text?: (fil: string, en: string) => string;
  headingRef?: Ref<HTMLHeadingElement>;
  // Present an existing final sentence as a note without changing narrated text.
  noteSentence?: string;
  // Rendered between the body and the takeaway (the section's figures).
  children?: ReactNode;
};

export function ReferenceReadSection({ heading, body, takeaway, narration, en, text, headingRef, children, continuationScope, noteSentence }: Props) {
  const ui = text ?? ((fil: string, eng: string) => (en ? eng : fil));
  const displayedNote = noteSentence ?? (body === recordsFictionBody[en ? "en" : "fil"] &&
    heading === (en ? "After the visit" : "Pagkatapos ng pagbisita") ? recordsFictionSentence[en ? "en" : "fil"] : undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frame = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const speed = useNarrationSpeed();
  const automatic = useNarrationContinuation(continuationScope);
  const leaving = useRef(false);
  const [active, setActive] = useState(-1);
  const [failed, setFailed] = useState(false);

  // Stale audio (text edited after rendering) is treated exactly like none.
  const matched = !!narration && timingsMatchSection(narration.timings, { heading, body, takeaway });
  const zones = matched ? buildNarrationZones({ heading, body, takeaway }) : [];
  const layout = paragraphSentences(body);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
  }, [speed, narration?.src, matched]);

  useEffect(() => {
    leaving.current = false;
    enterNarrationScope(continuationScope);
    const audio = audioRef.current;
    // A locked check has no player on mount. Revealing its answer never starts
    // audio automatically; the learner still chooses Listen after responding.
    if (audio && shouldContinueNarration(continuationScope)) {
      audio.play()?.catch?.(() => {
        if (!leaving.current) {
          pauseNarrationContinuation();
          setFailed(true);
        }
      });
    }
    return () => {
      leaving.current = true;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [continuationScope]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio && !audio.paused) audio.pause();
    };
  }, [matched, narration?.src]);

  function tick() {
    const el = audioRef.current;
    if (!el || !narration) return;
    const index = findActiveTimingIndex(narration.timings, el.currentTime * 1000);
    setActive((prev) => (prev === index ? prev : index));
    frame.current = requestAnimationFrame(tick);
  }
  function stopTicking() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }
  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      pauseNarrationContinuation();
      el.pause();
      return;
    }
    el.playbackRate = speed;
    setFailed(false);
    el.play()?.catch?.(() => {
      if (!leaving.current) {
        pauseNarrationContinuation();
        setFailed(true);
      }
    });
  }

  const headingIndex = zones[0]?.zone === "heading" ? 0 : -1;
  const takeawayIndex = zones.at(-1)?.zone === "takeaway" ? zones.length - 1 : -1;
  const bodyOffset = headingIndex + 1;

  let bodyNode: ReactNode;
  if (!matched) {
    const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    bodyNode = paragraphs.map((p, i) => (
      <p key={i} className="whitespace-pre-wrap">
        {displayedNote && p.endsWith(displayedNote) ? <>
          <Emphasis text={p.slice(0, -displayedNote.length).trimEnd()} />
          <span role="note" className="mt-3 block rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
            <span aria-hidden="true">ⓘ </span><Emphasis text={displayedNote} />
          </span>
        </> : <Emphasis text={p} />}
      </p>
    ));
  } else {
    let cursor = bodyOffset;
    const groups = layout ?? [zones.filter((z) => z.zone === "body").map((z) => z.text)];
    bodyNode = groups.map((sentences, p) => (
      <p key={p}>
        {sentences.map((sentence, s) => {
          const index = cursor++;
          return (
            <span key={s} role={sentence === displayedNote ? "note" : undefined}
              className={sentence === displayedNote ? "mt-3 block rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm" : undefined}>
              {s && sentence !== displayedNote ? " " : ""}
              {sentence === displayedNote && <span aria-hidden="true">ⓘ </span>}
              <Spoken text={sentence} active={active === index} playing={playing} />
            </span>
          );
        })}
      </p>
    ));
  }

  return (
    <>
      <h2 tabIndex={-1} ref={headingRef} className="text-xl font-semibold">
        {matched && headingIndex === 0 ? <Spoken text={heading} active={active === 0} playing={playing} /> : heading}
      </h2>
      {matched && narration && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-ink/15 bg-ink/5 p-2"
          role="group"
          aria-label={ui("Pakinggan ang bahaging ito", "Listen to this section")}
        >
          <audio
            ref={audioRef}
            src={narration.src}
            preload="none"
            onPlay={() => {
              armNarrationContinuation(continuationScope);
              setPlaying(true);
              frame.current = requestAnimationFrame(tick);
            }}
            onPause={() => {
              if (!leaving.current && !audioRef.current?.ended) pauseNarrationContinuation();
              setPlaying(false);
              stopTicking();
            }}
            onEnded={() => {
              setPlaying(false);
              setActive(-1);
              stopTicking();
            }}
            onError={() => {
              pauseNarrationContinuation();
              setPlaying(false);
              stopTicking();
              setFailed(true);
            }}
          />
          <button
            type="button"
            onClick={toggle}
            aria-pressed={playing}
            className="flex min-h-[44px] items-center gap-2 rounded-md border border-ink/20 px-3 font-medium"
          >
            <span aria-hidden="true">{playing ? "❙❙" : "►"}</span>
            {playing ? ui("I-pause", "Pause") : ui("Pakinggan", "Listen")}
          </button>
          <label className="flex items-center gap-1 text-sm">
            {ui("Bilis", "Speed")}
            <select
              value={speed}
              onChange={(event) => {
                const next = Number(event.target.value) as (typeof SPEEDS)[number];
                setNarrationSpeed(next);
                if (audioRef.current) audioRef.current.playbackRate = next;
              }}
              className="min-h-[44px] rounded-md border border-ink/20 bg-transparent px-1"
            >
              {SPEEDS.map((option) => (
                <option key={option} value={option}>
                  {option}×
                </option>
              ))}
            </select>
          </label>
          {continuationScope && <label className="flex min-h-[44px] items-center gap-2 text-sm">
            <input type="checkbox" checked={automatic} onChange={event =>
              setNarrationContinuation(continuationScope, event.target.checked, playing)
            } />
            {ui("Awtomatikong pakinggan ang mga susunod na bahagi", "Play next sections automatically")}
          </label>}
          <span className="text-sm text-ink/70">{formatTime(narration.duration_seconds)}</span>
          {failed && (
            <span role="status" className="text-sm">
              {ui("Hindi ma-play ang audio. Basahin muna ang teksto.", "Audio could not play. You can read the text.")}
            </span>
          )}
        </div>
      )}
      <div className="my-5 flex flex-col gap-4 leading-relaxed">{bodyNode}</div>
      {children}
      {takeaway && (
        <p className="border-l-4 border-primary pl-3">
          {matched && takeawayIndex >= 0 ? (
            <Spoken text={takeaway} active={active === takeawayIndex} playing={playing} />
          ) : (
            <Emphasis text={takeaway} />
          )}
        </p>
      )}
    </>
  );
}
