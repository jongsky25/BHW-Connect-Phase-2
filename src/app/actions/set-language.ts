"use server";

import {isLocale} from '@/i18n/locales';
import {createClient} from '@/lib/supabase/server';
import {getAppUser} from '@/lib/supabase/app-user';
import {parseA11ySettings} from '@/lib/settings/types';

export async function persistLanguage(language:string):Promise<boolean> {
  if(!isLocale(language))return false;
  const db=await createClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return false;
  const actor=await getAppUser(db,user.id);
  if(!actor||actor.status!=='active')return false;
  const a11y=parseA11ySettings(actor.a11y_settings);
  const {error}=await db.rpc('rpc_update_settings',{
    p_language:language,p_theme:a11y.theme,p_font_scale:a11y.font_scale,p_high_contrast:a11y.high_contrast,
  });
  return !error;
}
