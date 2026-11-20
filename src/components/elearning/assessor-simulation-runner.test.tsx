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
beforeEach(()=>{rpc.mockReset();});
describe('saved simulation runner',()=>{
 it.each(['en','fil'])('explains required evidence, partial saves and the saved answer gate (%s)',async(locale)=>{
  const state={...initial,next:3};
  rpc.mockImplementation(async(_name,params)=>({data:{...state,revision:1,facts:params.p_action.facts,note:params.p_action.note},error:null}));
  render(<AssessorSimulationRunner initial={state} locale={locale} chapterHref="/preparation" workspaceHref="/workspace"/>);
  const choice=screen.getByRole('button',{name:storyScenes[3].choices[0].text[locale as 'en'|'fil']});
  const save=screen.getByRole('button',{name:locale==='en'?'Save evidence / pause':'I-save ang ebidensya / huminto'});
  expect(choice).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Fictional note'}});
  expect(screen.getByText(locale==='en'?'Changes not saved. Save before leaving or answering.':'Hindi pa naka-save ang mga pagbabago. I-save bago umalis o sumagot.')).toBeVisible();
  fireEvent.click(save);
  await screen.findByText(locale==='en'?'Your note and selected facts match the saved record.':'Tugma sa naka-save na tala ang iyong isinulat at piniling pangyayari.');
  expect(choice).toBeDisabled(); // Partial notes can be saved, but cannot satisfy evidence.
  for(const checkbox of screen.getAllByRole('checkbox'))fireEvent.click(checkbox);
  expect(choice).toBeDisabled(); // Selecting facts alone does not save them.
  fireEvent.click(save);
  await waitFor(()=>expect(choice).toBeEnabled());
  expect(rpc).toHaveBeenCalledTimes(2);
  expect(rpc.mock.calls.every(([,params])=>params.p_action.type==='evidence')).toBe(true);
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'   '}});
  fireEvent.click(save);
  await waitFor(()=>expect(rpc).toHaveBeenCalledTimes(3));
  expect(choice).toBeDisabled();
 });
 it('explains each preparation view before allowing a choice',async()=>{
  let state={...initial,next:1};
  rpc.mockImplementation(async()=>({data:(state={...state,revision:state.revision+1,viewStep:state.viewStep+1}),error:null}));
  render(<AssessorSimulationRunner initial={state} locale="en" chapterHref="/preparation" workspaceHref="/workspace"/>);
  const choice=screen.getByRole('button',{name:storyScenes[1].choices[0].text.en});
  expect(screen.getByText('Open Prepare first.')).toBeVisible();expect(choice).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Open Prepare'}));
  await screen.findByText('Next, show the BHW presentation.');expect(choice).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Show BHW presentation'}));
  await screen.findByText('Return to Prepare before choosing an answer.');expect(choice).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Back to Prepare'}));
  await waitFor(()=>expect(choice).toBeEnabled());
 });
 it('returns directly to the unfinished checkpoint while retaining recorded review access',()=>{
  render(<AssessorSimulationRunner initial={{...initial,next:6}} locale="en" chapterHref="/preparation" workspaceHref="/workspace"/>);
  fireEvent.click(screen.getByRole('button',{name:`1. ${storyScenes[0].title.en} ✓`}));
  expect(screen.getByText(/You are reviewing a recorded checkpoint/)).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Return to unfinished checkpoint'}));
  expect(screen.getByRole('heading',{name:`7. ${storyScenes[6].title.en}`})).toBeVisible();
  expect(rpc).not.toHaveBeenCalled();
 });
 it('distinguishes 11 recorded checkpoints from a saved completion receipt',()=>{
  render(<AssessorSimulationRunner initial={{...initial,next:11}} locale="en" chapterHref="/preparation" workspaceHref="/workspace"/>);
  expect(screen.getByText(/All 11 checkpoints are recorded. Review the summary/)).toBeVisible();
  expect(screen.getByRole('link',{name:'Go to completion step'})).toHaveAttribute('href','#runner-debrief');
  expect(screen.getByRole('button',{name:'Finish debrief and save completion receipt'})).toBeVisible();
  expect(screen.queryByText(/Completion is recorded. You can review/)).not.toBeInTheDocument();
  expect(rpc).not.toHaveBeenCalled();
 });
 it('disables skipping and sends only a structured choice, never a completion flag or learner RPC',async()=>{
  rpc.mockResolvedValue({data:{...initial,revision:1,next:1,attempts:{'find-maria':['maria']}},error:null});
  render(<AssessorSimulationRunner initial={initial} locale="en" chapterHref="/preparation" workspaceHref="/workspace"/>);
  expect(screen.getByRole('button',{name:/2. Prepare with both views/})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:storyScenes[0].choices[1].text.en}));
  await waitFor(()=>expect(rpc).toHaveBeenCalledTimes(1));
  expect(rpc.mock.calls[0][0]).toBe('rpc_assessor_simulation_act');
  expect(rpc.mock.calls[0][1]).toMatchObject({p_actor_id:'actor',p_checkpoint:'find-maria',p_revision:0,p_action:{type:'choice',value:'maria'}});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Next checkpoint'})).toBeEnabled());
 });
 it('preserves unsaved note and facts through failed save and read-only recovery',async()=>{
  const state={...initial,next:3};rpc.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({data:state,error:null});
  render(<AssessorSimulationRunner initial={state} locale="en" chapterHref="/preparation" workspaceHref="/workspace"/>);
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
  render(<AssessorSimulationRunner initial={{...initial,next:6}} locale="fil" chapterHref="/preparation" workspaceHref="/workspace"/>);
  expect(screen.getByRole('heading',{level:2,name:`7. ${storyScenes[6].title.fil}`})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Tingnan ang na-save na status'})).toBeInTheDocument();
  expect(rpc).not.toHaveBeenCalled();
 });
 it('shows the real workspace transition only after the server receipt',()=>{
  const {unmount}=render(<AssessorSimulationRunner initial={initial} locale="en" chapterHref="/preparation" workspaceHref="/workspace"/>);
  expect(screen.queryByRole('link',{name:/Open the real Chapter 1 working area/})).not.toBeInTheDocument();
  const receipt={id:'receipt',actorId:'actor',programInstanceId:'program',programKey:'bhw-reference-manual' as const,
   chapterKey:'chapter-1' as const,requirementsVersion:simulationContract.requirementsVersion,
   scenarioId:simulationContract.id,version:simulationContract.version,checkpointIds:storyScenes.map(s=>s.id),
   checkpointVersions:storyScenes.map(s=>s.checkpointVersion),serverValidated:true as const,completedAt:new Date().toISOString()};
  unmount();
  render(<AssessorSimulationRunner initial={{...initial,next:11,receipt}} locale="en" chapterHref="/preparation" workspaceHref="/workspace"/>);
  expect(screen.getByRole('link',{name:/Open the real Chapter 1 working area/})).toHaveAttribute('href','/workspace');
  expect(rpc).not.toHaveBeenCalled();
 });
});
