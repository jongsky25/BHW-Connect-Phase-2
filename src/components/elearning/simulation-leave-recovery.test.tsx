import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {AssessorSimulationRunner} from './assessor-simulation-runner';
import {simulationContract,type SimulationState} from '@/lib/assessor/simulation-runner';
const rpc=vi.fn();
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc})}));
const initial:SimulationState={actorId:'actor',programInstanceId:'program',programKey:'bhw-reference-manual',chapterKey:'chapter-1',requirementsVersion:simulationContract.requirementsVersion,scenarioId:simulationContract.id,version:'1.0.0',revision:0,next:3,viewStep:0,facts:[],note:'',attempts:{},receipt:null};
beforeEach(()=>{rpc.mockReset();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const unload=()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;};
it.each(['en','fil'])('protects unsaved evidence and releases navigation after a confirmed save (%s)',async locale=>{
 render(<AssessorSimulationRunner initial={initial} locale={locale} chapterHref="/preparation" workspaceHref="/workspace"/>);
 expect(unload()).toBe(false);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Fictional observation'}});
 expect(unload()).toBe(true);
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 const link=screen.getByRole('link',{name:locale==='en'?'Return to my preparation and current next step':'Bumalik sa aking paghahanda at kasalukuyang susunod na hakbang'});
 expect(fireEvent.click(link)).toBe(false);
 expect(confirm).toHaveBeenCalledTimes(1);
 expect(screen.getByRole('textbox')).toHaveValue('Fictional observation');
 rpc.mockResolvedValue({data:{...initial,revision:1,note:'Fictional observation'},error:null});
 fireEvent.click(screen.getByRole('button',{name:locale==='en'?'Save evidence / pause':'I-save ang ebidensya / huminto'}));
 await waitFor(()=>expect(unload()).toBe(false));
});
it('keeps protection after a lost save response until saved status is confirmed',async()=>{
 render(<AssessorSimulationRunner initial={initial} locale="en" chapterHref="/preparation" workspaceHref="/workspace"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Fictional observation'}});
 rpc.mockRejectedValue(new Error('response lost'));
 fireEvent.click(screen.getByRole('button',{name:'Save evidence / pause'}));
 await screen.findByRole('alert');expect(unload()).toBe(true);
 rpc.mockResolvedValue({data:{...initial,revision:1,note:'Fictional observation'},error:null});
 fireEvent.click(screen.getByRole('button',{name:'Check saved status'}));
 await waitFor(()=>expect(unload()).toBe(false));
 expect(screen.getByRole('textbox')).toHaveValue('Fictional observation');
});

it('does not treat a different selection order as unsaved evidence',()=>{
 render(<AssessorSimulationRunner initial={{...initial,facts:[0,1,2],note:'Saved fictional note'}} locale="en" chapterHref="/preparation" workspaceHref="/workspace"/>);
 const checkbox=screen.getAllByRole('checkbox')[0];
 fireEvent.click(checkbox);expect(unload()).toBe(true);
 fireEvent.click(checkbox);expect(unload()).toBe(false);
});
