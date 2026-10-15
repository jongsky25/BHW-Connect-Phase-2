import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {buildPolicyProposal} from '../c1af25-policy-proposal.mjs';

const root = process.cwd();

describe('C1AF-25 owner decision package', () => {
  it('pins the exact current bilingual sources and remains a proposal', () => {
    const saved = JSON.parse(readFileSync(path.join(root,
      'docs/chapter-1-assessor-c1af-25-policy-proposal.json'), 'utf8'));
    expect(saved).toEqual(buildPolicyProposal(root));
    expect(saved.status).toBe('proposal_for_owner_review');
    expect(saved.ready_for_activation).toBe(false);
    expect(saved.approval_references).toBeNull();
    expect(saved.issuer_snapshot).toBeNull();
    expect(saved.components).toHaveLength(9);
    const lessons = saved.components.flatMap(component => component.required_lessons);
    expect(lessons).toHaveLength(42);
    expect(lessons.flatMap(lesson => lesson.criteria)).toHaveLength(42);
    expect(new Set(lessons.flatMap(lesson => lesson.criteria.map(criterion => criterion.id))).size).toBe(42);
    for (const criterion of lessons.flatMap(lesson => lesson.criteria)) {
      expect(criterion.source.sha256_lf).toMatch(/^[a-f0-9]{64}$/);
      expect(criterion.rubric.observable.fil).toBeTruthy();
      expect(criterion.rubric.observable.en).toBeTruthy();
      for (const level of ['kaya_na', 'kailangan_practice', 'hindi_pa']) {
        expect(criterion.rubric.levels[level].fil).toBeTruthy();
        expect(criterion.rubric.levels[level].en).toBeTruthy();
      }
    }
  });

  it('keeps the two numerical traps explicit and does not convert old ratings', () => {
    const proposal = buildPolicyProposal(root);
    const refusal = proposal.components.find(component => component.module_key === '03-polisiya-bhs')
      .required_lessons.find(lesson => lesson.lesson_key === 'bhs-decline');
    const clarification = proposal.components.find(component => component.module_key === '06-komunikasyon')
      .required_lessons.find(lesson => lesson.lesson_key === 'communication-clarify');
    expect(refusal.proposed_legacy_indicator_ids).toEqual(['chapter-1:03-polisiya-bhs:indicator-3']);
    expect(clarification.proposed_legacy_indicator_ids).toEqual(['chapter-1:06-komunikasyon:indicator-1']);
    expect(proposal.formal_rule_proposal.prior_bhw_evidence_reuse).toBe(false);
    expect(proposal.formal_rule_proposal.practice_evidence).toContain('neither counts');
  });

  it('requires local safety context for each assessment without a central contact', () => {
    const rule = buildPolicyProposal(root).conflict_decisions_proposed['1.8-safety'];
    expect(rule).toContain('Keep the shared setup card blank');
    expect(rule).toContain('for each LGU and assessment session');
    expect(rule).toContain('primary reporting contact, backup and immediate qualified evaluation route');
    expect(rule).toContain('record it as not observed');
  });
});
