import {
  AbsoluteFill,
  Audio,
  Easing,
  Series,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { Hand } from "./Hand";
import { HANDRUB_STEPS, type HandrubMotion } from "./steps";

// INC-28 tier 2's first real clip (docs/training-modules-plan.md), narrated
// per docs/handrub-clip-enhancement-handoff.md §3: the handrub sequence for
// Chapter 2.3's hand-hygiene lesson. On-screen labels stay bilingual (owner
// decision, 26 Sep 2026); `language` only selects which narration track
// plays. The last frame is a static summary of every step, which the render
// script uses as the poster so the lesson's no-autoplay/reduced-motion
// state still carries the whole procedure.

export const HANDRUB_FPS = 30;
// A rough fallback before calculateMetadata resolves the real, narration-
// derived duration (Composition requires a durationInFrames alongside
// explicit width/height even when calculateMetadata is given).
export const HANDRUB_FALLBACK_DURATION = HANDRUB_FPS * 60;
// After the closing line, hold the summary a moment before cutting to black.
const TAIL_PAD_SECONDS = 0.8;

export type HandrubStepsProps = {
  language: "fil" | "en";
  // Populated by calculateHandrubMetadata from public/hand-hygiene/
  // narration-<language>.json; each entry is [intro, 8 steps, closing].
  beatFrames?: number[];
  audioSrc?: string;
};

type NarrationTimings = {
  language: string;
  durationSeconds: number;
  beats: { zone: string; index: number; start_ms: number; end_ms: number }[];
};

export const calculateHandrubMetadata: CalculateMetadataFunction<
  HandrubStepsProps
> = async ({ props }) => {
  const url = staticFile(`hand-hygiene/narration-${props.language}.json`);
  // Fall back to an even split (and no audio) when this language's
  // narration hasn't been synthesized yet — e.g. the Filipino sample is
  // rendered and approved before English is recorded at all (handoff §4) —
  // so listing/bundling compositions never crashes on the missing one.
  const response = await fetch(url).catch(() => null);
  if (!response || !response.ok) {
    return { durationInFrames: HANDRUB_FALLBACK_DURATION, props };
  }
  const timings: NarrationTimings = await response.json();
  // Cut scenes at each beat's own start (frame-exact, telescoping — no
  // rounding drift accumulates), so the visual stays locked to the audio
  // instead of adding a separate pad that would slip out of sync with the
  // single continuous narration track. The built-in ~300ms gap between
  // beats (scripts/lib/tts-providers/gemini.mjs) already reads as the
  // "short pad" the handoff doc calls for.
  const boundariesMs = [
    ...timings.beats.map((b) => b.start_ms),
    timings.durationSeconds * 1000 + TAIL_PAD_SECONDS * 1000,
  ];
  const frameAt = (ms: number) => Math.round((ms / 1000) * HANDRUB_FPS);
  const beatFrames = boundariesMs
    .slice(1)
    .map((ms, i) => frameAt(ms) - frameAt(boundariesMs[i]));
  return {
    durationInFrames: beatFrames.reduce((a, b) => a + b, 0),
    props: {
      ...props,
      beatFrames,
      audioSrc: staticFile(`hand-hygiene/narration-${props.language}.mp3`),
    },
  };
};

const INK = "#10261f";
const MUTED = "#3d5a52";
const PRIMARY = "#145847";
const CANVAS = "#f1f7f5";
const FONT = "'Noto Sans', 'DejaVu Sans', Arial, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const fadeIn = (frame: number) =>
  interpolate(frame, [0, 8], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const Stage: React.FC<{ motion: HandrubMotion; duration: number }> = ({
  motion,
  duration,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // ~1.4 rubs a second: brisk enough to read as rubbing, slow enough to follow.
  const rub = Math.sin((frame / fps) * Math.PI * 2 * 1.4);
  const circle = (frame / fps) * Math.PI * 2 * 1.1;
  const swapped = frame >= duration / 2;

  switch (motion) {
    case "apply": {
      const drop = interpolate(frame, [6, 34], [30, 196], {
        ...clamp,
        easing: Easing.in(Easing.quad),
      });
      const gel = interpolate(frame, [32, 46], [0, 1], clamp);
      return (
        <>
          <Hand side="left" x={200} y={220} curl={0.12} />
          {frame < 36 ? (
            <path
              d={`M200 ${drop - 18} C212 ${drop - 2} 212 ${drop + 12} 200 ${drop + 12} C188 ${drop + 12} 188 ${drop - 2} 200 ${drop - 18}Z`}
              fill="#7cc3e8"
              stroke="#1d6b94"
              strokeWidth={2}
            />
          ) : null}
          <ellipse
            cx={200}
            cy={228}
            rx={30 * gel}
            ry={20 * gel}
            fill="#7cc3e8"
            opacity={0.65}
          />
        </>
      );
    }
    case "palm-to-palm":
      return (
        <>
          <Hand side="left" x={200} y={200} />
          <Hand side="right" back x={200} y={200 + 18 * rub} opacity={0.92} />
        </>
      );
    case "palm-over-back": {
      const under = swapped ? "right" : "left";
      const over = swapped ? "left" : "right";
      return (
        <>
          <Hand side={under} back x={200} y={206} />
          <Hand
            side={over}
            back
            x={swapped ? 191 : 209}
            y={190 + 16 * rub}
            opacity={0.92}
          />
        </>
      );
    }
    case "interlaced":
      return (
        <>
          <Hand side="left" x={172 + 6 * rub} y={214 - 8 * rub} rotate={32} />
          <Hand
            side="right"
            back
            x={228 - 6 * rub}
            y={214 + 8 * rub}
            rotate={-32}
            opacity={0.92}
          />
        </>
      );
    case "backs-of-fingers":
      return (
        <>
          <Hand side="left" x={150} y={190 + 14 * rub} rotate={90} curl={0.8} />
          <Hand
            side="right"
            back
            x={250}
            y={210 - 14 * rub}
            rotate={-90}
            curl={0.8}
            opacity={0.92}
          />
        </>
      );
    case "thumbs": {
      // The thumb sits at about (-48, 4) in the hand's own coordinates.
      const held = swapped ? "right" : "left";
      const holder = swapped ? "left" : "right";
      const thumbX = swapped ? 248 : 152;
      return (
        <>
          <Hand side={held} x={200} y={220} />
          <Hand
            side={holder}
            back
            x={thumbX + 8 * Math.cos(circle)}
            y={214 + 5 * Math.sin(circle)}
            rotate={(swapped ? -1 : 1) * (70 + 25 * Math.sin(circle))}
            curl={0.75}
            scale={0.85}
            thumb={false}
            opacity={0.92}
          />
        </>
      );
    }
    case "fingertips": {
      const palm = swapped ? "right" : "left";
      const tips = swapped ? "left" : "right";
      return (
        <>
          <Hand side={palm} x={200} y={226} />
          <Hand
            side={tips}
            back
            x={200 + 16 * Math.cos(circle)}
            y={148 + 10 * Math.sin(circle)}
            rotate={180}
            curl={0.55}
            scale={0.8}
            thumb={false}
            opacity={0.92}
          />
        </>
      );
    }
    case "dry": {
      const apart = interpolate(frame, [26, 44], [0, 1], {
        ...clamp,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
      const tick = interpolate(frame, [44, 58], [0, 1], clamp);
      return (
        <>
          <Hand side="left" x={200 - 70 * apart} y={206} />
          <Hand
            side="right"
            back={apart < 0.5}
            x={200 + 70 * apart}
            y={206 + 16 * rub * (1 - apart)}
            opacity={0.92 + 0.08 * apart}
          />
          <path
            d="M176 88 L194 106 L228 70"
            fill="none"
            stroke={PRIMARY}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={90}
            strokeDashoffset={90 * (1 - tick)}
          />
        </>
      );
    }
  }
};

const StepScene: React.FC<{ index: number; duration: number }> = ({
  index,
  duration,
}) => {
  const frame = useCurrentFrame();
  const step = HANDRUB_STEPS[index];
  const opacity = fadeIn(frame);
  return (
    <AbsoluteFill style={{ backgroundColor: CANVAS, fontFamily: FONT }}>
      <div
        style={{
          position: "absolute",
          left: 24,
          top: 40,
          width: 400,
          height: 400,
          borderRadius: 24,
          backgroundColor: "#ffffff",
          border: `2px solid ${PRIMARY}22`,
        }}
      >
        <svg width={400} height={400} viewBox="0 0 400 400" style={{ opacity }}>
          {/* The hands are drawn around (200, 200); enlarge them to fill the card. */}
          <g transform="translate(200 212) scale(1.4) translate(-200 -200)">
            <Stage motion={step.motion} duration={duration} />
          </g>
        </svg>
      </div>
      <div
        style={{
          position: "absolute",
          left: 456,
          top: 60,
          width: 370,
          opacity,
          translate: `0 ${interpolate(frame, [0, 8], [12, 0], clamp)}px`,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: PRIMARY,
              color: "#ffffff",
              fontSize: 36,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {index + 1}
          </div>
          <div style={{ fontSize: 22, color: MUTED }}>
            / {HANDRUB_STEPS.length}
          </div>
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: 28,
            lineHeight: 1.2,
            fontWeight: 700,
            color: INK,
          }}
        >
          {step.fil}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 20,
            lineHeight: 1.25,
            color: MUTED,
          }}
        >
          {step.en}
        </div>
      </div>
      {step.switchHands ? (
        <div
          style={{
            position: "absolute",
            left: 456,
            bottom: 76,
            padding: "6px 14px",
            borderRadius: 14,
            backgroundColor: "#ffe1b8",
            color: "#5c3208",
            fontSize: 16,
            lineHeight: 1.25,
            fontWeight: 600,
            opacity,
          }}
        >
          Ulitin sa kabilang kamay
          <br />
          Repeat on the other hand
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 456,
          bottom: 44,
          display: "flex",
          gap: 10,
        }}
      >
        {HANDRUB_STEPS.map((s, i) => (
          <div
            key={s.motion}
            style={{
              width: i === index ? 30 : 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: i <= index ? PRIMARY : `${PRIMARY}33`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: PRIMARY,
        color: "#ffffff",
        fontFamily: FONT,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        opacity: fadeIn(frame),
      }}
    >
      <div style={{ fontSize: 46, fontWeight: 700 }}>Handrub: 8 hakbang</div>
      <div style={{ fontSize: 28, color: "#d5efe6", marginTop: 6 }}>
        Handrub: 8 steps
      </div>
      <div style={{ fontSize: 22, color: "#d5efe6", marginTop: 26 }}>
        20–30 segundo · lahat ng bahagi ng magkabilang kamay
      </div>
      <div style={{ fontSize: 18, color: "#b3dccd", marginTop: 4 }}>
        20–30 seconds · every surface of both hands
      </div>
    </AbsoluteFill>
  );
};

// Everything the clip teaches, readable without playing it: this is the
// poster frame and the reduced-motion/no-autoplay view.
const Summary: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: CANVAS,
        fontFamily: FONT,
        padding: "22px 24px",
      }}
    >
      <div style={{ opacity: fadeIn(frame) }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: INK }}>
          Handrub · 20–30 segundo / seconds
        </div>
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridAutoRows: 192,
            gap: 12,
          }}
        >
          {HANDRUB_STEPS.map((s, i) => (
            <div
              key={s.motion}
              style={{
                backgroundColor: "#ffffff",
                border: `2px solid ${PRIMARY}33`,
                borderRadius: 16,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: PRIMARY,
                  color: "#ffffff",
                  fontSize: 18,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 16,
                  lineHeight: 1.2,
                  fontWeight: 700,
                  color: INK,
                }}
              >
                {s.fil}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  lineHeight: 1.2,
                  color: MUTED,
                }}
              >
                {s.en}
                {s.switchHands ? " (both hands)" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const HandrubSteps: React.FC<HandrubStepsProps> = ({
  beatFrames,
  audioSrc,
}) => {
  // calculateHandrubMetadata always supplies these before the component is
  // rendered for real (Studio and render both resolve metadata first); the
  // fallback here only avoids a crash on an unresolved/default-props pass.
  const frames = beatFrames ?? [
    HANDRUB_FALLBACK_DURATION / (HANDRUB_STEPS.length + 2),
    ...Array(HANDRUB_STEPS.length).fill(
      HANDRUB_FALLBACK_DURATION / (HANDRUB_STEPS.length + 2),
    ),
    HANDRUB_FALLBACK_DURATION / (HANDRUB_STEPS.length + 2),
  ];
  const [introFrames, ...rest] = frames;
  const stepFrames = rest.slice(0, HANDRUB_STEPS.length);
  const summaryFrames = rest[HANDRUB_STEPS.length];
  return (
    <>
      {audioSrc ? <Audio src={audioSrc} /> : null}
      <Series>
        <Series.Sequence durationInFrames={introFrames}>
          <Intro />
        </Series.Sequence>
        {HANDRUB_STEPS.map((s, i) => (
          <Series.Sequence key={s.motion} durationInFrames={stepFrames[i]}>
            <StepScene index={i} duration={stepFrames[i]} />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={summaryFrames}>
          <Summary />
        </Series.Sequence>
      </Series>
    </>
  );
};
