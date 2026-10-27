import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Chapter1Assessment } from './chapter1-assessment';

const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc: mock.rpc }) }));

function draft() {
  return {
    attempt_id: 'draft', phase: 'pretest', state: 'draft', revision: 0, position: 0, language: 'en',
    responses: [{ item_id: 'q1', kind: 'choice', option_id: 'a1', marked: false }],
    items: Array.from({ length: 30 }, (_, i) => ({
      item_id: `q${i + 1}`, slot: `slot-${i + 1}`, lesson_keys: [],
      stem: { en: `Prompt ${i + 1}`, fil: `Tanong ${i + 1}` },
      options: [{ id: `a${i + 1}`, label: { en: 'Answer', fil: 'Sagot' } }],
    })),
    score_percent: null, legacy_attempt_id: null,
  };
}

const props = {
  courseId: 'course', chapterHref: '/chapter', locale: 'en', sessionId: null,
  completed: true, contentApproved: true,
  initialState: { attempts: [{ attempt_id: 'draft', phase: 'pretest' as const, state: 'draft',
    score_percent: null, legacy_attempt_id: null }], final_attempts: [] },
  orientation: { expectations: { en: '', fil: '' }, overview: { en: '', fil: '' }, recap: { en: '', fil: '' } },
};

let stored: ReturnType<typeof draft>;
beforeEach(() => {
  stored = draft();
  mock.rpc.mockReset().mockImplementation(async (name, args) => {
    if (name === 'rpc_learner_assessment_save') {
      stored = { ...stored, position: args.p_position, revision: stored.revision + 1 };
    }
    return { data: structuredClone(stored), error: null };
  });
});
afterEach(cleanup);

async function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Resume pretest' }));
  await screen.findByRole('heading', { name: '1. Prompt 1' });
}

it.each([false, true])('resumes the question selected from review with saved answers (assessor=%s)', async assessor => {
  const view = render(<Chapter1Assessment {...props} assessor={assessor} />);
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Review all' }));
  fireEvent.click(screen.getByRole('button', { name: '12: unanswered' }));
  await screen.findByRole('heading', { name: '12. Prompt 12' });
  expect(mock.rpc).toHaveBeenCalledWith('rpc_learner_assessment_save', expect.objectContaining({
    p_attempt_id: 'draft', p_position: 11, p_changes: [], p_expected_revision: 0,
  }));
  view.unmount();
  render(<Chapter1Assessment {...props} assessor={assessor} />);
  fireEvent.click(screen.getByRole('button', { name: 'Resume pretest' }));
  await screen.findByRole('heading', { name: '12. Prompt 12' });
  expect(screen.getByRole('button', { name: 'Question 1, answered' })).toBeInTheDocument();
});

it('stays on review if saving the selected question fails, then allows retry', async () => {
  render(<Chapter1Assessment {...props} />);
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Review all' }));
  mock.rpc.mockResolvedValueOnce({ data: null, error: new Error('offline') });
  fireEvent.click(screen.getByRole('button', { name: '12: unanswered' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('heading', { name: 'Review before submitting' })).toBeInTheDocument();
  expect(stored.position).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: '12: unanswered' }));
  await screen.findByRole('heading', { name: '12. Prompt 12' });
});

it('reuses the position mutation receipt when the server saved but the response was lost', async () => {
  render(<Chapter1Assessment {...props} />);
  await open();
  let original: Record<string, unknown> | undefined;
  mock.rpc.mockImplementation(async (name, args) => {
    if (name !== 'rpc_learner_assessment_save') return { data: stored, error: null };
    if (!original) {
      original = args;
      stored = { ...stored, position: args.p_position, revision: 1 };
      throw new Error('response lost');
    }
    // The real RPC returns its receipt before checking the stale revision.
    if (args.p_mutation_id === original.p_mutation_id) {
      expect(args).toEqual(original);
      return { data: stored, error: null };
    }
    return { data: null, error: new Error('stale assessment revision') };
  });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('heading', { name: '1. Prompt 1' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByRole('heading', { name: '2. Prompt 2' });
  expect(stored.revision).toBe(1);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('blocks competing review navigation while a position save is in flight', async () => {
  render(<Chapter1Assessment {...props} />);
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Review all' }));
  let finish!: (value: { data: typeof stored; error: null }) => void;
  mock.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: '12: unanswered' }));
  expect(screen.getByRole('button', { name: '13: unanswered' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Back to questions' })).toBeDisabled();
  finish({ data: { ...stored, position: 11, revision: 1 }, error: null });
  await waitFor(() => expect(screen.getByRole('heading', { name: '12. Prompt 12' })).toBeInTheDocument());
});
