import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGabayContent } from './gabay-content.mjs';

test('approved Gabay package has five bilingual lessons and the complete two-part pass contract', () => {
  const content = loadGabayContent();
  assert.equal(content.modules.length, 5);
  assert.deepEqual(content.modules.map((m) => m.id), ['gabay-01','gabay-02','gabay-03','gabay-04','gabay-05']);
  assert.equal(content.modules.every((m) => m.body_fil && m.body_en && m.body_fil.includes('Pagsasanay:') && m.body_en.includes('Practice:')), true);
  assert.equal(content.questions.length, 10);
  assert.deepEqual(content.questions.map((q) => q.id), ['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10']);
  assert.equal(content.questions.every((q) => q.prompt_fil && q.prompt_en && q.options.length === 3 && q.options.every((o) => o.fil && o.en)), true);
  assert.equal(content.questions.every((q) => q.correct_option_index >= 0 && q.correct_option_index < q.options.length), true);
  assert.equal(content.opening_diagnostic.length, 3);
  assert.equal(content.quiz_passing_percent, 80);
  assert.equal(content.quiz_max_attempts, 3);
  assert.equal(content.assessment_kind, 'gabay_roleplay');
});
