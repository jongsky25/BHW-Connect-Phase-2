// Local authoring only. This command has no database or activation operation.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUhcProposal } from './lib/feedback-uhc-proposal.mjs';
import { loadLessonMap } from './lib/chapter1-assessment-content.mjs';
import { renderUhcProposalReview } from './lib/feedback-uhc-review.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const content = resolve(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const read = file => JSON.parse(readFileSync(resolve(content, file), 'utf8'));
const args = process.argv.slice(2);
const reviewOnly = args.length === 1 && args[0] === '--review';
if (!reviewOnly && args.length && (args.length !== 2 || args[0] !== '--output')) throw new Error('Use no arguments, --review, or --output <path outside the assessment source folder>. There is no import operation.');
const base = read('release.json');
const proposal = read('proposals/fb-2.2a-uhc/proposal.json');
const candidate = buildUhcProposal(base, proposal, {
  ...loadLessonMap(root), orientation: read('orientation.json'),
});
if (args.length && !reviewOnly) {
  const output = resolve(args[1]);
  if (output === content || output.startsWith(content + sep)) throw new Error('Cannot overwrite assessment source files. Export outside the assessment source folder.');
  writeFileSync(output, JSON.stringify(candidate, null, 2) + '\n', { flag: 'wx' });
}
if (reviewOnly) process.stdout.write(renderUhcProposalReview(base, proposal));
else console.log(JSON.stringify({ release_id: candidate.release_id, publication_status: candidate.publication_status,
  forms: Object.fromEntries(Object.entries(candidate.forms).map(([phase, form]) => [phase, { form_id: form.form_id, items: form.items.length, hash: form.hash }])),
  replaced_items: 2, unchanged_form_items: 58, unchanged_checkpoint_items: 48,
  current_release_modified: false, imported: false, activated: false,
  review: 'Pending bilingual, health/policy and assessment review. Importer rejects this draft.' }, null, 2));
