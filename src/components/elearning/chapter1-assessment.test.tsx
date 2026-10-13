import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Chapter1Assessment} from './chapter1-assessment';

const mock = vi.hoisted(() => ({phase: 'pretest', responses: [] as Array<{
  item_id: string; kind: 'choice' | 'unknown'; option_id: string | null; marked: boolean;
}>}));

vi.mock('@/lib/supabase/client', () => ({createClient: () => ({rpc: async (name: string, args: {
  p_changes?: typeof mock.responses;
  p_position?: number;
}) => {
  if (name === 'rpc_learner_assessment_save') mock.responses = [...mock.responses, ...(args.p_changes ?? [])];
  if (name === 'rpc_learner_assessment_state') return {data: {attempts: [], final_attempts: []}, error: null};
  return {data: {
    attempt_id: 'draft', phase: mock.phase, state: 'draft', revision: mock.responses.length,
    position: args?.p_position ?? 0, language: 'en', responses: mock.responses,
    items: [1, 2].map(i => ({item_id: `q${i}`, slot: `slot-${i}`,
      stem: {en: `Prompt ${i}`, fil: `Tanong ${i}`}, lesson_keys: [],
      options: [{id: `a${i}`, label: {en: 'Answer', fil: 'Sagot'}}]})),
    score_percent: null, legacy_attempt_id: null,
  }, error: null};
}})}));

afterEach(() => {cleanup(); mock.responses = [];});

it.each(['pretest', 'posttest'])('colors saved and unanswered question numbers in the %s', async phase => {
  mock.phase = phase;
  render(<Chapter1Assessment courseId="course" chapterHref="/chapter" locale="en" sessionId={null}
    completed initialState={{attempts: [{attempt_id: 'draft', phase: phase as 'pretest' | 'posttest', state: 'draft',
      score_percent: null, legacy_attempt_id: null}], final_attempts: phase === 'posttest'
      ? [{id: 'pre', phase: 'pretest', score_percent: 50}] : []}}
    orientation={{expectations: {en: '', fil: ''}, overview: {en: '', fil: ''}, recap: {en: '', fil: ''}}}
    contentApproved assessor />);
  fireEvent.click(screen.getByRole('button', {name: `Resume ${phase}`}));
  const first = await screen.findByRole('button', {name: 'Question 1, unanswered'});
  expect(first).toHaveClass('bg-warning/15');
  expect(first).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('button', {name: 'Question 2, unanswered'})).toHaveClass('bg-warning/15');

  fireEvent.click(screen.getByRole('radio', {name: "I don't know yet"}));
  await waitFor(() => expect(screen.getByRole('button', {name: 'Question 1, answered'})).toHaveClass('bg-success/15'));
  fireEvent.click(screen.getByRole('button', {name: 'Review all'}));
  const numbers = screen.getAllByRole('listitem').map(item => item.querySelector('button'));
  expect(numbers[0]).toHaveClass('bg-success/15');
  expect(numbers[1]).toHaveClass('bg-warning/15');
});
