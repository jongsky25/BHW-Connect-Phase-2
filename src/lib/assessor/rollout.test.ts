// @vitest-environment node
import {describe, expect, it, vi} from 'vitest';
import {DEFAULT_FLAGS, resolveFlags} from '@/lib/flags/get-flags';
import {assessorRollout, revisedAssessorPermission, type CohortPolicy} from './rollout';
import {assessorChapterCatalog} from './flow-registry';
import type {FlowContext} from './flow';
vi.mock('server-only', () => ({}));
import {loadAssessorRollout} from './load-rollout';
import type {SupabaseClient} from '@supabase/supabase-js';

const identity = {programInstanceId: 'program-a', programKey: 'bhw-reference-manual', chapterKey: 'chapter-1' as const,
  requirementsVersion: 'chapter-1:c1af.draft-1'};
const actor = {id: 'alex', role: 'assessor', active: true, preview: false};
const flags = {...DEFAULT_FLAGS, elearning: true, assessor_flow_ui: true, assessor_flow_writes: true, assessor_flow_awards: true};
function policy(): CohortPolicy { return {...identity, cohortId: 'cohort-a', actorId: 'alex',
  uiEnabled: true, writesEnabled: true, awardsEnabled: true, authorityCutoverAt: '2026-10-10T00:00:00Z'}; }
function client(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({data, error});
  return {rpc, supabase: {rpc} as unknown as SupabaseClient};
}

describe('default-off independent rollout controls', () => {
  it('loads the authenticated pilot cohort version while retaining foreign identity rejection', async () => {
    const pilot={...policy(),requirementsVersion:'chapter-1:c1af25.pilot-1',writesEnabled:false,awardsEnabled:false,authorityCutoverAt:null};
    expect(await loadAssessorRollout(client(pilot).supabase,flags,identity,{actor}))
      .toMatchObject({uiVisible:true,writesEnabled:false,awardsEnabled:false});
    for(const changed of [{requirementsVersion:'unknown'},{programInstanceId:'foreign'},{actorId:'other'}]){
      expect(await loadAssessorRollout(client({...pilot,...changed}).supabase,flags,identity,{actor}))
        .toMatchObject({uiVisible:false,writesEnabled:false,awardsEnabled:false});
    }
  });
  it('does not expose any new capability from missing flag rows or policy', () => {
    expect(assessorRollout(DEFAULT_FLAGS, identity, {actor}, policy())).toMatchObject({uiVisible: false, writesEnabled: false, awardsEnabled: false, legacyWritesAllowed: false});
    expect(assessorRollout(flags, identity, {actor}, null)).toMatchObject({uiVisible: false, writesEnabled: false, awardsEnabled: false, legacyWritesAllowed: false});
  });
  it('can enable preparation screens before cutover without enabling writes or awards', () => {
    expect(assessorRollout(flags, identity, {actor}, {...policy(), authorityCutoverAt: null}))
      .toMatchObject({uiVisible: true, writesEnabled: false, awardsEnabled: false, legacyWritesAllowed: true});
  });
  it('hiding UI after cutover never restores legacy eligibility', () => {
    const result = assessorRollout({...flags, assessor_flow_ui: false}, identity, {actor}, policy());
    expect(result).toMatchObject({uiVisible: false, writesEnabled: true, awardsEnabled: true, legacyWritesAllowed: false});
    expect(assessorRollout(flags, identity, {actor}, {...policy(), uiEnabled: false, writesEnabled: false, awardsEnabled: false}))
      .toMatchObject({uiVisible: false, writesEnabled: false, awardsEnabled: false, legacyWritesAllowed: false});
  });
  it('independently disables awards and evidence writes', () => {
    expect(assessorRollout({...flags, assessor_flow_awards: false}, identity, {actor}, policy())).toMatchObject({writesEnabled: true, awardsEnabled: false});
    expect(assessorRollout({...flags, assessor_flow_writes: false}, identity, {actor}, policy())).toMatchObject({writesEnabled: false, awardsEnabled: true});
    expect(assessorRollout(flags, identity, {actor}, {...policy(), awardsEnabled: false}).awardsEnabled).toBe(false);
  });
  it('honors the existing elearning and role switches', () => {
    expect(assessorRollout({...flags, elearning: false}, identity, {actor}, policy()).uiVisible).toBe(false);
    const resolved = resolveFlags([{key: 'elearning', enabled: true}, {key: 'assessor_flow_ui', enabled: true, disabled_roles: ['assessor']}], 'assessor');
    expect(assessorRollout(resolved, identity, {actor}, policy()).uiVisible).toBe(false);
  });
  it.each(['actorId', 'programInstanceId', 'programKey', 'chapterKey', 'requirementsVersion'] as const)('denies another %s even when all switches are on', field => {
    const changed = policy(); Object.assign(changed, {[field]: 'foreign'});
    expect(assessorRollout(flags, identity, {actor}, changed)).toMatchObject({uiVisible: false, writesEnabled: false, awardsEnabled: false, legacyWritesAllowed: false});
  });
  it.each([{id: null}, {active: false}, {role: 'admin'}, {role: 'bhw'}, {preview: true}])('denies ineligible actual actors and previews %#', change => {
    expect(assessorRollout(flags, identity, {actor: {...actor, ...change}}, policy()))
      .toMatchObject({uiVisible: false, writesEnabled: false, awardsEnabled: false, legacyWritesAllowed: false});
  });
  it('does not interpret a malformed cutover timestamp as legacy eligibility', () => {
    expect(assessorRollout(flags, identity, {actor}, {...policy(), authorityCutoverAt: ''}).legacyWritesAllowed).toBe(false);
  });
  it('never grants official authority just because a rollout switch is on', () => {
    const requirements = assessorChapterCatalog()[0];
    const context: FlowContext = {identity, actor, publication: {curriculumVersion: requirements.curriculumVersion, lessons: []},
      evidence: null, award: null, legacyTransitionPending: false};
    const result = revisedAssessorPermission('formal_submit', requirements, context,
      {inCatchment: true, learnerActive: true, isSelf: false, learnerReady: true, assignedToOther: false, ownsAssignment: true, criteriaReviewed: true},
      assessorRollout(flags, identity, {actor}, policy()));
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain('chapter_award_required');
    expect(result.reasons).toContain('mapping_review_required');
  });
});

describe('authenticated server policy loader', () => {
  it('does one scoped RPC and projects the returned actor-bound policy', async () => {
    const {rpc, supabase} = client(policy());
    expect(await loadAssessorRollout(supabase, flags, identity, {actor})).toMatchObject({uiVisible: true, writesEnabled: true, awardsEnabled: true});
    expect(rpc).toHaveBeenCalledExactlyOnceWith('rpc_assessor_flow_policy', {p_program_id: 'program-a', p_chapter_key: 'chapter-1'});
  });
  it('does no database read for admin View-as or inactive/non-assessor accounts', async () => {
    const {rpc, supabase} = client(policy());
    for (const change of [{role: 'admin', preview: true}, {active: false}, {id: null}, {role: 'bhw'}]) {
      expect((await loadAssessorRollout(supabase, flags, identity, {actor: {...actor, ...change}})).writesEnabled).toBe(false);
    }
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([null, [], {}, {...policy(), writesEnabled: 'true'}, {...policy(), authorityCutoverAt: ''}, {...policy(), actorId: 'other'}])('fails closed for malformed/missing/foreign policy %#', async data => {
    expect(await loadAssessorRollout(client(data).supabase, flags, identity, {actor}))
      .toMatchObject({uiVisible: false, writesEnabled: false, awardsEnabled: false, legacyWritesAllowed: false});
  });
  it('fails closed on an RPC error or thrown transport failure', async () => {
    expect((await loadAssessorRollout(client(null, {message: 'unavailable'}).supabase, flags, identity, {actor})).legacyWritesAllowed).toBe(false);
    const {rpc, supabase} = client(null); rpc.mockRejectedValue(new Error('network'));
    expect((await loadAssessorRollout(supabase, flags, identity, {actor})).legacyWritesAllowed).toBe(false);
  });
});
