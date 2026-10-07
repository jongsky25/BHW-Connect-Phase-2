import {AbsoluteFill, Audio, Img, Series, spring, staticFile, useCurrentFrame, type CalculateMetadataFunction} from "remotion";
import {BHW_TEAMWORK_BEATS} from "./narration";

// Lesson 1.5.4 draft; owner review pending.
// Each language uses measured narration boundaries, including its final summary.

export const TEAMWORK_FPS = 30;
export const TEAMWORK_FALLBACK_DURATION = 75 * TEAMWORK_FPS;
export type BhwTeamworkStoryProps = {language: "fil" | "en"; beatFrames?: number[]; audioSrc?: string};
type Timings = {language: string; durationSeconds: number; beats: {zone: string; index: number; text: string; start_ms: number; end_ms: number}[]};

export const calculateBhwTeamworkMetadata: CalculateMetadataFunction<BhwTeamworkStoryProps> = async ({props}) => {
  const response = await fetch(staticFile(`bhw-teamwork/narration-${props.language}.json`));
  if (!response.ok) throw new Error("BhwTeamwork story requires measured narration timings");
  const timing: Timings = await response.json();
  if (timing.language !== props.language || !Number.isFinite(timing.durationSeconds) || timing.durationSeconds <= 0 ||
    timing.durationSeconds + 1.1 > 90 || timing.beats.length !== BHW_TEAMWORK_BEATS.length ||
    timing.beats[0].start_ms !== 0 || timing.beats.some((b, i) =>
      b.zone !== BHW_TEAMWORK_BEATS[i].id || b.index !== i || b.text !== BHW_TEAMWORK_BEATS[i][props.language] ||
      !Number.isFinite(b.start_ms) || !Number.isFinite(b.end_ms) ||
      b.end_ms <= b.start_ms || b.end_ms > timing.durationSeconds * 1000 + 50 ||
      (i > 0 && b.start_ms < timing.beats[i - 1].end_ms)))
    throw new Error("BhwTeamwork scene timing mismatch");
  const boundaries = [...timing.beats.map(b => b.start_ms), timing.durationSeconds * 1000 + 1100];
  const beatFrames = timing.beats.map((_, i) => Math.round(boundaries[i + 1] * TEAMWORK_FPS / 1000) - Math.round(boundaries[i] * TEAMWORK_FPS / 1000));
  if (beatFrames.some(n => n < 1)) throw new Error("BhwTeamwork story has an empty scene");
  return {durationInFrames: beatFrames.reduce((sum, n) => sum + n, 0), props: {...props, beatFrames, audioSrc: staticFile(`bhw-teamwork/narration-${props.language}.mp3`)}};
};

const cream="#fffaf2", gold="#ffe5a3";
function Scene({index,language}:{index:number;language:"fil"|"en"}) {
 const frame=useCurrentFrame(); const beat=BHW_TEAMWORK_BEATS[index];
 const enter=spring({frame,fps:TEAMWORK_FPS,config:{damping:180}});
 return <AbsoluteFill style={{background:"#244e49",color:cream,fontFamily:"Arial, sans-serif"}}>
  <div style={{position:"absolute",top:25,left:32,color:gold,fontSize:17,fontWeight:800}}>BHW CONNECT · 1.5.4 · {index+1}/6</div>
  <div style={{position:"absolute",top:77,left:32,width:350,opacity:enter}}>
   <div style={{fontSize:34,fontWeight:800,lineHeight:1.15}}>{beat[`title_${language}`]}</div>
   <div style={{fontSize:27,lineHeight:1.3,marginTop:20}}>{beat[`detail_${language}`]}</div>
  </div>
  <div style={{position:"absolute",right:24,top:77,width:420,height:280,borderRadius:18,overflow:"hidden"}}>
   <Img src={staticFile("bhw-teamwork/scene.png")} style={{width:"100%",height:"100%",objectFit:"cover",transform:`scale(${1+(index%3)*0.06+Math.min(frame,180)*0.00015})`,transformOrigin:index%2?"55% 55%":"45% 40%"}}/>
  </div>
  <div style={{position:"absolute",bottom:35,left:32,right:24,background:gold,color:"#203f3b",padding:"14px 18px",borderRadius:12,fontSize:26,fontWeight:700,transform:`translateY(${(1-enter)*20}px)`}}>{beat[`card_${language}`]}</div>
 </AbsoluteFill>;
}
export function BhwTeamworkStory({language,beatFrames,audioSrc}:BhwTeamworkStoryProps){
 const frames=beatFrames??BHW_TEAMWORK_BEATS.map(()=>TEAMWORK_FPS*12);
 return <AbsoluteFill><Series>{BHW_TEAMWORK_BEATS.map((beat,i)=><Series.Sequence key={beat.id} durationInFrames={frames[i]}><Scene index={i} language={language}/></Series.Sequence>)}</Series>{audioSrc&&<Audio src={audioSrc}/>}</AbsoluteFill>;
}
