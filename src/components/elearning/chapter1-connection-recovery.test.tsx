import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {Chapter1Assessment} from './chapter1-assessment';
const mock = vi.hoisted(() => ({rpc: vi.fn()}));
vi.mock('@/lib/supabase/client', () => ({createClient: () => ({rpc: mock.rpc})}));
const draft = () => ({attempt_id: 'draft', phase: 'pretest', state: 'draft', revision: 30, position: 29,
  language: 'en', score_percent: null as number | null, legacy_attempt_id: null as string | null,
  items: Array.from({length: 30}, (_, i) => ({item_id: `q${i}`, slot: `T${i}`, lesson_keys: [],
    stem: {en: `Question ${i + 1}`, fil: `Tanong ${i + 1}`}, options: [{id: 'a', label: {en: 'Answer', fil: 'Sagot'}}]})),
  responses: Array.from({length: 30}, (_, i) => ({item_id: `q${i}`, kind: 'choice', option_id: 'a', marked: false}))});
let stored: ReturnType<typeof draft>;
const props = {courseId: 'course', chapterHref: '/chapter', locale: 'en', sessionId: null,
  completed: true, contentApproved: true, initialState: {attempts: [{attempt_id: 'draft', phase: 'pretest' as const,
    state: 'draft', score_percent: null, legacy_attempt_id: null}], final_attempts: []},
  orientation: {expectations: {en: '', fil: ''}, overview: {en: '', fil: ''}, recap: {en: '', fil: ''}}};
beforeEach(() => {
  stored = draft(); vi.spyOn(window, 'confirm').mockReturnValue(true);
  mock.rpc.mockReset().mockResolvedValue({data: stored, error: null});
});
afterEach(() => {cleanup(); vi.restoreAllMocks();});
async function review(locale: string) {
  render(<Chapter1Assessment {...props} locale={locale}/>);
  fireEvent.click(screen.getByRole('button', {name: locale === 'en' ? 'Resume pretest' : 'Ipagpatuloy ang pretest'}));
  await screen.findByRole('heading', {name: locale === 'en' ? '30. Question 30' : '30. Tanong 30'});
  fireEvent.click(screen.getByRole('button', {name: locale === 'en' ? 'Review all' : 'Balikan ang lahat'}));
}

for (const locale of ['en', 'fil']) for (const rejected of [false, true]) {
  it(`recovers when submission and confirmation both lose the connection (${locale}, rejection=${rejected})`, async () => {
    await review(locale); const original = structuredClone(stored);
    mock.rpc.mockImplementation(async () => {
      if (rejected) throw Error('network lost');
      return {data: null, error: new Error('network lost')};
    });
    const submitName = locale === 'en' ? 'Submit assessment' : 'Isumite ang pagtatasa';
    fireEvent.click(screen.getByRole('button', {name: submitName}));
    expect(await screen.findByRole('alert')).toHaveTextContent(locale === 'en' ? 'Submission is not confirmed.' : 'Hindi pa kumpirmado ang pagsusumite.');
    expect(screen.getByRole('button', {name: submitName})).toBeEnabled();
    expect(screen.queryByRole('heading', {name: 'Assessment submitted'})).toBeNull();
    expect(stored).toEqual(original);
    mock.rpc.mockImplementation(async name => {
      if (name === 'rpc_learner_assessment_submit') stored = {...stored, state: 'submitted', score_percent: 80, legacy_attempt_id: 'final'};
      return {data: name === 'rpc_learner_assessment_state' ? {attempts: [], final_attempts: []} : structuredClone(stored), error: null};
    });
    fireEvent.click(screen.getByRole('button', {name: submitName}));
    await screen.findByRole('heading', {name: locale === 'en' ? 'Assessment submitted' : 'Naisumite ang pagtatasa'});
    expect(stored.responses).toEqual(original.responses);
  });
}
it.each(['en', 'fil'])('keeps a confirmed submission visible when only the history refresh rejects (%s)', async locale => {
  await review(locale); let checks = 0;
  mock.rpc.mockImplementation(async name => {
    if (name === 'rpc_learner_assessment_state') throw Error('history offline');
    if (name === 'rpc_learner_assessment_get') {checks++; return {data: {...stored, state: 'submitted', score_percent: 80, legacy_attempt_id: 'final'}, error: null};}
    return {data: {}, error: null};
  });
  fireEvent.click(screen.getByRole('button', {name: locale === 'en' ? 'Submit assessment' : 'Isumite ang pagtatasa'}));
  await screen.findByRole('heading', {name: locale === 'en' ? 'Assessment submitted' : 'Naisumite ang pagtatasa'});
  await waitFor(() => expect(checks).toBe(1));
  expect(screen.queryByRole('alert')).toBeNull();
});
it.each(['en', 'fil'])('reconciles a committed submission after a lost response without showing a false draft (%s)', async locale => {
  await review(locale); let commits = 0;
  mock.rpc.mockImplementation(async name => {
    if (name === 'rpc_learner_assessment_submit') {commits++; stored = {...stored, state: 'submitted', score_percent: 80, legacy_attempt_id: 'final'}; throw Error('response lost');}
    return {data: name === 'rpc_learner_assessment_state' ? {attempts: [], final_attempts: []} : structuredClone(stored), error: null};
  });
  fireEvent.click(screen.getByRole('button', {name: locale === 'en' ? 'Submit assessment' : 'Isumite ang pagtatasa'}));
  await screen.findByRole('heading', {name: locale === 'en' ? 'Assessment submitted' : 'Naisumite ang pagtatasa'});
  expect(commits).toBe(1); expect(screen.queryByRole('alert')).toBeNull();
});
