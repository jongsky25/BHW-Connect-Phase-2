import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseSimulationState,simulationContract,type SimulationState} from './simulation-runner';
import {storyScenes} from './simulation-storyboard';
const state:SimulationState={actorId:'self',programInstanceId:'p',programKey:'bhw-reference-manual',chapterKey:'chapter-1',
 requirementsVersion:simulationContract.requirementsVersion,scenarioId:simulationContract.id,version:'1.0.0',revision:0,next:0,
 viewStep:0,facts:[],note:'',attempts:{},receipt:null};
describe('accepted familiarization contract',()=>{
 it('accepts scoped state but rejects foreign/stale identities and fabricated receipt checkpoints',()=>{
  expect(parseSimulationState(state,'p','self')).toEqual(state);
  for(const changed of [{actorId:'other'},{programInstanceId:'other'},{chapterKey:'chapter-2'},{scenarioId:'other'},{version:'0.1.0-draft'},{next:12},{revision:-1},{receipt:{...state,id:'receipt',serverValidated:true,completedAt:'2026-10-12',checkpointIds:[]}}])expect(parseSimulationState({...state,...changed},'p','self')).toBeNull();
 });
 it('pins SQL checkpoint/choice acceptance to the unchanged approved story',()=>{
  const sql=readFileSync('supabase/migrations/20261012051057_assessor_simulation_runner.sql','utf8');
  const quoted=(values:string[])=>values.map(v=>`'${v}'`).join(',');
  expect(sql).toContain(`array[${quoted(storyScenes.map(s=>s.id))}]`);
  expect(sql).toContain(`array[${quoted(storyScenes.map(s=>s.choices.find(c=>c.correct)!.id))}]`);
  expect(sql).toContain(JSON.stringify(storyScenes.map(s=>s.choices.map(c=>c.id))));
  expect(simulationContract.rubricSha256Lf).toBe('c23f71dd46321eaaee92ea305d37661ed62760ce6cacddad8098b7b9fb095c56');
 });
});
