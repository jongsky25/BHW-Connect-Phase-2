import{cleanup,fireEvent,render,screen,within}from'@testing-library/react';
import{afterEach,expect,it,vi}from'vitest';
import{loadReferenceModule,contentHash}from'../../../scripts/lib/reference-content.mjs';
import narration from'../../../content/training/day1-basic-competencies/narration.json';
import{translationsForLesson}from'@/lib/elearning/lesson-translations';
import{narrationForLesson,type ReferenceNarrationManifest}from'@/lib/elearning/reference-narration';
import{ReferenceLessons,type ReferenceData}from'./reference-lessons';
import{Chapter1Assessment}from'./chapter1-assessment';
import{AssessorExam}from'./assessor-exam';

const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc:mock.rpc})}));
afterEach(()=>{cleanup();vi.restoreAllMocks();mock.rpc.mockReset();});
function lesson(key='bhw-roles-hepo'){
 const mod=key==='problem-define'?'07-problema':'01-tungkulin-ng-bhw';
 const s=loadReferenceModule('content/training/day1-basic-competencies/modules/'+mod,'public').lessons.find(l=>l.manifest.lesson_key===key)!;
 return{...s.manifest,id:'lesson',revision:{...s.revision,id:'revision',content_hash:contentHash(s)}}as ReferenceData['lessons'][number];
}
for(const en of[true,false])for(const mode of['read','slides']as const)for(const fullscreen of[true,false])for(const language of['ceb','hil']as const){
 it(`selects approved ${language} study content and retains the source check (${en},${mode},fullscreen=${fullscreen})`,()=>{
  vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
  const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  try{
   const l=lesson(),options=translationsForLesson(l,false),selected=options.find(t=>t.language===language)!,onComplete=vi.fn();
   const{container}=render(<ReferenceLessons title_en="Manual" title_fil="Manual" chapters={[]} modules={[]} lessons={[l]} completed={[]} resumes={[]} initialLessonId="lesson" initialMode={mode} locale={en?'en':'fil'} translations={options} narration={{lesson:narrationForLesson(narration as ReferenceNarrationManifest,l.lesson_key,en?'en':'fil',l.revision.read_sections)}} onResume={vi.fn()} onComplete={onComplete}/>);
   if(fullscreen)fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
   const scope=fullscreen?within(container.querySelector('dialog')!):screen;
   const panel=fullscreen?container.querySelector('dialog [data-lesson-language-panel]')!:container.querySelector('[data-lesson-language-panel]')!;
   const select=within(panel as HTMLElement).getByRole('combobox');
   expect(within(panel as HTMLElement).getAllByRole('option')).toHaveLength(3);
   fireEvent.change(select,{target:{value:language}});
   expect(select).toHaveValue(language);
   expect(container.querySelector('article')).toHaveAttribute('lang',language);
   if(mode==='read')expect(container.querySelector('audio')).toHaveAttribute('src',selected.narration![selected.read_sections[0].id].src);
   else for(const line of selected.slides[0].display.split('\n').filter(Boolean))expect(scope.getByText(line,{selector:'p'})).toBeInTheDocument();
   for(let i=1;i<selected.read_sections.length;i++)fireEvent.click(scope.getByRole('button',{name:selected.ui.Susunod}));
   const check=selected.read_sections.at(-1)!.check!;
   expect(scope.queryByText(check.feedback)).not.toBeInTheDocument();
   for(const option of check.options)expect(scope.getByRole('button',{name:option})).toBeInTheDocument();
   fireEvent.click(scope.getByRole('button',{name:check.options[1]}));
   expect(scope.getByText(check.feedback)).toBeInTheDocument();expect(onComplete).not.toHaveBeenCalled();
  }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
 });
}
it.each(['missing','stale','draft'])('identifies unavailable translations without exposing %s content',reason=>{
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
 const l=lesson(),options=structuredClone(translationsForLesson(l,false));
 if(reason==='stale')for(const t of options)t.source_text='different lesson text';
 if(reason==='draft')for(const t of options)t.review_status='draft';
 const{container}=render(<ReferenceLessons title_en="Manual" title_fil="Manual" chapters={[]} modules={[]} lessons={[l]} completed={[]} resumes={[]} initialLessonId="lesson" locale="en" translations={reason==='missing'?[]:options} onResume={vi.fn()} onComplete={vi.fn()}/>);
 const panel=container.querySelector('[data-lesson-language-panel]')!;
 expect(within(panel as HTMLElement).queryByRole('combobox')).not.toBeInTheDocument();
 expect(panel).toHaveTextContent('Awaiting reviewed translations');
 expect(panel).toHaveTextContent('English and Filipino');
 expect(container.querySelector('article')).toHaveAttribute('lang','en');
});
it.each(['en','fil'])('shows assessment coverage at shared entry, without altering questions or RPC language (%s)',async locale=>{
 const attempt={attempt_id:'draft',phase:'pretest',state:'draft',revision:0,position:0,language:locale,items:[{item_id:'q',slot:'T1',stem:{en:'Original question',fil:'Orihinal na tanong'},options:[{id:'a',label:{en:'Answer',fil:'Sagot'}}],lesson_keys:[]}],responses:[]};
 mock.rpc.mockResolvedValue({data:attempt,error:null});
 const{container}=render(<Chapter1Assessment courseId="course" chapterHref="/chapter" locale={locale} sessionId={null} completed={false} contentApproved initialState={{attempts:[{attempt_id:'draft',phase:'pretest',state:'draft',score_percent:null,legacy_attempt_id:null}],final_attempts:[]}} orientation={{expectations:{en:'',fil:''},overview:{en:'',fil:''},recap:{en:'',fil:''}}}/>);
 expect(container.querySelector('[data-assessment-language-notice]')).not.toBeNull();expect(mock.rpc).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:locale==='en'?'Resume pretest':'Ipagpatuloy ang pretest'}));
 await screen.findByRole('heading',{name:locale==='en'?'Original question':'Orihinal na tanong'});
 expect(container.querySelector('[data-assessment-language-notice]')).toBeNull();
 expect(mock.rpc).toHaveBeenCalledWith('rpc_learner_assessment_get',{p_attempt_id:'draft'});
});
it.each(['en','fil']as const)('shows legacy assessment coverage before entry and preserves its source questions (%s)',async locale=>{
 mock.rpc.mockResolvedValue({data:{attempt_id:'draft',questions:[{id:'q',prompt_en:'Original question',prompt_fil:'Orihinal na tanong',options:[{en:'Answer',fil:'Sagot'}]}],phase:'pretest',pretest_late:false},error:null});
 const{container}=render(<AssessorExam chapterId="chapter" phase="pretest" locale={locale} chapterHref="/chapter"/>);
 expect(container.querySelector('[data-assessment-language-notice]')).not.toBeNull();expect(mock.rpc).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:locale==='en'?'Start exam':'Simulan ang pagsusulit'}));
 await screen.findByText(locale==='en'?'Original question':'Orihinal na tanong');
 expect(container.querySelector('[data-assessment-language-notice]')).toBeNull();
 expect(mock.rpc).toHaveBeenCalledWith('rpc_assessor_exam_open',{p_chapter_id:'chapter',p_phase:'pretest'});
});
