import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {AssessorSimulationRunner} from './assessor-simulation-runner';
import {simulationContract,type SimulationState} from '@/lib/assessor/simulation-runner';
import {storyScenes} from '@/lib/assessor/simulation-storyboard';
const rpc=vi.fn();
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc})}));
const initial:SimulationState={actorId:'actor',programInstanceId:'program',programKey:'bhw-reference-manual',chapterKey:'chapter-1',
 requirementsVersion:simulationContract.requirementsVersion,scenarioId:simulationContract.id,version:'1.0.0',revision:0,next:0,
 viewStep:0,facts:[],note:'',attempts:{},receipt:null};
beforeEach(()=>rpc.mockReset());
describe('saved simulation runner',()=>{
 it('disables skipping and sends only a structured choice, never a completion flag or learner RPC',async()=>{
  rpc.mockResolvedValue({data:{...initial,revision:1,next:1,attempts:{'find-maria':['maria']}},error:null});
  render(<AssessorSimulationRunner initial={initial} locale="en" chapterHref="/preparation"/>);
  expect(screen.getByRole('button',{name:/2. Prepare with both views/})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:storyScenes[0].choices[1].text.en}));
  await waitFor(()=>expect(rpc).toHaveBeenCalledTimes(1));
  expect(rpc.mock.calls[0][0]).toBe('rpc_assessor_simulation_act');
  expect(rpc.mock.calls[0][1]).toMatchObject({p_actor_id:'actor',p_checkpoint:'find-maria',p_revision:0,p_action:{type:'choice',value:'maria'}});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Next checkpoint'})).toBeEnabled());
 });
 it('preserves unsaved note and facts through failed save and read-only recovery',async()=>{
  const state={...initial,next:3};rpc.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({data:state,error:null});
  render(<AssessorSimulationRunner initial={state} locale="en" chapterHref="/preparation"/>);
  const note=screen.getByRole('textbox');fireEvent.change(note,{target:{value:'Fictional note retained'}});
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  fireEvent.click(screen.getByRole('button',{name:'Save evidence / pause'}));
  await screen.findByRole('alert');expect(note).toHaveValue('Fictional note retained');
  fireEvent.click(screen.getByRole('button',{name:'Check saved status'}));
  await waitFor(()=>expect(rpc).toHaveBeenCalledTimes(2));
  expect(rpc.mock.calls[1]).toEqual(['rpc_assessor_simulation_state',{p_program_id:'program'}]);
  expect(note).toHaveValue('Fictional note retained');expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
 });
 it('renders Filipino and resumes the first unfinished checkpoint',()=>{
  render(<AssessorSimulationRunner initial={{...initial,next:6}} locale="fil" chapterHref="/preparation"/>);
  expect(screen.getByRole('heading',{level:2,name:`7. ${storyScenes[6].title.fil}`})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Tingnan ang na-save na status'})).toBeInTheDocument();
  expect(rpc).not.toHaveBeenCalled();
 });
});
