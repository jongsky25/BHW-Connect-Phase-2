// Versioned pre/post test bank sync (20260928000000_versioned_test_bank.sql).
//
// Past attempts store answers by question id, so a question BHWs may have
// answered is never edited in place. The plan compares test-questions.json
// with the course's active rows, position by position:
//
// - no active row      → insert
// - same content       → keep; if only the module tag differs, tag it in place
//                         (the tag decides whether the question is scored, not
//                         what it asks)
// - different content  → retire the old row, insert the new one
// - active row past the end of the file → retire
//
// Retired rows stay in the table. Apply retirements before inserts: only one
// active row per position is allowed. A run interrupted after a retirement
// simply inserts on the next run, so the plan is safe to re-run.
import { canonical } from "./reference-content.mjs";

const CONTENT_KEYS = ["prompt_fil", "prompt_en", "options", "correct_option_index"];

export function planTestBankSync(existingRows, questions) {
  const active = new Map();
  for (const row of existingRows) {
    if (row.retired_at) continue;
    if (active.has(row.position)) throw new Error(`two active test questions at position ${row.position}`);
    active.set(row.position, row);
  }
  const plan = { insert: [], retire: [], tag: [], keep: 0 };
  questions.forEach((q, position) => {
    const modulePosition = q.module_position ?? null;
    const row = active.get(position);
    const payload = {
      position,
      prompt_fil: q.prompt_fil,
      prompt_en: q.prompt_en,
      options: q.options,
      correct_option_index: q.correct_option_index,
      module_position: modulePosition,
    };
    if (!row) {
      plan.insert.push(payload);
    } else if (CONTENT_KEYS.every((k) => canonical(row[k]) === canonical(q[k]))) {
      if ((row.module_position ?? null) === modulePosition) plan.keep += 1;
      else plan.tag.push({ id: row.id, position, module_position: modulePosition });
    } else {
      plan.retire.push({ id: row.id, position });
      plan.insert.push(payload);
    }
  });
  for (const row of active.values()) {
    if (row.position >= questions.length) plan.retire.push({ id: row.id, position: row.position });
  }
  return plan;
}
