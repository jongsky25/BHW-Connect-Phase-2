import {CHAPTER1_REQUIREMENTS_VERSION} from './briefing';
import {storyScenes, simulationStory} from './simulation-storyboard';

/** Story approval recorded in PR #292; no rubric, sufficiency or award approval. */
export const simulationContract = {
  id: simulationStory.id, version: '1.0.0', requirementsVersion: CHAPTER1_REQUIREMENTS_VERSION,
  approval: 'PR #291 owner-approved release, recorded in PR #292',
  sourceVersion: simulationStory.version, rubricSha256Lf: simulationStory.rubricSha256Lf,
  checkpoints: storyScenes.map(s => ({id:s.id, version:s.checkpointVersion})),
} as const;
export type SimulationReceipt = {
  id:string; actorId:string; programInstanceId:string; programKey:'bhw-reference-manual'; chapterKey:'chapter-1';
  requirementsVersion:string; scenarioId:string; version:string; checkpointIds:string[];
  checkpointVersions:number[]; serverValidated:true; completedAt:string;
};
export type SimulationState = {
  actorId:string; programInstanceId:string; programKey:'bhw-reference-manual'; chapterKey:'chapter-1';
  requirementsVersion:string; scenarioId:string; version:string; revision:number; next:number;
  viewStep:number; facts:number[]; note:string; attempts:Record<string,string[]>; receipt:SimulationReceipt|null;
};
export type SimulationAction = {type:'view';value:'guide'|'learner'|'return'} |
  {type:'evidence';facts:number[];note:string} | {type:'choice';value:string} | {type:'finish'} | {type:'replay'};
export function parseSimulationState(value:unknown, programId:string, actorId:string):SimulationState|null {
  if(!value||typeof value!=='object')return null;
  const s=value as SimulationState;
  const identity=(x:SimulationState|SimulationReceipt)=>x.actorId===actorId&&x.programInstanceId===programId
    &&x.programKey==='bhw-reference-manual'&&x.chapterKey==='chapter-1'
    &&x.requirementsVersion===simulationContract.requirementsVersion&&x.scenarioId===simulationContract.id&&x.version===simulationContract.version;
  if(!identity(s)||!Number.isSafeInteger(s.revision)||s.revision<0||!Number.isInteger(s.next)||s.next<0||s.next>11
    ||!Number.isInteger(s.viewStep)||s.viewStep<0||s.viewStep>3||typeof s.note!=='string'||s.note.length>1200
    ||Array.isArray(s.attempts)||!Array.isArray(s.facts)||s.facts.some(n=>![0,1,2].includes(n))||!s.attempts||typeof s.attempts!=='object')return null;
  for(const [id,attempts] of Object.entries(s.attempts)) {
    const scene=storyScenes.find(scene=>scene.id===id);
    if(!scene||!Array.isArray(attempts)||attempts.some(choice=>!scene.choices.some(c=>c.id===choice)))return null;
  }
  if(s.receipt!==null) {
    const r=s.receipt;
    if(!r||!identity(r)||!r.id||r.serverValidated!==true||!Number.isFinite(Date.parse(r.completedAt))
      ||JSON.stringify(r.checkpointIds)!==JSON.stringify(simulationContract.checkpoints.map(c=>c.id))
      ||JSON.stringify(r.checkpointVersions)!==JSON.stringify(simulationContract.checkpoints.map(c=>c.version)))return null;
  }
  return s;
}
