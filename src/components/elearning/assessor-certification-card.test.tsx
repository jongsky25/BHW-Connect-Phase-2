import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {AssessorCertificationCard} from './assessor-certification-card';
import type {ChapterCertifications} from '@/lib/assessor/certifications';
vi.mock('next/navigation', () => ({useRouter: () => ({refresh: vi.fn()})}));
const legacy: ChapterCertifications = {chapterKey: 'chapter-1', publicationAvailable: true, revisedPath: false, awards: [], legacy: [{id: 'legacy', issuedAt: '2026-10-12', status: 'active', curriculumVersion: 'v1', orientationVersion: 'v1'}]};
const props = {chapterKey: 'chapter-1', chapterId: 'ch', title: 'Chapter 1', chapterHref: '/training/p/assessor/chapter-1', published: true, readFailed: false, locale: 'en'};
describe('chapter certification cards', () => {
  it('labels legacy records distinctly and preserves explicit recovery before cutover', () => {
    render(<AssessorCertificationCard {...props} records={legacy} legacyState={{status: 'in_progress', next_step: 'issue'}}/>);
    expect(screen.getByText('Legacy qualification')).toBeVisible();
    expect(screen.getByRole('button', {name: 'Issue qualification'})).toBeVisible();
    expect(screen.getAllByText('In progress')).toHaveLength(2);
    expect(screen.queryByText('Certified')).toBeNull();
  });
  it('does not present legacy recovery as the combined path after cutover', () => {
    render(<AssessorCertificationCard {...props} records={{...legacy, revisedPath: true}} legacyState={{status: 'in_progress', next_step: 'issue'}}/>);
    expect(screen.queryByRole('button', {name: 'Issue qualification'})).toBeNull();
    expect(screen.getByText(/The combined path checks/)).toBeVisible();
  });
  it('shows unavailable Chapter 3 in Filipino without certification or action', () => {
    render(<AssessorCertificationCard {...props} chapterKey="chapter-3" title="Kabanata 3" locale="fil" published={false}/>);
    expect(screen.getByText('Hindi pa available')).toBeVisible();
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('distinguishes missing approved requirements from unpublished chapter content', () => {
    render(<AssessorCertificationCard {...props} records={legacy} legacyState={{status: 'unavailable', next_step: 'await_chapter_requirements'}}/>);
    expect(screen.getByText('Approved exam and orientation requirements are not yet available.')).toBeVisible();
    expect(screen.queryByText('Required chapter content is not currently published.')).toBeNull();
  });
  it('does not label a failed read as missing evidence', () => {
    render(<AssessorCertificationCard {...props} readFailed records={legacy}/>);
    expect(screen.getByRole('alert')).toHaveTextContent('Status could not be read');
    expect(screen.queryByText('In progress')).toBeNull();
  });
});
