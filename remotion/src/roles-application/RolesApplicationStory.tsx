import {
  AbsoluteFill, Audio, Img, Series, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, type CalculateMetadataFunction,
} from "remotion";
import { ROLES_APPLICATION_BEATS, HANDOVER_TRANSLATIONS, APPLICATION_SCENE_LABELS } from "./narration";

export const ROLES_APPLICATION_FPS = 30;
export const ROLES_APPLICATION_FALLBACK_DURATION = ROLES_APPLICATION_FPS * 100;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const cream = "#fffdf7";
const mint = "#a7e3c4";
const ink = "#173630";

export type RolesApplicationStoryProps = {
  language: "fil" | "en" | "ceb" | "hil";
  beatFrames?: number[];
  audioSrc?: string;
};

type NarrationTimings = {
  language: string;
  durationSeconds: number;
  beats: { zone: string; start_ms: number; end_ms: number }[];
};

export const calculateRolesApplicationMetadata: CalculateMetadataFunction<RolesApplicationStoryProps> = async ({ props }) => {
  const response = await fetch(staticFile(`roles-application/narration-${props.language}.json`));
  if (!response.ok) throw new Error("roles-application narration is missing");
  const timings: NarrationTimings = await response.json();
  if (timings.language !== props.language || timings.beats.length !== ROLES_APPLICATION_BEATS.length ||
      timings.beats.some((beat, i) => beat.zone !== ROLES_APPLICATION_BEATS[i].id))
    throw new Error("roles-application timings do not match the authored beats");
  const boundaries = [...timings.beats.map(beat => beat.start_ms), (timings.durationSeconds + 1.2) * 1000];
  const frameAt = (ms: number) => Math.round(ms * ROLES_APPLICATION_FPS / 1000);
  const beatFrames = boundaries.slice(1).map((ms, i) => frameAt(ms) - frameAt(boundaries[i]));
  if (beatFrames.some(frames => frames < 1)) throw new Error("roles-application has an empty beat");
  return {
    durationInFrames: beatFrames.reduce((sum, frames) => sum + frames, 0),
    props: { ...props, beatFrames, audioSrc: staticFile(`roles-application/narration-${props.language}.mp3`) },
  };
};

function RoleIcon({ kind }: { kind: string }) {
  const stroke = { fill: "none", stroke: ink, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg width="56" height="56" viewBox="0 0 80 80" aria-hidden="true">
    {kind === "educate" ? <><path {...stroke} d="M12 12h56v39H38L22 66V51H12Z"/><path {...stroke} d="M24 26h32M24 37h21"/></>
      : kind === "organize" ? <><circle {...stroke} cx="40" cy="25" r="10"/><circle {...stroke} cx="15" cy="32" r="8"/><circle {...stroke} cx="65" cy="32" r="8"/><path {...stroke} d="M22 67V55c0-13 36-13 36 0v12M3 64V54c0-8 12-13 19-5M77 64V54c0-8-12-13-19-5"/></>
      : <><rect {...stroke} x="9" y="10" width="41" height="58" rx="5"/><path {...stroke} d="M19 25h21M19 38h21M19 51h13M51 46h22m-9-9 9 9-9 9"/></>}
  </svg>;
}

function HandoverCards({ language, frame }: { language: RolesApplicationStoryProps["language"]; frame: number }) {
  const labels = language === "ceb" || language === "hil" ? HANDOVER_TRANSLATIONS[language].labels : language === "fil" ? ["Nakita", "Ginawa", "Kailangan"] : ["Observed", "Done", "Needed"];
  const lines = language === "ceb" || language === "hil" ? HANDOVER_TRANSLATIONS[language].lines : language === "fil" ? ["Tubig sa 3 bakuran", "Naitala at nakinig", "Gabay sa hakbang"] : ["Water in 3 yards", "Recorded and listened", "Guidance on the step"];
  return <div style={{ display: "flex", gap: 10, width: "100%" }}>
    {labels.map((label, i) => <div key={label} style={{ flex: 1, borderRadius: 15, background: cream, color: ink, padding: "16px 12px", opacity: interpolate(frame, [i * 12, i * 12 + 15], [0, 1], clamp), transform: `translateY(${interpolate(frame, [i * 12, i * 12 + 15], [16, 0], clamp)}px)` }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 17, marginTop: 7, lineHeight: 1.25 }}>{lines[i]}</div>
    </div>)}
  </div>;
}

function Scene({ index, language }: { index: number; language: RolesApplicationStoryProps["language"] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = ROLES_APPLICATION_BEATS[index];
  const enter = spring({ frame, fps, config: { damping: 200, stiffness: 110 } });
  const opacity = interpolate(frame, [0, 12], [0, 1], clamp);
  const summary = beat.id === "summary";
  const handover = beat.id === "handover";
  const roles = ["educate", "organize", "provider"];
  return <AbsoluteFill style={{ background: "linear-gradient(130deg,#0c4b3b,#25745a)", fontFamily: "Arial, sans-serif", overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 440, height: 440, right: -160, top: -240, background: "#a7e3c42a", borderRadius: "50%" }}/>
    <div style={{ position: "absolute", top: 26, left: 36, color: mint, fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>BHW CONNECT · 1.1.6</div>
    <div style={{ position: "absolute", top: 27, right: 36, color: mint, fontSize: 16 }}>{index + 1} / 6</div>
    {summary ? <div style={{ margin: "69px 36px 0", opacity }}>
      <h1 style={{ margin: 0, fontSize: 29, lineHeight: 1.2, color: cream }}>{language === "ceb" || language === "hil" ? beat[`title_${language}`] : <>{beat.title_fil}<br/>{beat.title_en}</>}</h1>
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        {roles.map((role, i) => <div key={role} style={{ flex: 1, background: cream, borderRadius: 17, padding: 13, display: "flex", alignItems: "center", gap: 12, opacity: interpolate(frame,[i * 10,i * 10 + 12],[0,1],clamp) }}>
          <RoleIcon kind={role}/><strong style={{ fontSize: 17, lineHeight: 1.15, color: ink }}>{["Health Educator", "Community Organizer", "Health Service Provider"][i]}</strong>
        </div>)}
      </div>
      <div style={{ marginTop: 17 }}><HandoverCards language={language} frame={frame}/></div>
      <p style={{ color: mint, fontSize: 18, marginTop: 15, lineHeight: 1.2 }}>{language === "ceb" || language === "hil" ? beat[`detail_${language}`] : <>{beat.detail_fil}<br/>{beat.detail_en}</>}</p>
    </div> : <>
      <div style={{ position: "absolute", left: 36, top: 101, width: 365, opacity, transform: `translateY(${(1-enter)*22}px)` }}>
        <h1 style={{ margin: 0, color: cream, fontSize: language === "ceb" || language === "hil" ? 35 : 38, lineHeight: 1.08 }}>{beat[`title_${language}`]}</h1>
        <p style={{ color: mint, fontSize: 23, lineHeight: 1.28, whiteSpace: "pre-line", marginTop: 22 }}>{beat[`detail_${language}`]}</p>
      </div>
      <div style={{ position: "absolute", right: 36, top: 89, width: 365, height: 244, borderRadius: 22, overflow: "hidden", opacity: enter, transform: `translateX(${(1-enter)*45}px)`, boxShadow: "0 15px 30px #06251d66" }}>
        <Img src={staticFile("roles-application/scene.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "65% 45%", transform: `scale(${1+Math.min(frame/18000,.035)})` }}/>
      </div>
      <div style={{ position: "absolute", right: 36, top: 349, width: 365, color: ink, background: cream, borderRadius: 16, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, opacity }}>
        <RoleIcon kind={beat.id}/>
        <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.2 }}>{beat.id === "observation" ? (language === "ceb" || language === "hil" ? APPLICATION_SCENE_LABELS[language].observation : language === "fil" ? "Nakita ang tubig. Linawin ang hindi tiyak." : "Water was observed. Clarify uncertainty.") : handover ? (language === "ceb" || language === "hil" ? APPLICATION_SCENE_LABELS[language].handover : language === "fil" ? "Itugma ang ulat sa tala." : "Match the report to the record.") : beat[`detail_${language}`].split("\n")[0]}</span>
      </div>
    </>}
    <div style={{ position: "absolute", left: 36, bottom: 17, display: "flex", gap: 7 }} aria-hidden="true">{ROLES_APPLICATION_BEATS.map((b,i)=><div key={b.id} style={{ width: i === index ? 28 : 8, height: 7, borderRadius: 9, background: mint, opacity: i === index ? 1 : .45 }}/>)}</div>
  </AbsoluteFill>;
}

export const RolesApplicationStory: React.FC<RolesApplicationStoryProps> = ({ language, beatFrames, audioSrc }) => {
  const durations = beatFrames ?? ROLES_APPLICATION_BEATS.map(() => ROLES_APPLICATION_FPS * 16);
  return <AbsoluteFill>
    {audioSrc && <Audio src={audioSrc}/>}
    <Series>{ROLES_APPLICATION_BEATS.map((beat,i)=><Series.Sequence key={beat.id} durationInFrames={durations[i]}><Scene index={i} language={language}/></Series.Sequence>)}</Series>
  </AbsoluteFill>;
};
