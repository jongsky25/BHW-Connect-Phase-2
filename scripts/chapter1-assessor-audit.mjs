import { fileURLToPath } from 'node:url';
import { auditChapter1Assessor } from './lib/chapter1-assessor-audit.mjs';

// Standard output is the only output destination. Redirect explicitly to save a local report.
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--summary')) {
    throw new Error('Usage: node scripts/chapter1-assessor-audit.mjs [--summary]');
  }
  const report = auditChapter1Assessor(fileURLToPath(new URL('../', import.meta.url)));
  const output = args[0] === '--summary' ? {
    status: report.status, publication_claim: report.publication_claim,
    ready_for_activation: report.ready_for_activation, summary: report.summary,
    orientation_coverage: report.orientation_coverage, activation_blockers: report.activation_blockers,
  } : report;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Chapter 1 assessor audit failed'}\n`);
  process.exitCode = 1;
}
