// @vitest-environment node
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {persistLanguage} from './set-language';
const state=vi.hoisted(()=>({user:{id:'auth'} as {id:string}|null,rpc:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:state.user},error:null})},rpc:state.rpc})}));
vi.mock('@/lib/supabase/app-user',()=>({getAppUser:async()=>({status:'active',a11y_settings:{theme:'dark',font_scale:'xl',high_contrast:true}})}));
beforeEach(()=>{state.user={id:'auth'};state.rpc.mockReset();state.rpc.mockResolvedValue({error:null});});
describe('persist language',()=>{
  it('retains current accessibility preferences',async()=>{expect(await persistLanguage('en')).toBe(true);expect(state.rpc).toHaveBeenCalledWith('rpc_update_settings',{p_language:'en',p_theme:'dark',p_font_scale:'xl',p_high_contrast:true});});
  it('rejects invalid locale or unauthenticated requests',async()=>{expect(await persistLanguage('other')).toBe(false);state.user=null;expect(await persistLanguage('en')).toBe(false);expect(state.rpc).not.toHaveBeenCalled();});
});
