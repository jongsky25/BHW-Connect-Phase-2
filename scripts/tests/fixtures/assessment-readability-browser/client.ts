import release from '../../../../content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-gifts-lactation-v4/release.json';

const phase = new URLSearchParams(location.search).get('phase') === 'posttest' ? 'posttest' : 'pretest';
export const items = release.forms[phase].items.map(({item_id, slot, stem, options}) =>
  ({item_id, slot, stem, options, lesson_keys: []}));
type Response = {item_id: string; kind: string; option_id: string | null; marked: boolean};
let attempt = {attempt_id: 'readability', phase, state: 'draft', revision: 0, position: 0,
  language: 'en', items, responses: [] as Response[], score_percent: null, legacy_attempt_id: null};
export const calls: string[] = [];
export function createClient() {
  return {rpc: async (name: string, args: {p_position?: number; p_changes?: Response[]}) => {
    calls.push(name);
    if (name === 'rpc_update_display_settings') return {data: null, error: null};
    if (name === 'rpc_learner_assessment_get') return {data: attempt, error: null};
    if (name === 'rpc_learner_assessment_save') {
      const changes = args.p_changes ?? [];
      attempt = {...attempt, revision: attempt.revision + 1, position: args.p_position ?? attempt.position,
        responses: [...attempt.responses.filter(r => !changes.some(c => c.item_id === r.item_id)), ...changes]};
      return {data: attempt, error: null};
    }
    throw Error(`Unexpected readability-fixture RPC: ${name}`);
  }};
}
