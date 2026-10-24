/** Author-only review packet generated from the same proposal as the candidate. */
export function renderUhcProposalReview(base, proposal) {
  const lines = ['# FB-2.2a — bilingual UHC assessment proposal', '',
    '**Draft for review.** These proposed questions and answer keys are authoring material. They are not loaded by the app or imported into a database. Reviewer and approval fields remain empty.', '',
    'The two replacements stay in T05 (coverage). T06 (referral), the other 58 form items, the 48 checkpoint items and all 42 curriculum pins are retained exactly. The provider terminology note is unscored and awaits a teaching-placement decision.', '', '## Proposed questions'];
  for (const replacement of proposal.replacements) {
    const q = replacement.item;
    const old = base.forms[replacement.phase].items.find(item => item.slot === replacement.slot);
    lines.push('', `### ${replacement.phase} — T05, version ${q.version}`, '', `Replaces \`${old.item_id}\` with \`${q.item_id}\`.`);
    for (const [lang, label] of [['en', 'English'], ['fil', 'Filipino']]) {
      lines.push('', `**${label}: current question**`, '', old.stem[lang], '', `**${label}: proposed question**`, '', q.stem[lang], '');
      for (const option of q.options) {
        const correct = option.id === q.correct_option_id ? ' — proposed correct answer' : '';
        lines.push(`- **${option.id}${correct}:** ${option.label[lang]}`);
        if (option.distractor_rationale) lines.push(`  Reason this choice is incorrect: ${option.distractor_rationale[lang]}`);
      }
      lines.push('', `**Proposed rationale:** ${q.rationale[lang]}`);
    }
  }
  lines.push('', '## Unscored provider terminology note', '', proposal.terminology_note.text.en, '', proposal.terminology_note.text.fil, '',
    'This note is for the reviewer packet. It is not inserted into a pretest, scored as an extra item or displayed to learners. Confirm the teaching location and wording before a separate lesson/content revision.', '', '## Source checks', '');
  for (const source of proposal.sources) lines.push(`- [${source.id}](${source.url}): ${source.locators.join(', ')}.`);
  lines.push('', '## Review and release work still required', '');
  for (const check of proposal.review_requirements.checks) lines.push(`- ${check}`);
  lines.push('', 'The proposal does not establish form equivalence. Keep comparability unvalidated; do not compare learning gains across different releases. Existing enrollments remain pinned to their original release for both phases. Existing drafts finish their original forms, and submitted snapshots, answers and scores remain unchanged.', '',
    'After item-by-item review, record the real reviewer identities and reviewed commit, then prepare a separate controlled release/import/activation change. This authoring command cannot perform any of those operations.', '', '## Reproduce the draft candidate', '',
    '```sh', 'node scripts/feedback-uhc-proposal.mjs', 'node scripts/feedback-uhc-proposal.mjs --review', 'node scripts/feedback-uhc-proposal.mjs --output /tmp/fb-2.2a-candidate.json', '```', '',
    'The export uses a new release ID and new form IDs, remains `publication_status: draft`, and fails the existing importer approval contract. It writes only when an output path is explicitly supplied, refuses assessment-source destinations and never overwrites an existing file. The current release and approval record remain untouched.');
  return lines.join('\n') + '\n';
}
