import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import Page from './[programId]/assessment-requests/page';

const state=vi.hoisted(()=>({role:'bhw',preview:false,enabled:true,rpc:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT ${url}`);},
  notFound:()=>{throw new Error('NOT_FOUND');}}));
vi.mock('next-intl/server',()=>({getLocale:async()=> 'en'}));
vi.mock('@/lib/auth/viewer',()=>({getViewer:async()=>({appUser:{id:'learner',role:state.role,status:'active'},
  role:state.role,isPreview:state.preview})}));
vi.mock('@/lib/supabase/request',()=>({getRequestFeatureFlags:async()=>({elearning:state.enabled})}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({rpc:state.rpc})}));
const programId='00000000-0000-4000-8000-000000000001';
const page=()=>Page({params:Promise.resolve({programId})});
beforeEach(()=>{
  Object.assign(state,{role:'bhw',preview:false,enabled:true});
  state.rpc.mockReset().mockResolvedValue({data:[],error:null});
});
afterEach(cleanup);

it('denies assessor and preview access before querying a learner record',async()=>{
  state.role='assessor';await expect(page()).rejects.toThrow('REDIRECT /home');
  state.role='bhw';state.preview=true;await expect(page()).rejects.toThrow('REDIRECT /home');
  expect(state.rpc).not.toHaveBeenCalled();
});
it('shows the reviewed purpose, criteria and arrangement without claiming a result',async()=>{
  state.rpc.mockResolvedValue({data:[{id:'request',moduleTitleFil:'Bahagi',moduleTitleEn:'Communication',
    status:'arranged',purposeFil:'Layunin',purposeEn:'Explain the procedure clearly.',
    criteria:[{fil:'Malinaw na paliwanag',en:'Clear explanation'}],assessorName:'Alex',
    agreedAt:'2030-01-01T12:00:00Z',location:'Barangay hall',note:'Quiet room'}],error:null});
  render(await page());
  expect(state.rpc).toHaveBeenCalledWith('rpc_bhw_component_requests',{p_program_id:programId});
  expect(screen.getByText('Explain the procedure clearly.')).toBeInTheDocument();
  expect(screen.getByText('Clear explanation')).toBeInTheDocument();
  expect(screen.getByText(/Barangay hall/)).toBeInTheDocument();
  expect(screen.getByText(/Scheduling is not an outcome decision/)).toBeInTheDocument();
});
