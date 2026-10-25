import type {ComponentProps, MouseEvent} from 'react';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {Chapter1Assessment} from './chapter1-assessment';

const mock = vi.hoisted(() => ({rpc: vi.fn(), leave: [] as boolean[]}));
vi.mock('@/lib/supabase/client', () => ({createClient: () => ({rpc: mock.rpc})}));
vi.mock('next/link', () => ({default: ({prefetch: _prefetch, onClick, children, ...props}:
  ComponentProps<'a'> & {prefetch?: boolean}) => {
  void _prefetch;
  return <a {...props} onClick={(event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event); mock.leave.push(event.defaultPrevented); event.preventDefault();
  }}>{children}</a>;
}}));

function draft() {
  return {attempt_id: 'draft', phase: 'pretest', state: 'draft', revision: 0, position: 9, language: 'en',
    items: Array.from({length: 30}, (_, i) => ({item_id: `q${i + 1}`, slot: `T${i + 1}`, lesson_keys: [],
      stem: {en: `Prompt ${i + 1}`, fil: `Tanong ${i + 1}`},
      options: [{id: 'a', label: {en: 'Answer', fil: 'Sagot'}}]})),
    responses: [{item_id: 'q10', kind: 'unknown', option_id: null as string | null, marked: true}],
    score_percent: null, legacy_attempt_id: null};
}
let stored: ReturnType<typeof draft>;
const props = {courseId: 'course', chapterHref: '/chapter', locale: 'en', sessionId: null,
  completed: true, contentApproved: true,
  initialState: {attempts: [{attempt_id: 'draft', phase: 'pretest' as const, state: 'draft',
    score_percent: null, legacy_attempt_id: null}], final_attempts: []},
  orientation: {expectations: {en: '', fil: ''}, overview: {en: '', fil: ''}, recap: {en: '', fil: ''}}};
beforeEach(() => {
  stored = draft(); mock.leave = [];
  mock.rpc.mockReset().mockImplementation(async (name, args) => {
    if (name === 'rpc_learner_assessment_save') stored = {...stored, revision: stored.revision + 1,
      position: args.p_position, responses: [...stored.responses.filter(r => !args.p_changes.some((c: {item_id: string}) => c.item_id === r.item_id)), ...args.p_changes]};
    return {data: structuredClone(stored), error: null};
  });
});
afterEach(cleanup);
async function open(locale = 'en') {
  fireEvent.click(screen.getByRole('button', {name: locale === 'en' ? 'Resume pretest' : 'Ipagpatuloy ang pretest'}));
  await screen.findByRole('heading', {name: locale === 'en' ? `Prompt ${stored.position + 1}` : `Tanong ${stored.position + 1}`});
}

it.each(['en', 'fil'])('shows length and optional saved-draft breaks before starting in %s', locale => {
  render(<Chapter1Assessment {...props} locale={locale}/>);
  const guide = screen.getByRole('complementary', {name: locale === 'en' ? 'Assessment length and breaks' : 'Haba ng pagtatasa at pahinga'});
  expect(guide).toHaveTextContent(locale === 'en' ? '30 questions in 3 sets of 10. No countdown.' : '30 tanong sa 3 bahaging tig-10. Walang countdown.');
  expect(mock.rpc).not.toHaveBeenCalled();
});

it.each([{locale: 'en', position: 9}, {locale: 'en', position: 19}, {locale: 'fil', position: 9}, {locale: 'fil', position: 19}])(
  'offers an optional pause at question $position in $locale without saving or submitting', async ({locale, position}) => {
    stored.position = position;
    stored.responses[0].item_id = `q${position + 1}`;
    const view = render(<Chapter1Assessment {...props} locale={locale} assessor/>); await open(locale);
    const panel = screen.getByRole('complementary', {name: locale === 'en' ? 'Optional pause point' : 'Opsyonal na pahinga'});
    expect(panel).toHaveTextContent(locale === 'en' ? 'This set: 1 of 10 responses saved.' : 'Sa bahaging ito: 1 sa 10 sagot ang naka-save.');
    const before = structuredClone(stored);
    fireEvent.click(screen.getByRole('link', {name: locale === 'en' ? 'Pause and return to chapter' : 'Magpahinga at bumalik sa kabanata'}));
    expect(mock.leave.at(-1)).toBe(false);
    expect(mock.rpc).toHaveBeenCalledTimes(1); expect(stored).toEqual(before);
    view.unmount(); render(<Chapter1Assessment {...props} locale={locale}/>); await open(locale);
    expect(screen.getByRole('radio', {name: locale === 'en' ? "I don't know yet" : 'Hindi ko pa alam'})).toBeChecked();
    fireEvent.click(screen.getByRole('button', {name: locale === 'en' ? 'Next' : 'Susunod'}));
    await screen.findByRole('heading', {name: locale === 'en' ? `Prompt ${position + 2}` : `Tanong ${position + 2}`});
    expect(stored.responses).toEqual(before.responses);
    expect(mock.rpc).toHaveBeenLastCalledWith('rpc_learner_assessment_save', expect.objectContaining({p_position: position + 1, p_changes: []}));
  });

it.each([0, 8, 10, 18, 20, 29])('does not add a pause checkpoint at question index %s', async position => {
  stored.position = position; render(<Chapter1Assessment {...props}/>); await open();
  expect(screen.queryByRole('complementary', {name: 'Optional pause point'})).toBeNull();
  expect(stored.items).toHaveLength(30);
});

it('blocks both leave links while a save is in flight and after an unsaved change, then permits leaving after retry', async () => {
  render(<Chapter1Assessment {...props}/>); await open();
  let finish: (value: {data: null; error: Error}) => void = () => {};
  mock.rpc.mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  fireEvent.click(screen.getByRole('radio', {name: 'Answer'}));
  for (const name of ['Pause and return to chapter', 'Save and leave']) {
    expect(screen.getByRole('link', {name})).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('link', {name})); expect(mock.leave.at(-1)).toBe(true);
  }
  finish({data: null, error: new Error('offline')}); await screen.findByRole('button', {name: 'Retry save'});
  fireEvent.click(screen.getByRole('link', {name: 'Pause and return to chapter'})); expect(mock.leave.at(-1)).toBe(true);
  expect(screen.getByRole('complementary', {name: 'Optional pause point'})).toHaveTextContent('This set: 1 of 10 responses saved.');
  expect(stored.responses[0].kind).toBe('unknown');
  fireEvent.click(screen.getByRole('button', {name: 'Retry save'}));
  await waitFor(() => expect(screen.getByRole('link', {name: 'Pause and return to chapter'})).toHaveAttribute('aria-disabled', 'false'));
  fireEvent.click(screen.getByRole('link', {name: 'Pause and return to chapter'})); expect(mock.leave.at(-1)).toBe(false);
  expect(stored.responses[0].kind).toBe('choice');
  expect(mock.rpc.mock.calls.some(([name]) => name === 'rpc_learner_assessment_submit')).toBe(false);
});
