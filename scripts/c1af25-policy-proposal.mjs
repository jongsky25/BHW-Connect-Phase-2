import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {auditChapter1Assessor} from './lib/chapter1-assessor-audit.mjs';

const root = process.cwd();
const outputPath = path.join(root, 'docs/chapter-1-assessor-c1af-25-policy-proposal.json');
const checkpointIds = [
  'find-maria', 'prepare', 'brief', 'observe', 'feedback', 'missing',
  'readiness', 'arrange', 'formal', 'chapter-gap', 'final-review',
];

export function buildPolicyProposal(repository = root) {
  const audit = auditChapter1Assessor(repository);
  if (audit.summary.modules !== 9 || audit.summary.required_lessons !== 42
    || audit.summary.proposed_lesson_criteria !== 42 || audit.summary.legacy_indicators !== 36) {
    throw new Error('Chapter 1 inventory changed; review the proposed policy before regenerating');
  }
  const fingerprints = new Map(audit.sources.map(source => [source.path, source.sha256_lf]));
  const source = file => {
    const sha256_lf = fingerprints.get(file);
    if (!sha256_lf) throw new Error(`Missing audited source: ${file}`);
    return {path: file, sha256_lf};
  };
  const manifest = JSON.parse(readFileSync(path.join(repository,
    'content/assessor/bhw-reference-manual.v1.json'), 'utf8'));
  const chapter = manifest.chapters.find(item => item.chapter_key === 'chapter-1');
  if (manifest.version !== audit.curriculum_version || chapter?.orientation?.version !== '2026-09-29.1'
    || chapter?.orientation?.passing_count !== 7 || chapter?.orientation?.case_count !== 8
    || chapter?.posttest?.passing_percent !== 80) {
    throw new Error('Chapter 1 study, exam or orientation contract changed; review the proposed award rule');
  }
  const storyboardPath = 'src/lib/assessor/simulation-storyboard.ts';
  const storyboard = readFileSync(path.join(repository, storyboardPath), 'utf8').replace(/\r\n/g, '\n');
  const actualCheckpoints = [...storyboard.matchAll(/scene\(\{id: '([^']+)'/g)].map(match => match[1]);
  if (JSON.stringify(actualCheckpoints) !== JSON.stringify(checkpointIds)) {
    throw new Error('Simulation checkpoints changed; review the proposed award rule');
  }
  return {
    schema_version: 1,
    status: 'proposal_for_owner_review',
    ready_for_activation: false,
    program_key: audit.program_key,
    chapter_key: audit.chapter_key,
    curriculum_version: audit.curriculum_version,
    proposed_requirements_version: 'chapter-1:c1af25.pilot-1',
    proposed_rubric_version: 'chapter-1:c1af25.rubric-1',
    proposed_award_rule_version: 'c1af25.combined-1',
    approval_references: null,
    issuer_snapshot: null,
    source_rule: 'Only the exact bilingual anchors and lesson revisions referenced below can be approved. Local objective indices never map ratings to legacy indicators.',
    formal_rule_proposal: {
      required_criteria: 'All 42 current lesson criteria are required, grouped into nine components. Each required criterion needs fresh sufficient formal evidence rated kaya_na for a complete component.',
      practice_evidence: 'Practice records and legacy module observations remain context; neither counts as fresh formal evidence.',
      insufficient: 'Unseen or insufficient evidence stays unrated and blocks completion. An observed hindi_pa or kailangan_practice requires a new assessed attempt after feedback.',
      required_test_phases_per_component: ['pretest', 'posttest'],
      test_phase_meaning: 'Current validated learner release and a submitted attempt in each phase. Component readiness does not apply a test score threshold.',
      prior_bhw_evidence_reuse: false,
    },
    staff_award_proposal: {
      briefing_version: 'chapter-1:briefing.v1',
      current_study: 'All 42 published required lessons at current revisions',
      pretest: 'Submitted diagnostic; no pass threshold',
      posttest: 'Passed current Chapter 1 form at its 80 percent threshold',
      orientation_version: chapter.orientation.version,
      orientation: 'Six lessons, seven of eight cases correct including the mandatory safety case',
      simulation: {
        id: 'chapter-1-maria-communication-storyboard', version: '1.0.0',
        checkpoint_ids: checkpointIds, checkpoint_versions: checkpointIds.map(() => 1),
        source: {path: storyboardPath,
          sha256_lf: createHash('sha256').update(storyboard).digest('hex')},
      },
      prior_staff_evidence_reuse: 'Explicit recovery only: preserve old qualification ID and status; recheck unchanged current study, exams and orientation; require the new briefing and simulation receipt. No mass conversion.',
      issuer: 'Owner must supply organization, signatory and title before contract approval.',
    },
    conflict_decisions_proposed: {
      '1.3-refusal': 'Keep the current one combined bhs-decline lesson criterion. Kaya na requires all three observed actions without prompts: clear respectful refusal, correct policy reason and firm boundary with no workaround, and factual supervisor handover without patient data. Do not count this task as the separate policy-recall criterion. Any safe alternative is allowed only when the applicable policy permits it.',
      '1.6.2-clarification': 'Require the current communication-clarify criterion separately: open invitation, neutral clarification, room for correction and confirmation of the corrected summary. It contributes partial evidence to legacy listening but is never equated with legacy indicator 1 or satisfied by a listening score alone.',
      '1.8-safety': 'Require an observed safe dummy demonstration against the current local critical-step checklist, with no real used sharps. A paper control-selection answer is insufficient. The local checklist and escalation contact must be confirmed before pilot use.',
    },
    components: audit.modules.map(component => ({
      module_key: component.module_key,
      component_id: component.component_id,
      title: component.title,
      review_note: component.review_note,
      required_test_phases: ['pretest', 'posttest'],
      required_lessons: component.lessons.map(lesson => ({
        lesson_key: lesson.lesson_key,
        title: lesson.title,
        lesson_source: source(lesson.source),
        relation_to_legacy: 'supports_partial_component_evidence',
        proposed_legacy_indicator_ids: lesson.proposed_legacy_indicator_ids,
        criteria: lesson.criteria.map(criterion => ({
          id: criterion.proposed_id,
          proposed_version: '1',
          source_objective_index: criterion.objective_index,
          source: source(criterion.source),
          rubric: {
            observable: {fil: criterion.observable_fil, en: criterion.observable_en},
            not_yet: {fil: criterion.not_yet_fil, en: criterion.not_yet_en},
            levels: {
              kaya_na: {fil: criterion.levels.kaya_na_fil, en: criterion.levels.kaya_na_en},
              kailangan_practice: {fil: criterion.levels.kailangan_practice_fil, en: criterion.levels.kailangan_practice_en},
              hindi_pa: {fil: criterion.levels.hindi_pa_fil, en: criterion.levels.hindi_pa_en},
            },
          },
        })),
      })),
    })),
  };
}

if (import.meta.url.startsWith('file:') && process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && args[0] !== '--check')) {
    process.stderr.write('Usage: node scripts/c1af25-policy-proposal.mjs [--check]\n');
    process.exitCode = 2;
  } else {
    const expected = `${JSON.stringify(buildPolicyProposal(), null, 2)}\n`;
    if (args[0] === '--check') {
      if (readFileSync(outputPath, 'utf8') !== expected) {
        process.stderr.write('C1AF-25 proposal differs from current authored sources; review and regenerate it.\n');
        process.exitCode = 1;
      }
    } else process.stdout.write(expected);
  }
}
