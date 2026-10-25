import{cleanup,fireEvent,render,screen,within}from'@testing-library/react';
import{afterEach,expect,it,vi}from'vitest';
import{loadReferenceModule,contentHash}from'../../../scripts/lib/reference-content.mjs';
import manifest from '../../../content/training/day1-basic-competencies/narration.json';
import media from '@/lib/elearning/prioritization-narrated-lesson.json';
import{narrationForLesson,type ReferenceNarrationManifest}from'@/lib/elearning/reference-narration';
import{prioritizationNarratedLesson}from'@/lib/elearning/prioritization-narrated-lesson';
import{ReferenceLessons,type ReferenceData}from'./reference-lessons';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
function source(key:string){
 const mod=key==='problem-prioritize'?'07-problema':'04-ra7883';
 const s=loadReferenceModule('content/training/day1-basic-competencies/modules/'+mod,'public').lessons.find(l=>l.manifest.lesson_key===key)!;
 return{...s.manifest,id:'lesson',revision:{...s.revision,id:'revision',content_hash:contentHash(s)}}as ReferenceData['lessons'][number];
}
function audio(lesson:ReferenceData['lessons'][number],en:boolean){return narrationForLesson(manifest as ReferenceNarrationManifest,lesson.lesson_key,en?'en':'fil',lesson.revision.read_sections);}
for(const en of[true,false])for(const mode of['read','slides']as const)for(const fullscreen of[true,false]){
 it(`offers the real derived lesson and preserves original final-check gates (${en}, ${mode}, fullscreen=${fullscreen})`,()=>{
  vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
  const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  const l=source('problem-prioritize'),onComplete=vi.fn(),onResume=vi.fn();
  try{
   const{container}=render(<ReferenceLessons title_en="Manual" title_fil="Manual" chapters={[]} modules={[]} lessons={[l]} completed={[]} resumes={[]} initialLessonId="lesson" initialMode={mode} locale={en?'en':'fil'} narration={{lesson:audio(l,en)}} storyQuestionHandoff readOnly onComplete={onComplete} onResume={onResume}/>);
   if(fullscreen)fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
   const view=fullscreen?within(container.querySelector('dialog')!):screen;
   expect(container.querySelector('[data-narration-access-guide]')).not.toBeNull();
   fireEvent.click(view.getByRole('button',{name:en?'Illustrated narrated lesson':'Araling may larawan at salaysay'}));
   const video=container.querySelector('video')!;expect(video).toHaveAttribute('preload','none');expect(video).toHaveAttribute('controls');expect(video).not.toHaveAttribute('autoplay');expect(video).not.toHaveAttribute('muted');
   expect(video.querySelector('source')).toHaveAttribute('src',media.languages[en?'en':'fil'].video.path);expect(video.querySelector('track')).toHaveAttribute('srclang',en?'en':'fil');
   expect(view.getByText(en?'Includes AI-generated illustrations':'May mga ilustrasyong ginawa gamit ang AI')).toBeInTheDocument();
   const protectedText=l.revision.read_sections.at(-1)![en?'takeaway_en':'takeaway_fil']!;
   expect(container.querySelector('.reference-story-player')).not.toHaveTextContent(protectedText);
   fireEvent.ended(video);
   expect(container.querySelector('video')).toBeNull();expect(container.querySelector('.reference-check-feedback')).toBeNull();expect(container.querySelector('audio')).toBeNull();
   const check=l.revision.read_sections.at(-1)!.check!;for(const option of check.options)expect(view.getByRole('button',{name:en?option.en:option.fil})).toBeVisible();
   fireEvent.click(view.getByRole('button',{name:en?check.options[1].en:check.options[1].fil}));
   expect(view.getByText(en?check.feedback_en:check.feedback_fil)).toBeInTheDocument();
   expect(onComplete).not.toHaveBeenCalled();expect(onResume).not.toHaveBeenCalled();
  }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
 });
}
it.each([true,false])('retains Legal-basis Listen and Slides full audio in language %s',en=>{
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
 const l=source('bhw-legal-role');const{container}=render(<ReferenceLessons title_en="Manual" title_fil="Manual" chapters={[]} modules={[]} lessons={[l]} completed={[]} resumes={[]} initialLessonId="lesson" locale={en?'en':'fil'} narration={{lesson:audio(l,en)}} readOnly onComplete={vi.fn()} onResume={vi.fn()}/>);
 expect(screen.getByRole('group',{name:en?'Listen to this section':'Pakinggan ang bahaging ito'})).toBeInTheDocument();
 expect(container.querySelector('[data-narration-access-guide]')).not.toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Slides'}));expect(screen.getByText(en?'Full narration and audio':'Buong salaysay at audio')).toBeInTheDocument();
 expect(container.querySelector('audio')).toHaveAttribute('src',audio(l,en)['section-1'].src);
});
it.each(['hash','asset','status','words','missing-track','existing-story'])('refuses derived media on %s drift',change=>{
 const l=structuredClone(source('problem-prioritize')),n=audio(l,true);
 if(change==='hash')l.revision.content_hash='changed';
 if(change==='asset')l.revision.assets[0].path='/different.png';
 if(change==='status')l.revision.assets[0].review_status='draft';
 if(change==='words')l.revision.read_sections[0].body_en='Changed teaching';
 if(change==='missing-track')delete n.criteria;
 if(change==='existing-story')l.revision.featured_asset_id='new-reviewed-story';
 expect(prioritizationNarratedLesson(l,n,true)).toBeNull();
});
