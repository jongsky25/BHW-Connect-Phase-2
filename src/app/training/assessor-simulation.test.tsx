import {beforeEach,describe,it,expect,vi} from 'vitest';
import SimulationPage from './[programId]/assessor/[chapterKey]/simulation/page';
const context=vi.hoisted(()=>({role:'assessor',actual:'assessor',active:true,preview:false,ui:true,learning:true,rpc:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT ${url}`);},notFound:()=>{throw new Error('NOT_FOUND');}}));
vi.mock('next-intl/server',()=>({getLocale:async()=>'en'}));
vi.mock('@/lib/auth/viewer',()=>({getViewer:async()=>({appUser:{id:'self',role:context.actual,status:context.active?'active':'deactivated'},role:context.role,isPreview:context.preview})}));
vi.mock('@/lib/supabase/request',()=>({getRequestFeatureFlags:async()=>({elearning:context.learning,assessor_flow_ui:context.ui})}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({rpc:context.rpc})}));
beforeEach(()=>{Object.assign(context,{role:'assessor',actual:'assessor',active:true,preview:false,ui:true,learning:true});context.rpc.mockReset().mockResolvedValue({error:{message:'disabled'}});});
const page=(chapterKey='chapter-1')=>SimulationPage({params:Promise.resolve({programId:'p',chapterKey})});
describe('simulation route admission',()=>{
 it.each([{role:'bhw'},{actual:'admin'},{preview:true},{learning:false}])('rejects noncandidate request %j before DB',async changes=>{
  Object.assign(context,changes);await expect(page()).rejects.toThrow('REDIRECT /home');expect(context.rpc).not.toHaveBeenCalled();
 });
 it('rejects inactive actor',async()=>{context.active=false;await expect(page()).rejects.toThrow('REDIRECT /login');expect(context.rpc).not.toHaveBeenCalled();});
 it('keeps Chapter 3 unavailable',async()=>{await expect(page('chapter-3')).rejects.toThrow('NOT_FOUND');expect(context.rpc).not.toHaveBeenCalled();});
 it('keeps UI control disabled',async()=>{context.ui=false;await expect(page()).rejects.toThrow('NOT_FOUND');expect(context.rpc).not.toHaveBeenCalled();});
 it('returns to real preparation if server admission fails and never writes on load',async()=>{
  await expect(page()).rejects.toThrow('REDIRECT /training/p/assessor/chapter-1');
  expect(context.rpc.mock.calls).toEqual([['rpc_assessor_simulation_state',{p_program_id:'p'}]]);
 });
});
