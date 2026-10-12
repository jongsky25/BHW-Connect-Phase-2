import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import OrientationPage from './[programId]/assessor/[chapterKey]/orientation/page';
import orientation from '../../../content/assessor/chapter-1-orientation.v1.json';
const fixture=vi.hoisted(()=>({enabled:true,cohort:true,acknowledged:true,role:'assessor',actualRole:'assessor',preview:false,readError:false,calls:[] as string[]}));
vi.mock('server-only',()=>({}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error('REDIRECT '+url)},notFound:()=>{throw new Error('NOT_FOUND')}}));
vi.mock('next-intl/server',()=>({getLocale:async()=> 'en'}));
vi.mock('@/lib/auth/viewer',()=>({getViewer:async()=>({appUser:{id:'self',role:fixture.actualRole,status:'active'},role:fixture.role,isPreview:fixture.preview})}));
vi.mock('@/lib/supabase/request',()=>({getRequestFeatureFlags:async()=>({elearning:true,assessor_flow_ui:fixture.enabled})}));
vi.mock('@/lib/assessor/load-rollout',()=>({loadAssessorRollout:async()=>{fixture.calls.push('policy');return {uiVisible:fixture.cohort};}}));
vi.mock('@/lib/assessor/load-briefing',()=>({loadBriefingState:async()=>{fixture.calls.push('briefing');return fixture.acknowledged?{acknowledgedAt:'2026-10-11'}:null;}}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({
  from:()=>{const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{id:'ch1'},error:null})};return query;},
  rpc:async(name:string)=>{fixture.calls.push(name);return {error:fixture.readError?{message:'unavailable'}:null,data:{...orientation,ready:true,passed:true}};},
})}));
const page=(chapterKey='chapter-1')=>OrientationPage({params:Promise.resolve({programId:'manual',chapterKey})});
beforeEach(()=>{Object.assign(fixture,{enabled:true,cohort:true,acknowledged:true,role:'assessor',actualRole:'assessor',preview:false,readError:false,calls:[]});});
afterEach(cleanup);
describe('Chapter 1 orientation route',()=>{
  it('shows the walkthrough for the enabled acknowledged cohort without any award call',async()=>{
    render(await page());
    expect(screen.getByRole('heading',{name:'Evidence-entry walkthrough'})).toBeInTheDocument();
    expect(screen.getByText('Orientation completed')).toBeInTheDocument();
    expect(fixture.calls).toEqual(['policy','briefing','rpc_assessor_orientation_state']);
  });
  it.each(['disabled','nonmember','chapter-2'])('preserves the existing route for %s',async(mode)=>{
    fixture.enabled=mode!=='disabled';fixture.cohort=mode!=='nonmember';
    render(await page(mode==='chapter-2'?'chapter-2':'chapter-1'));
    expect(screen.queryByRole('heading',{name:'Evidence-entry walkthrough'})).toBeNull();
    expect(fixture.calls).toEqual(mode==='nonmember'?['policy','rpc_assessor_orientation_state']:['rpc_assessor_orientation_state']);
  });
  it('returns to the briefing before reading personal orientation when receipt status is unknown',async()=>{
    fixture.acknowledged=false;
    await expect(page()).rejects.toThrow('REDIRECT /training/manual/assessor/chapter-1/briefing');
    expect(fixture.calls).toEqual(['policy','briefing']);
  });
  it.each(['bhw','admin','preview'])('denies %s before personal reads',async(mode)=>{
    if(mode==='preview')fixture.preview=true;else fixture.actualRole=mode;
    await expect(page()).rejects.toThrow('REDIRECT /home');expect(fixture.calls).toEqual([]);
  });
  it('does not turn a failed read into an unfinished orientation',async()=>{
    fixture.readError=true;await expect(page()).rejects.toThrow('Unable to load assessor orientation');
  });
});
