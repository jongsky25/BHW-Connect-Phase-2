import {act, cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {ReferenceLessons, type ReferenceData} from './reference-lessons';

vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn()})}));
afterEach(() => { cleanup(); vi.useRealTimers(); });

const section = (id: string, heading: string) => ({id, concept_ids: ['shared-topic'], asset_ids: [],
  heading_en: heading, heading_fil: `FIL ${heading}`, body_en: `${heading} full explanation`, body_fil: `${heading} buong paliwanag`, check: null});
const reads = [section('audience', 'Audience'), section('body', 'Body'), section('practice', 'Practice')];
const slides = [reads[2], reads[0], reads[1]].map(s => ({...s, id: `${s.id}-slide`, layout: 'takeaway', display_en: `${s.heading_en} summary`, display_fil: `${s.heading_fil} buod`}));
const data = {title_en: 'Manual', title_fil: 'Manual', chapters: [], completed: [],
  resumes: [{lesson_id: 'lesson', revision_id: 'revision', modality: 'slides', position_key: 'audience-slide', concept_id: 'shared-topic', updated_at: '2026-10-23'}],
  lessons: [{id: 'lesson', lesson_key: 'fixture', module_id: 'module', required: true, title_en: 'Lesson', title_fil: 'Aralin', objectives_en: [], objectives_fil: [],
    revision: {id: 'revision', read_sections: reads, slides, assets: [], sources: []}}]} as unknown as ReferenceData;

for (const locale of ['en', 'fil']) for (const fullscreen of [false, true]) {
  it(`keeps the current section through mode switches despite shared concepts, reordered slides and stale resumes (${locale}, fullscreen=${fullscreen})`, () => {
    const show = HTMLDialogElement.prototype.showModal;
    const close = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    const onResume = vi.fn();
    const onComplete = vi.fn();
    try {
      const {container} = render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" initialMode="read" locale={locale} readOnly onResume={onResume} onComplete={onComplete}/>);
      if (fullscreen) fireEvent.click(screen.getByRole('button', {name: locale === 'en' ? 'Full screen' : 'Buong screen'}));
      const view = fullscreen ? within(container.querySelector('dialog')!) : screen;
      fireEvent.click(view.getByRole('button', {name: locale === 'en' ? 'Next' : 'Susunod'}));
      expect(view.getByRole('heading', {name: locale === 'en' ? 'Body' : 'FIL Body'})).toBeInTheDocument();
      fireEvent.click(view.getByRole('button', {name: 'Slides'}));
      expect(view.getByRole('heading', {name: locale === 'en' ? 'Body' : 'FIL Body'})).toBeInTheDocument();
      expect(view.getByText(locale === 'en' ? 'Body summary' : 'FIL Body buod')).toBeInTheDocument();
      fireEvent.click(view.getByRole('button', {name: locale === 'en' ? 'Read' : 'Basahin'}));
      expect(view.getByRole('heading', {name: locale === 'en' ? 'Body' : 'FIL Body'})).toBeInTheDocument();
      expect(onResume).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
    } finally {
      HTMLDialogElement.prototype.showModal = show;
      HTMLDialogElement.prototype.close = close;
    }
  });
}

it('saves the paired destination through the existing resume callback without completing the lesson', async () => {
  vi.useFakeTimers({shouldAdvanceTime: true});
  const onResume = vi.fn().mockResolvedValue(undefined);
  const onComplete = vi.fn();
  render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" initialMode="read" locale="en" onResume={onResume} onComplete={onComplete}/>);
  fireEvent.click(screen.getByRole('button', {name: 'Next'}));
  fireEvent.click(screen.getByRole('button', {name: 'Slides'}));
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(onResume).toHaveBeenCalledWith(expect.objectContaining({lesson_id: 'lesson', revision_id: 'revision', modality: 'slides', position_key: 'body-slide', concept_id: 'shared-topic'}));
  expect(onComplete).not.toHaveBeenCalled();
});
