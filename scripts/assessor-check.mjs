#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { auditCurriculum } from './lib/assessor-curriculum.mjs';

const args = process.argv.slice(2);
if (args.some(a => a !== '--require-ready')) {
  console.error('Usage: node scripts/assessor-check.mjs [--require-ready]');
  process.exitCode = 1;
} else {
  try {
    const report = auditCurriculum(fileURLToPath(new URL('../', import.meta.url)));
    console.log(JSON.stringify(report, null, 2));
    if (args.includes('--require-ready') && !report.readyForActivation) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
