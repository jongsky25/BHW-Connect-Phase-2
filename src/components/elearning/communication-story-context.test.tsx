import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
import {communicationStorySupplement} from '@/lib/elearning/communication-story-context';
import {applyApprovedReferenceReleases} from '../../../scripts/lib/safety-identify-copy-release.mjs';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const authored=applyApprovedReferenceReleases(loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public')).lessons.find((l: {manifest: {lesson_key: string}})=>l.manifest.lesson_key==='communication-explain')!;
const lesson={...authored.manifest,id:'lesson',revision:{...authored.revision,id:'revision',content_hash:contentHash(authored)}} as ReferenceData['lessons'][number];
const asset=lesson.revision.assets.find(a=>a.id===lesson.revision.featured_asset_id)!;

it('keeps the audited context and transcript for learners pinned to the predecessor',()=>{
  const prior=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public').lessons.find((l: {manifest: {lesson_key: string}})=>l.manifest.lesson_key==='communication-explain')!;
  const pinned={...prior.manifest,id:'old-lesson',revision:{...prior.revision,id:'old-revision',content_hash:contentHash(prior)}} as ReferenceData['lessons'][number];
  const priorAsset=pinned.revision.assets.find(a=>a.id===pinned.revision.featured_asset_id)!;
  const supplement=communicationStorySupplement(pinned,priorAsset,true);
  expect(supplement?.cases.map(c=>c.name)).toEqual(['Liza','Jo','Ben','Ramon']);
  expect(supplement?.transcript.paragraphs[1]).toContain('With Jo, hear her concern');
});

it.each([true,false])('introduces the actual cases and caption transcript only in the story view, including fullscreen (en=%s)',en=>{
  const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  const onComplete=vi.fn(),onResume=vi.fn();
  try{
    const {container}=render(<ReferenceLessons title_en="Manual" title_fil="Manual" chapters={[]} lessons={[lesson]} completed={[]} resumes={[]} modules={[]} locale={en?'en':'fil'} initialLessonId="lesson" readOnly onComplete={onComplete} onResume={onResume}/>);
    const heading=en?'Before you watch':'Bago manood';
    expect(screen.queryByRole('heading',{name:heading})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:en?'Narrated story':'Kuwentong may salaysay'}));
    const context=screen.getByRole('region',{name:heading});
    for(const name of ['Liza','Jo','Ben','Ramon'])expect(within(context).getByText(`${name}:`)).toBeInTheDocument();
    expect(context).toHaveTextContent('family planning');
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(container.querySelector('video')).not.toHaveAttribute('autoplay');
    const title=en?'Story transcript':'Teksto ng pagsasalaysay';
    fireEvent.click(screen.getByText(title));
    expect(screen.getByText(communicationStorySupplement(lesson,asset,en)!.transcript.paragraphs[0])).toBeVisible();
    expect(screen.queryByText(en?'Steps as text':'Mga hakbang bilang teksto')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
    const dialog=within(container.querySelector('dialog')!);
    expect(dialog.getByRole('region',{name:heading})).toBeInTheDocument();
    expect(dialog.getByText(title)).toBeInTheDocument();
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(onComplete).not.toHaveBeenCalled();expect(onResume).not.toHaveBeenCalled();
  }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
});

it.each(['revision','video','caption','excerpt','lesson','asset'])('does not attach stale context or transcript after %s drift',drift=>{
  const l=structuredClone(lesson),a=structuredClone(asset);
  if(drift==='revision')l.revision.content_hash='new';
  if(drift==='video')a.videos!.en.path='/new.mp4';
  if(drift==='caption')a.videos!.en.captions!.content_hash='new';
  if(drift==='excerpt')l.revision.read_sections[0].body_en='New situation';
  if(drift==='lesson')l.lesson_key='other';
  if(drift==='asset')a.id='other';
  expect(communicationStorySupplement(l,a,true)).toBeNull();
});
