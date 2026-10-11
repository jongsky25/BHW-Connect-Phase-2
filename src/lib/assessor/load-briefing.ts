import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {parseBriefingState} from './briefing';

/** Read only. Failure remains unknown, never an empty acknowledgement. */
export async function loadBriefingState(db: SupabaseClient, programId: string, actorId: string) {
  try {
    const {data, error} = await db.rpc('rpc_assessor_briefing_state', {p_program_id: programId});
    return error ? null : parseBriefingState(data, programId, actorId);
  } catch {return null;}
}
