import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {FeatureFlags} from '@/lib/flags/types';
import {assessorRollout, type CohortPolicy} from './rollout';
import type {FlowContext, FlowIdentity} from './flow';
import {isChapter1RequirementsVersion} from './briefing';

/** Explicit page/action loader, not middleware/layout work. Reuse forwarded
 * flags and authenticated viewer. The policy RPC derives its own actual actor.
 */
export async function loadAssessorRollout(supabase: SupabaseClient, flags: FeatureFlags, identity: FlowIdentity,
  context: Pick<FlowContext, 'actor'>) {
  if (!context.actor.id || !context.actor.active || context.actor.role !== 'assessor' || context.actor.preview) {
    return assessorRollout(flags, identity, context, null);
  }
  try {
    const {data, error} = await supabase.rpc('rpc_assessor_flow_policy', {
      p_program_id: identity.programInstanceId, p_chapter_key: identity.chapterKey,
    });
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) return assessorRollout(flags, identity, context, null);
    // Do not trust omitted/ill-typed control fields or a foreign identity.
    const valid = ['cohortId', 'actorId', 'programInstanceId', 'programKey', 'chapterKey', 'requirementsVersion'].every(key => typeof data[key] === 'string')
      && ['uiEnabled', 'writesEnabled', 'awardsEnabled'].every(key => typeof data[key] === 'boolean')
      && (data.authorityCutoverAt === null || (typeof data.authorityCutoverAt === 'string' && Number.isFinite(Date.parse(data.authorityCutoverAt))));
    // These Chapter 1 pages support both preparation contracts. Select the
    // exact version returned by the authenticated cohort RPC; keep every other
    // identity check, and reject unknown future versions.
    const scopedIdentity = valid && identity.chapterKey === 'chapter-1'
      && isChapter1RequirementsVersion(identity.requirementsVersion)
      && isChapter1RequirementsVersion(data.requirementsVersion)
      ? {...identity, requirementsVersion: data.requirementsVersion} : identity;
    return assessorRollout(flags, scopedIdentity, context, valid ? data as CohortPolicy : null);
  } catch {
    return assessorRollout(flags, identity, context, null);
  }
}
