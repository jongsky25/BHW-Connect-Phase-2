import {
  AbsoluteFill,
  Audio,
  Img,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { BHS_PROMOTIONS_BEATS } from "./narration";

export const BHS_PROMOTIONS_FPS = 30;
export const BHS_PROMOTIONS_FALLBACK_DURATION = BHS_PROMOTIONS_FPS * 72;
const TAIL_MS = 1100;
const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type BhsPromotionsStoryProps = {
  language: "fil" | "en";
  beatFrames?: number[];
  audioSrc?: string;
};

type Timings = {
  language: string;
  durationSeconds: number;
  beats: { zone: string; start_ms: number; end_ms: number }[];
};

export const calculateBhsPromotionsMetadata: CalculateMetadataFunction<BhsPromotionsStoryProps> = async ({ props }) => {
  const response = await fetch(staticFile(`uhc-bhs-promotions/narration-${props.language}.json`)).catch(() => null);
  if (!response?.ok) throw new Error("BHS promotions requires measured Gemini narration timings");
  const timing: Timings = await response.json();
  if (timing.language !== props.language || timing.beats.length !== BHS_PROMOTIONS_BEATS.length ||
      timing.beats.some((beat, i) => beat.zone !== BHS_PROMOTIONS_BEATS[i].id || beat.end_ms <= beat.start_ms))
    throw new Error("BHS promotions narration timings do not match the authored scenes");
  const starts = timing.beats.map((beat) => beat.start_ms);
  const boundaries = [...starts, timing.durationSeconds * 1000 + TAIL_MS];
  const frame = (ms: number) => Math.round(ms * BHS_PROMOTIONS_FPS / 1000);
  const beatFrames = starts.map((_, i) => frame(boundaries[i + 1]) - frame(boundaries[i]));
  if (beatFrames.some((n) => n < 1)) throw new Error("BHS promotions narration has an empty scene");
  return {
    durationInFrames: beatFrames.reduce((sum, n) => sum + n, 0),
    props: { ...props, beatFrames, audioSrc: staticFile(`uhc-bhs-promotions/narration-${props.language}.mp3`) },
  };
};

const ink = "#133c36";
const forest = "#393054";
const cream = "#fffaf0";
const leaf = "#c9edb0";
const gold = "#f9d884";

function Pill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return <span style={{ display: "inline-block", background: active ? gold : "#dcefe7", color: ink, borderRadius: 12, padding: "10px 14px", fontSize: 18, fontWeight: 800, whiteSpace: "nowrap" }}>{children}</span>;
}

function Graphic({ index, language, frame }: { index: number; language: "fil" | "en"; frame: number }) {
  const appear = spring({ frame, fps: BHS_PROMOTIONS_FPS, config: { damping: 180, stiffness: 100 } });
  const slide = { transform: `translateY(${(1 - appear) * 20}px)`, opacity: appear };
  if (index === 0 || index === 5) return <div style={{ ...slide, position: "absolute", right: 25, top: 105, height: 265, width: 395, borderRadius: 20, overflow: "hidden", background: cream }}>
    <Img src={staticFile("bhs-promotions/scene.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }}/>
  </div>;
  const labels = language === "fil" ? [
    [], ["Milk Code", "Prescription products", "Medical devices"],
    ["Produkto", "Promosyon", "Lugar / kausap", "Insentibo"],
    ["Huminto", "Idulog", "Tiyakin"], ["Aprubadong impormasyon", "Factual na ulat", "Health team"]
  ] : [[], ["Milk Code", "Prescription products", "Medical devices"],
    ["Product", "Promotion", "Place / audience", "Inducement"],
    ["Pause", "Refer", "Verify"], ["Approved information", "Factual report", "Health team"]];
  return <div style={{ position: "absolute", top: 285, left: 42, width: 770, display: "flex", gap: 10 }}>
    {labels[index].map((label, i) => {
      const show = spring({ frame: frame - i * 13, fps: BHS_PROMOTIONS_FPS, config: { damping: 180 } });
      return <div key={label} style={{ flex: 1, background: i === 0 ? gold : cream, color: ink, borderRadius: 15, padding: "17px 10px", textAlign: "center", fontSize: 18, fontWeight: 800, opacity: show, transform: `translateY(${(1 - show) * 28}px)` }}>
        <div style={{ color: "#68588a", fontSize: 14, marginBottom: 8 }}>0{i + 1}</div>{label}
      </div>;
    })}
  </div>;
}

function Scene({ index, language }: { index: number; language: "fil" | "en" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = BHS_PROMOTIONS_BEATS[index];
  const title = language === "fil" ? beat.title_fil : beat.title_en;
  const detail = language === "fil" ? beat.detail_fil : beat.detail_en;
  const appear = spring({ frame, fps, config: { damping: 180, stiffness: 95 } });
  const progress = interpolate(frame, [0, fps * 10], [0, 1], ease);
  return <AbsoluteFill style={{ background: `linear-gradient(135deg, ${forest}, #655880)`, color: cream, overflow: "hidden", fontFamily: "Arial, 'Noto Sans', sans-serif" }}>
    <div style={{ position: "absolute", width: 530, height: 530, right: -125, top: -325, borderRadius: "50%", background: "#d1efc31c" }}/>
    <div style={{ position: "absolute", width: 500, height: 500, left: -210, bottom: -410, borderRadius: "50%", background: "#d1efc31c" }}/>
    <Graphic index={index} language={language} frame={frame}/>
    <div style={{ position: "absolute", top: 28, left: 42, fontSize: 16, letterSpacing: 2, fontWeight: 900, color: leaf }}>BHW CONNECT  ·  1.3.1</div>
    <div style={{ position: "absolute", top: 28, right: 40, fontSize: 16, fontWeight: 800, color: cream }}>{String(index + 1).padStart(2, "0")} / 06</div>
    <div style={{ position: "absolute", top: 104, left: 42, width: index === 0 || index === 5 ? 355 : 760, transform: `translateY(${(1 - appear) * 22}px)`, opacity: appear }}>
      <div style={{ color: gold, fontSize: 17, letterSpacing: 1.2, fontWeight: 900, textTransform: "uppercase", marginBottom: 13 }}>{index === 0 ? "BHW Mimi" : language === "fil" ? "Pagkilala at koordinasyon" : "Recognize and coordinate"}</div>
      <div style={{ fontSize: index === 0 || index === 5 ? 38 : title.length > 27 ? 39 : 47, fontWeight: 900, lineHeight: 1.08, textShadow: "0 3px 12px #002d2b66" }}>{title}</div>
      <div style={{ fontSize: 22, lineHeight: 1.25, marginTop: 17, fontWeight: 600, maxWidth: 685 }}>{detail}</div>
    </div>
    {index === 5 && <div style={{ position: "absolute", bottom: 85, left: 44, display: "flex", gap: 11 }}><Pill active>{language === "fil" ? "Kilalanin" : "Recognize"}</Pill><Pill>{language === "fil" ? "Huminto" : "Pause"}</Pill><Pill>{language === "fil" ? "Idulog" : "Refer"}</Pill></div>}
    <div style={{ position: "absolute", bottom: 22, left: 42, width: 770, height: 4, borderRadius: 3, background: "#d0ecde55" }}>
      <div style={{ height: "100%", width: `${Math.min(100, progress * 100)}%`, background: gold, borderRadius: 3 }}/>
    </div>
  </AbsoluteFill>;
}

export function BhsPromotionsStory({ language, beatFrames, audioSrc }: BhsPromotionsStoryProps) {
  const frames = beatFrames ?? BHS_PROMOTIONS_BEATS.map(() => BHS_PROMOTIONS_FPS * 11);
  return <AbsoluteFill>
    <Series>{BHS_PROMOTIONS_BEATS.map((beat, index) =>
      <Series.Sequence key={beat.id} durationInFrames={frames[index]}><Scene index={index} language={language}/></Series.Sequence>)}</Series>
    {audioSrc && <Audio src={audioSrc}/>}
  </AbsoluteFill>;
}
