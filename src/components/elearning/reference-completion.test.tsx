import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(()=>{cleanup();vi.restoreAllMocks();document.documentElement.removeAttribute('data-motion');});
const check={prompt_en:'What would you do?',prompt_fil:'Ano ang gagawin mo?',options:[{en:'Ask',fil:'Magtanong'},{en:'Guess',fil:'Hulaan'}],correct_option_index:0,feedback_en:'Ask the team.',feedback_fil:'Magtanong sa team.'};
const part=(id:string,hasCheck=false)=>({id,concept_ids:[id],asset_ids:[],heading_en:id,heading_fil:id,body_en:'Teaching text',body_fil:'Aralin',takeaway_en:'Takeaway '+id,takeaway_fil:'Buod '+id,check:hasCheck?check:null});
function data():ReferenceData{return {title_fil:'Manual',title_en:'Manual',chapters:[],completed:[],resumes:[],lessons:[{id:'lesson',module_id:'module',required:true,title_fil:'Aralin',title_en:'Lesson',objectives_fil:[],objectives_en:[],revision:{id:'revision',read_sections:[part('first',true),part('last',true)],slides:[{...part('slide-first'),display_en:'First teaching slide',display_fil:'Una',layout:'scene'},{...part('slide-check',true),display_en:'Revealing slide summary',display_fil:'Buod sa slide',layout:'takeaway'}],assets:[],sources:[]}}]} as unknown as ReferenceData;}
const button=()=>screen.getByRole('button',{name:'Mark lesson complete'});
function view(d=data(),complete=vi.fn().mockResolvedValue(undefined),extra={}) {return render(<ReferenceLessons {...d} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" nextLessonHref="/lessons/next" onResume={vi.fn().mockResolvedValue(undefined)} onComplete={complete} {...extra}/>);}
describe('formative lesson completion',()=>{
  it('offers full Slide speech only for exact Read wording and pauses when it is closed',()=>{
    const pause=vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
    const d=data();const read=part('first');
    d.lessons[0].revision.read_sections=[read];
    d.lessons[0].revision.slides=[{...part('slide-first'),display_en:'Concise text',display_fil:'Maikli',narration_en:read.body_en,narration_fil:read.body_fil,heading_en:read.heading_en,heading_fil:read.heading_fil,layout:'scene'}];
    const narration={lesson:{first:{src:'/audio.mp3',duration_seconds:3,timings:[{zone:'heading',index:0,text:'first',start_ms:0,end_ms:1000},{zone:'body',index:0,text:read.body_en,start_ms:1000,end_ms:2000},{zone:'takeaway',index:0,text:read.takeaway_en,start_ms:2000,end_ms:3000}]}}};
    const {container}=view(d,vi.fn(),{narration,initialMode:'slides'});
    const panel=screen.getByText('Full narration and audio').closest('details')!;
    expect(container.querySelector('audio')).toHaveAttribute('src','/audio.mp3');
    panel.open=false;fireEvent(panel,new Event('toggle'));
    expect(pause).toHaveBeenCalled();
    cleanup();d.lessons[0].revision.slides[0].narration_en='Changed wording';
    view(d,vi.fn(),{narration,initialMode:'slides'});
    expect(screen.queryByText('Full narration and audio')).not.toBeInTheDocument();
  });

  it('shows a repeated Read check question once and keeps the full question in Slides',()=>{
    const d=data();
    d.lessons[0].revision.read_sections=[{...part('check',true),body_en:check.prompt_en,body_fil:check.prompt_fil}];
    view(d,vi.fn(),{locale:'fil'});
    expect(screen.getAllByText(check.prompt_fil)).toHaveLength(1);
    expect(screen.getByText('Pumili ng sagot')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));
    fireEvent.click(screen.getByRole('button',{name:'Susunod'}));
    expect(screen.getByText(check.prompt_fil)).toBeInTheDocument();
    expect(screen.queryByText('Pumili ng sagot')).not.toBeInTheDocument();
  });
  it('shows prominent, explicit feedback after a choice in Read and Slides',()=>{
    view();
    fireEvent.click(screen.getByRole('button',{name:'Guess'}));
    let status=screen.getByRole('status');
    expect(status).toHaveAttribute('data-result','incorrect');
    expect(status).toHaveTextContent('Not quite. Try again.');
    expect(status).toHaveTextContent('Ask the team.');
    fireEvent.click(screen.getByRole('button',{name:'Ask'}));
    status=screen.getByRole('status');
    expect(status).toHaveAttribute('data-result','correct');
    expect(status).toHaveTextContent('Correct!');
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));
    fireEvent.click(screen.getByRole('button',{name:'Next'}));
    fireEvent.click(screen.getByRole('button',{name:'Guess'}));
    expect(screen.getByRole('status')).toHaveAttribute('data-result','incorrect');
  });
  it('requires the end and every check, keeps an attempted wrong answer, and saves before offering continuation',async()=>{
    const complete=vi.fn().mockResolvedValue(undefined);view(data(),complete);
    expect(button()).toBeDisabled();expect(screen.queryByText('Takeaway first')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Next'}));fireEvent.click(screen.getByRole('button',{name:'Ask'}));
    expect(button()).toBeDisabled(); // the earlier check was skipped
    fireEvent.click(screen.getByRole('button',{name:'Previous'}));fireEvent.click(screen.getByRole('button',{name:'Guess'}));
    expect(screen.getByText('Takeaway first')).toBeInTheDocument();expect(button()).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Next'}));expect(screen.getByRole('button',{name:'Ask'})).toHaveAttribute('aria-pressed','true');
    expect(button()).toBeEnabled();expect(screen.queryByRole('link',{name:/Next lesson/})).not.toBeInTheDocument();
    fireEvent.click(button());await screen.findByRole('button',{name:'Completed'});
    expect(complete).toHaveBeenCalledTimes(1);expect(screen.getByRole('link',{name:/Next lesson/})).toHaveAttribute('href','/lessons/next');
    expect(screen.getByText('Well done! Lesson complete. Your progress is saved.').closest('.lesson-completion')).toHaveAttribute('data-celebrating','true');
  });
  it('uses Slides independently and hides its summary until an answer',()=>{
    view();fireEvent.click(screen.getByRole('button',{name:'Slides'}));expect(button()).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Next'}));expect(screen.queryByText('Revealing slide summary')).not.toBeInTheDocument();
    expect(button()).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Guess'}));
    expect(screen.getByText('Revealing slide summary')).toBeInTheDocument();expect(button()).toBeEnabled();
    fireEvent.click(screen.getByRole('button',{name:'Read'}));expect(button()).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));expect(button()).toBeEnabled();
  });
  it('does not borrow attempts from another lesson revision',()=>{
    const d=data();const {rerender}=view(d);fireEvent.click(screen.getByRole('button',{name:'Ask'}));
    const newer=data();newer.lessons[0].revision.id='new-revision';
    rerender(<ReferenceLessons {...newer} modules={[]} locale="en" initialLessonId="lesson" onResume={vi.fn()} onComplete={vi.fn()}/>);
    expect(screen.queryByText('Takeaway first')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Ask'})).toHaveAttribute('aria-pressed','false');
  });
  it('restores position but requires a fresh check attempt after reload',()=>{
    const d=data();d.resumes=[{lesson_id:'lesson',revision_id:'revision',course_progress_id:'p',modality:'slides',language:'en',position_key:'slide-check',concept_id:'slide-check',updated_at:'2026-09-25'}];
    view(d);expect(screen.getByRole('heading',{name:'slide-check'})).toBeInTheDocument();expect(button()).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Ask'}));expect(button()).toBeEnabled();
  });
  it('preserves historical completion and returns to the list after the last lesson',()=>{
    const d=data();d.completed=[{lesson_id:'lesson',revision_id:'old',course_progress_id:'p',completed_at:'2026-09-24',completion_basis:'legacy_equivalence',legacy_module_id:'module',migration_batch:'batch'}];
    view(d,vi.fn(),{nextLessonHref:undefined,completionMilestone:{scope:'subchapter',number:'1.1'}});expect(screen.getByRole('button',{name:'Completed'})).toBeDisabled();
    expect(screen.getByRole('link',{name:/Return to the lesson list/})).toHaveAttribute('href','/lessons');
    expect(screen.getByText('Well done! Lesson complete. Your progress is saved.').closest('.lesson-completion')).not.toHaveAttribute('data-celebrating');
    expect(screen.queryByText('Subchapter 1.1 lessons complete!')).not.toBeInTheDocument();
  });
  it.each([
    ['subchapter','1.1','Subchapter 1.1 lessons complete!'],
    ['chapter','1','Chapter 1 lessons complete!'],
  ] as const)('recognizes a newly finished %s after the save succeeds',async(scope,number,message)=>{
    view(data(),vi.fn().mockResolvedValue(undefined),{completionMilestone:{scope,number}});
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));fireEvent.click(screen.getByRole('button',{name:'Next'}));fireEvent.click(screen.getByRole('button',{name:'Ask'}));fireEvent.click(button());
    await screen.findByRole('button',{name:'Completed'});
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByText(message).closest('.lesson-completion')).toHaveAttribute('data-celebrating','true');
  });
  it('keeps the saved milestone visible when refreshed server props no longer predict it',async()=>{
    const {rerender}=view(data(),vi.fn().mockResolvedValue(undefined),{completionMilestone:{scope:'chapter',number:'1'}});
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));fireEvent.click(screen.getByRole('button',{name:'Next'}));fireEvent.click(screen.getByRole('button',{name:'Ask'}));fireEvent.click(button());
    await screen.findByRole('button',{name:'Completed'});
    rerender(<ReferenceLessons {...data()} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" onResume={vi.fn()} onComplete={vi.fn()}/>);
    expect(screen.getByText('Chapter 1 lessons complete!')).toBeInTheDocument();
  });
  it('describes finished chapter lessons in Filipino without implying certification',async()=>{
    view(data(),vi.fn().mockResolvedValue(undefined),{locale:'fil',completionMilestone:{scope:'chapter',number:'1'}});
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));fireEvent.click(screen.getByRole('button',{name:'Susunod'}));fireEvent.click(screen.getByRole('button',{name:'Magtanong'}));fireEvent.click(screen.getByRole('button',{name:'Markahang tapos ang aralin'}));
    await screen.findByRole('button',{name:'Natapos'});
    expect(screen.getByText('Tapos na ang mga aralin sa Kabanata 1!')).toBeInTheDocument();
  });
  it('reports failed completion and allows retry without losing attempts',async()=>{
    const complete=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(undefined);view(data(),complete,{completionMilestone:{scope:'subchapter',number:'1.1'}});
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));fireEvent.click(screen.getByRole('button',{name:'Next'}));fireEvent.click(screen.getByRole('button',{name:'Ask'}));fireEvent.click(button());
    await screen.findByRole('alert');expect(screen.queryByRole('link',{name:/Next lesson/})).not.toBeInTheDocument();expect(button()).toBeEnabled();
    expect(screen.queryByText('Well done! Lesson complete. Your progress is saved.')).not.toBeInTheDocument();
    expect(screen.queryByText('Subchapter 1.1 lessons complete!')).not.toBeInTheDocument();
    fireEvent.click(button());await waitFor(()=>expect(screen.getByRole('button',{name:'Completed'})).toBeDisabled());expect(complete).toHaveBeenCalledTimes(2);
  });
  it('uses a static saved state when the learner requests reduced motion',async()=>{
    document.documentElement.setAttribute('data-motion','reduce');
    view(data(),vi.fn().mockResolvedValue(undefined),{completionMilestone:{scope:'subchapter',number:'1.1'}});fireEvent.click(screen.getByRole('button',{name:'Slides'}));fireEvent.click(screen.getByRole('button',{name:'Next'}));fireEvent.click(screen.getByRole('button',{name:'Ask'}));fireEvent.click(button());
    await screen.findByRole('button',{name:'Completed'});
    expect(screen.getByText('Well done! Lesson complete. Your progress is saved.').closest('.lesson-completion')).not.toHaveAttribute('data-celebrating');
    expect(screen.getByText('Subchapter 1.1 lessons complete!')).toBeInTheDocument();
  });
  it('keeps preview read-only and localizes the completion guidance',()=>{
    view(data(),vi.fn(),{readOnly:true,locale:'fil'});expect(screen.queryByRole('button',{name:'Markahang tapos ang aralin'})).not.toBeInTheDocument();cleanup();
    view(data(),vi.fn(),{locale:'fil'});expect(screen.getByText(/Tapusin ang mga bahagi/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Markahang tapos ang aralin'})).toBeDisabled();
  });
  it('does not expose narration containing the takeaway until an answer',()=>{
    const d=data();d.lessons[0].revision.read_sections=[part('first',true)];
    const narration={lesson:{first:{src:'/audio.mp3',duration_seconds:3,timings:[{zone:'heading',index:0,text:'first',start_ms:0,end_ms:1000},{zone:'body',index:0,text:'Teaching text',start_ms:1000,end_ms:2000},{zone:'takeaway',index:0,text:'Takeaway first',start_ms:2000,end_ms:3000}]}}};
    view(d,vi.fn(),{narration});expect(screen.queryByRole('button',{name:/Listen/})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Ask'}));
    expect(screen.getByRole('button',{name:/Listen/})).toBeInTheDocument();
  });
});

describe('Chapter 1 story handoff',()=>{
  function storyData() {
    const d=data();
    d.lessons[0].revision.read_sections=[part('intro'),part('question-one',true),part('question-two',true),part('end')];
    const asset={id:'story',path:'/poster.png',alt_en:'Story',alt_fil:'Kuwento',caption_en:'Story',caption_fil:'Kuwento',videos:{en:{path:'/story-en.mp4'},fil:{path:'/story-fil.mp4'}}};
    d.lessons[0].revision.assets=[asset as typeof d.lessons[0]['revision']['assets'][number]];
    d.lessons[0].revision.featured_asset_id=asset.id;
    return d;
  }
  function storyView(d=storyData(),complete=vi.fn().mockResolvedValue(undefined),extra={}) {
    return view(d,complete,{storyQuestionHandoff:true,...extra});
  }
  function playStory(container:HTMLElement) {
    fireEvent.click(screen.getByRole('button',{name:'Narrated story'}));
    return container.querySelector('video')!;
  }
  it('opens and focuses the first unanswered question on ended, then guides through checks and saves',async()=>{
    const complete=vi.fn().mockResolvedValue(undefined);
    const {container}=storyView(undefined,complete);
    fireEvent.ended(playStory(container));
    expect(screen.getByRole('heading',{name:'question-one'})).toBeInTheDocument();
    await waitFor(()=>expect(screen.getByRole('group',{name:check.prompt_en})).toHaveFocus());
    expect(complete).not.toHaveBeenCalled();expect(button()).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Guess'}));
    expect(screen.getByText('Not quite. Try again.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Next question'}));
    expect(screen.getByRole('heading',{name:'question-two'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Ask'}));
    fireEvent.click(screen.getByRole('button',{name:'Continue to lesson end'}));
    expect(button()).toBeEnabled();fireEvent.click(button());
    await screen.findByRole('button',{name:'Completed'});
    expect(complete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link',{name:/Next lesson/})).toHaveAttribute('href','/lessons/next');
  });
  it('offers a manual handoff before playback ends and preserves previous attempts',()=>{
    const {container}=storyView();playStory(container);
    fireEvent.click(screen.getByRole('button',{name:'Continue to question'}));
    fireEvent.click(screen.getByRole('button',{name:'Ask'}));
    fireEvent.ended(playStory(container));
    expect(screen.getByRole('heading',{name:'question-two'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Previous'}));
    expect(screen.getByRole('button',{name:'Ask'})).toHaveAttribute('aria-pressed','true');
  });
  it('keeps Slides selected and does not borrow Read answers',()=>{
    const {container}=storyView();fireEvent.ended(playStory(container));
    fireEvent.click(screen.getByRole('button',{name:'Ask'}));
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));
    fireEvent.ended(playStory(container));
    expect(screen.getByRole('heading',{name:'slide-check'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Slides'})).toHaveAttribute('aria-pressed','true');
    expect(button()).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Ask'}));expect(button()).toBeEnabled();
  });
  it('moves to the final section if all checks have already been attempted',()=>{
    const {container}=storyView();fireEvent.ended(playStory(container));
    fireEvent.click(screen.getByRole('button',{name:'Ask'}));fireEvent.click(screen.getByRole('button',{name:'Next question'}));
    fireEvent.click(screen.getByRole('button',{name:'Ask'}));
    fireEvent.ended(playStory(container));
    expect(screen.getByRole('heading',{name:'end'})).toBeInTheDocument();expect(button()).toBeEnabled();
  });
  it('preserves the three-check story unlock rule',()=>{
    const d=storyData();d.lessons[0].lesson_key='resources-monitor';
    d.lessons[0].revision.read_sections=[part('one',true),part('two',true),part('three',true)];
    storyView(d);
    expect(screen.getByRole('button',{name:'Narrated story'})).toBeDisabled();
    for(let i=0;i<3;i++){
      fireEvent.click(screen.getByRole('button',{name:'Ask'}));
      if(i<2)fireEvent.click(screen.getByRole('button',{name:'Next question'}));
    }
    expect(screen.getByRole('button',{name:'Narrated story'})).toBeEnabled();
  });
  it('keeps completion and save retry accessible inside fullscreen',async()=>{
    const original=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'showModal');
    Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','');}});
    try {
    const complete=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(undefined);
    const {container}=storyView(undefined,complete);playStory(container);
    fireEvent.click(screen.getByRole('button',{name:'Full screen'}));
    const dialog=container.querySelector('dialog')!;
    fireEvent.ended(dialog.querySelector('video')!);
    expect(dialog.querySelector('h2')).toHaveTextContent('question-one');
    fireEvent.click(screen.getByRole('button',{name:'Ask'}));fireEvent.click(screen.getByRole('button',{name:'Next question'}));
    fireEvent.click(screen.getByRole('button',{name:'Ask'}));fireEvent.click(screen.getByRole('button',{name:'Continue to lesson end'}));
    expect(dialog.contains(button())).toBe(true);expect(container.querySelectorAll('#lesson-completion-help')).toHaveLength(1);
    fireEvent.click(button());
    expect(dialog.contains(await screen.findByRole('alert'))).toBe(true);
    expect(screen.queryByRole('link',{name:/Next lesson/})).not.toBeInTheDocument();
    fireEvent.click(button());await screen.findByRole('button',{name:'Completed'});
    expect(dialog.contains(screen.getByRole('link',{name:/Next lesson/}))).toBe(true);
    expect(complete).toHaveBeenCalledTimes(2);
    } finally {
      if(original)Object.defineProperty(HTMLDialogElement.prototype,'showModal',original);
      else Reflect.deleteProperty(HTMLDialogElement.prototype,'showModal');
    }
  });
  it('does not redirect replay of an already completed lesson',()=>{
    const d=storyData();d.completed=[{lesson_id:'lesson'} as typeof d.completed[number]];
    const {container}=storyView(d);const video=playStory(container);fireEvent.ended(video);
    expect(container.querySelector('video')).toBe(video);
    fireEvent.click(screen.getByRole('button',{name:'Continue to lesson end'}));
    expect(screen.getByRole('button',{name:'Completed'})).toBeDisabled();
  });
  it('does not enable the handoff outside Chapter 1',()=>{
    const {container}=storyView(undefined,undefined,{storyQuestionHandoff:false});
    const video=playStory(container);fireEvent.ended(video);
    expect(container.querySelector('video')).toBe(video);
    expect(screen.queryByRole('button',{name:'Continue to question'})).not.toBeInTheDocument();
  });
  it('supports Filipino and read-only preview without saving completion',()=>{
    const complete=vi.fn();const {container}=storyView(undefined,complete,{locale:'fil',readOnly:true});
    fireEvent.click(screen.getByRole('button',{name:'Kuwentong may salaysay'}));
    expect(screen.getByRole('button',{name:'Magpatuloy sa tanong'})).toBeInTheDocument();
    fireEvent.ended(container.querySelector('video')!);
    expect(screen.getByRole('heading',{name:'question-one'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Markahang tapos ang aralin'})).not.toBeInTheDocument();expect(complete).not.toHaveBeenCalled();
  });
});
