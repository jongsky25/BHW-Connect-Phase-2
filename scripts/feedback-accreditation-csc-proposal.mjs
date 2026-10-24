// Local authoring only: no database, import or activation operation.
import { writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAccreditationCscProposal, loadAccreditationCscInputs, renderAccreditationCscReview } from './lib/feedback-accreditation-csc-proposal.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const review = args.length === 1 && args[0] === '--review';
if (!review && args.length && (args.length !== 2 || args[0] !== '--output')) throw new Error('Use no arguments, --review or --output <path outside repository>. No import operation.');
const inputs = loadAccreditationCscInputs(root);
const candidate = buildAccreditationCscProposal(inputs);
if (!review && args.length) {
  const output = resolve(args[1]), repository = resolve(root);
  if (output === repository || output.startsWith(repository + sep)) throw new Error('Export outside the repository to preserve source files.');
  writeFileSync(output, JSON.stringify(candidate, null, 2) + '\n', { flag: 'wx' });
}
if (review) process.stdout.write(renderAccreditationCscReview(inputs));
else console.log(JSON.stringify({ proposal_id: candidate.proposal_id, editorial_status: candidate.editorial_status,
  publication_ready: candidate.publication_ready, replaced_test_items: 2, unchanged_test_items: 58,
  unchanged_checkpoint_items: 48, proposed_read_sections: candidate.lesson.revision.read_sections.length,
  proposed_slides: candidate.lesson.revision.slides.length, reviewed_lesson_revision: 'pending',
  curriculum_pin_refresh: 'required_before_publication', imported: false, activated: false }, null, 2));
