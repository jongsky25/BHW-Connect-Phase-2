import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame} from "remotion";
import {BHW_SELF_MANAGEMENT_BEATS} from "./narration";
const SELF_MANAGEMENT_FPS=30;
const cream="#fffaf2", gold="#ffe5a3";
export function Scene({index,language}:{index:number;language:"fil"|"en"}) {
 const frame=useCurrentFrame(); const beat=BHW_SELF_MANAGEMENT_BEATS[index];
 const enter=spring({frame,fps:SELF_MANAGEMENT_FPS,config:{damping:180}});
 return <AbsoluteFill style={{background:"#244e49",color:cream,fontFamily:"Arial, sans-serif"}}>
  <div style={{position:"absolute",top:25,left:32,color:gold,fontSize:17,fontWeight:800}}>BHW CONNECT · 1.5.5 · {index+1}/6</div>
  <div style={{position:"absolute",top:77,left:32,width:350,opacity:enter}}>
   <div style={{fontSize:34,fontWeight:800,lineHeight:1.15}}>{beat[`title_${language}`]}</div>
   <div style={{fontSize:27,lineHeight:1.3,marginTop:20}}>{beat[`detail_${language}`]}</div>
  </div>
  <div style={{position:"absolute",right:24,top:77,width:420,height:280,borderRadius:18,overflow:"hidden"}}>
   <Img src={staticFile(index === 2 || index === 3 ? "bhw-self-management/adjust.png" : "bhw-self-management/scene.png")} style={{width:"100%",height:"100%",objectFit:"cover",transform:`scale(${1+(index%3)*0.06+Math.min(frame,180)*0.00015})`,transformOrigin:index%2?"55% 55%":"45% 40%"}}/>
  </div>
  <div aria-hidden="true" style={{position:"absolute",left:34,top:265,display:"flex",gap:10}}>{[0,1,2].map(n=><div key={n} style={{width:54,height:28,borderRadius:6,background:n===index%3?gold:"#557d75",opacity:spring({frame:frame-n*6,fps:SELF_MANAGEMENT_FPS,config:{damping:180}})}}/>)}</div>
  <div style={{position:"absolute",bottom:35,left:32,right:24,background:gold,color:"#203f3b",padding:"14px 18px",borderRadius:12,fontSize:26,fontWeight:700,transform:`translateY(${(1-enter)*20}px)`}}>{beat[`card_${language}`]}</div>
 </AbsoluteFill>;
}
