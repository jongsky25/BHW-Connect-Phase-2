import {AbsoluteFill, Audio, Img, Series, spring, staticFile, useCurrentFrame, type CalculateMetadataFunction} from "remotion";
import {UHC_IMPROVEMENT_BEATS} from "./narration";

export const UHC_IMPROVEMENT_FPS = 30;
export const UHC_IMPROVEMENT_FALLBACK_DURATION = 30 * 80;
export type ImprovementStoryProps = {language: "fil" | "en"; beatFrames?: number[]; audioSrc?: string};
type Timing = {language: string; durationSeconds: number; beats: {zone: string; start_ms: number; end_ms: number}[]};
export const calculateImprovementMetadata: CalculateMetadataFunction<ImprovementStoryProps> = async ({props}) => {
  const response = await fetch(staticFile(`uhc-improvement/narration-${props.language}.json`));
  if (!response.ok) throw new Error("Improvement narration is required before registering this composition");
  const timing: Timing = await response.json();
  if (timing.language !== props.language || timing.beats.length !== UHC_IMPROVEMENT_BEATS.length || timing.beats.some((b, i) => b.zone !== UHC_IMPROVEMENT_BEATS[i].id || b.end_ms <= b.start_ms)) throw new Error("Improvement narration does not match the authored story");
  const boundaries = [...timing.beats.map(b => b.start_ms), timing.durationSeconds * 1000 + 1100];
  const frames = boundaries.map(ms => Math.round(ms * UHC_IMPROVEMENT_FPS / 1000));
  const beatFrames = timing.beats.map((_, i) => frames[i + 1] - frames[i]);
  if (beatFrames.some(n => n < 1) || timing.beats[timing.beats.length - 1].end_ms > timing.durationSeconds * 1000 + 1) throw new Error("Improvement scene timing exceeds the measured recording");
  return {durationInFrames: beatFrames.reduce((a, b) => a + b, 0), props: {...props, beatFrames, audioSrc: staticFile(`uhc-improvement/narration-${props.language}.mp3`)}};
};
const gold = "#f7d58e", ink = "#153e37", cream = "#fff8eb";

function Card({title, body, order, frame, accent = false}: {title: string; body: string; order: number; frame: number; accent?: boolean}) {
  const p = spring({frame: frame - order * 13, fps: 30, config: {damping: 180}});
  return <div style={{width: 222, minHeight: 132, background: accent ? gold : cream, color: ink, borderRadius: 18, padding: "18px 16px", opacity: p, transform: `translateY(${(1-p)*28}px)`, boxShadow: "0 8px 20px #002a2444"}}><div style={{fontWeight: 900, fontSize: 21, marginBottom: 12}}>{title}</div><div style={{fontSize: 19, lineHeight: 1.25}}>{body}</div></div>;
}
function Scene({index, language}: {index: number; language: "fil" | "en"}) {
  const frame = useCurrentFrame();
  const fil = language === "fil", beat = UHC_IMPROVEMENT_BEATS[index];
  const p = spring({frame, fps: 30, config: {damping: 180}});
  const columns = index === 1 ? (fil ? [["Ano?", "Maikling mensahe"], ["Kailan?", "Susunod na linggo"], ["Katayuan", "Panukala muna"]] : [["What?", "Short message"], ["When?", "Next week"], ["Status", "Proposal first"]])
    : index === 2 ? (fil ? [["Tiyakin", "Contact at mensahe"], ["Makinig", "Umiiral na patakaran"], ["Magkasundo", "Tamang pahintulot"]] : [["Confirm", "Contact and message"], ["Listen", "Existing policy"], ["Agree", "Right permission"]])
    : index === 3 ? (fil ? [["Gawain", "Sinuring mensahe"], ["Responsable", "Vlanche; kayang gamit"], ["Balikan", "Biyernes"]] : [["Action", "Checked message"], ["Responsible", "Vlanche; feasible tools"], ["Review", "Friday"]])
    : (fil ? [["Itanong", "Sino ang lalapitan?"], ["Itala", "Bilang at tanong"], ["Iwasan", "Personal na detalye"]] : [["Ask", "Whom would you ask?"], ["Note", "Count and questions"], ["Avoid", "Personal details"]]);
  return <AbsoluteFill style={{background: "linear-gradient(135deg,#0b4d40,#07352f)", color: cream, fontFamily: "Arial, sans-serif", padding: "32px 38px"}}>
    <div style={{fontSize: 15, color: gold, letterSpacing: 1.5, fontWeight: 800}}>BHW CONNECT · 1.2.4</div>
    <div style={{marginTop: 17, fontSize: index===0 || index===5 ? 34 : 37, fontWeight: 900, lineHeight: 1.12, width: index===0 || index===5 ? 345 : 760, opacity: p, transform: `translateY(${(1-p)*16}px)`}}>{fil ? beat.title_fil : beat.title_en}</div>
    <div style={{fontSize: 21, lineHeight: 1.3, marginTop: 14, width: index===0 || index===5 ? 330 : 750}}>{fil ? beat.detail_fil : beat.detail_en}</div>
    {(index===0 || index===5) ? <>
      <div style={{position: "absolute", right: 30, top: 91, width: 400, height: 270, background: cream, borderRadius: 19, overflow: "hidden", opacity: p}}><Img src={staticFile("uhc-improvement/scene.png")} style={{width:"100%",height:"100%",objectFit:"contain"}}/></div>
      <div style={{position:"absolute",left:38,top:263,width:324,fontSize:21,lineHeight:1.4,color:gold,whiteSpace:"pre-line"}}>{index===0 ? (fil ? "“Sino po ang tatanungin ko?”\nMakinig. Itala. Linawin." : "“Who should I ask?”\nListen. Note. Clarify.") : (fil ? "Isang gawain\nTamang pahintulot\nFeedback at pagsasaayos" : "One action\nRight agreement\nFeedback and refinement")}</div>
    </> : <div style={{position:"absolute",left:38,top:247,display:"flex",gap:16}}>{columns.map(([title,body],i)=><Card key={title} title={title} body={body} order={i} frame={frame} accent={i===index%3}/>)}</div>}
    <div style={{position:"absolute",left:38,right:38,bottom:38,display:"flex",gap:7}}>{UHC_IMPROVEMENT_BEATS.map((b,i)=><div key={b.id} style={{height:5,flex:1,borderRadius:4,background:i<=index?gold:"#ffffff30"}}/>)}</div>
    <div style={{position:"absolute",left:38,bottom:14,fontSize:12,color:"#d4e7de"}}>{fil ? "Halimbawa; tiyakin ang lokal na kaayusan." : "Example; confirm local arrangements."}</div>
    <div style={{position:"absolute",right:38,bottom:14,fontSize:12,color:gold}}>{index+1} / 6</div>
  </AbsoluteFill>;
}
export function ImprovementStory({language,beatFrames,audioSrc}: ImprovementStoryProps) {
  const frames = beatFrames ?? UHC_IMPROVEMENT_BEATS.map(()=>30*12);
  return <AbsoluteFill><Series>{UHC_IMPROVEMENT_BEATS.map((beat,index)=><Series.Sequence key={beat.id} durationInFrames={frames[index]}><Scene index={index} language={language}/></Series.Sequence>)}</Series>{audioSrc&&<Audio src={audioSrc}/>}</AbsoluteFill>;
}
