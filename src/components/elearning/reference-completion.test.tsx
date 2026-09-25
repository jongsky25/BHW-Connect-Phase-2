import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const check={prompt_en:'What would you do?',prompt_fil:'Ano ang gagawin mo?',options:[{en:'Ask',fil:'Magtanong'},{en:'Guess',fil:'Hulaan'}],correct_option_index:0,feedback_en:'Ask the team.',feedback_fil:'Magtanong sa team.'};
const part=(id:string,hasCheck=false)=>({id,concept_ids:[id],asset_ids:[],heading_en:id,heading_fil:id,body_en:'Teaching text',body_fil:'Aralin',takeaway_en:'Takeaway '+id,takeaway_fil:'Buod '+id,check:hasCheck?check:null});
function data():ReferenceData{return {title_fil:'Manual',title_en:'Manual',chapters:[],completed:[],resumes:[],lessons:[{id:'lesson',module_id:'module',required:true,title_fil:'Aralin',title_en:'Lesson',objectives_fil:[],objectives_en:[],revision:{id:'revision',read_sections:[part('first',true),part('last',true)],slides:[{...part('slide-first'),display_en:'First teaching slide',display_fil:'Una',layout:'scene'},{...part('slide-check',true),display_en:'Revealing slide summary',display_fil:'Buod sa slide',layout:'takeaway'}],assets:[],sources:[]}}]} as unknown as ReferenceData;}
const button=()=>screen.getByRole('button',{name:'Mark lesson complete'});
function view(d=data(),complete=vi.fn().mockResolvedValue(undefined),extra={}) {return render(<ReferenceLessons {...d} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" nextLessonHref="/lessons/next" onResume={vi.fn().mockResolvedValue(undefined)} onComplete={complete} {...extra}/>);}
describe('formative lesson completion',()=>{
  it('requires the end and every check, keeps an attempted wrong answer, and saves before offering continuation',async()=>{
    const complete=vi.fn().mockResolvedValue(undefined);view(data(),complete);
    expect(button()).toBeDisabled();expect(screen.queryByText('Takeaway first')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Next'}));fireEvent.click(screen.getByRole('button',{name:'Ask'}));
    expect(button()).toBeDisabled(); // the earlier check was skipped
    fireEvent.click(screen.getByRole('button',{name:'Previous'}));fireEvent.click(screen.getByRole('button',{name:'Guess'}));
    expect(screen.getByText('Takeaway first')).toBeInTheDocument();expect(button()).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Next'}));expect(screen.getByRole('button',{name:'Ask'})).toHaveAttribute('aria-pressed','true');
    expect(button()).toBeEnabled();expect(screen.queryByRole('link',{name:/Continue to the next/})).not.toBeInTheDocument();
    fireEvent.click(button());await screen.findByRole('button',{name:'Completed'});
    expect(complete).toHaveBeenCalledTimes(1);expect(screen.getByRole('link',{name:/Continue to the next/})).toHaveAttribute('href','/lessons/next');
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
    view(d,vi.fn(),{nextLessonHref:undefined});expect(screen.getByRole('button',{name:'Completed'})).toBeDisabled();
    expect(screen.getByRole('link',{name:/Return to the lesson list/})).toHaveAttribute('href','/lessons');
  });
  it('reports failed completion and allows retry without losing attempts',async()=>{
    const complete=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(undefined);view(data(),complete);
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));fireEvent.click(screen.getByRole('button',{name:'Next'}));fireEvent.click(screen.getByRole('button',{name:'Ask'}));fireEvent.click(button());
    await screen.findByRole('alert');expect(screen.queryByRole('link',{name:/Continue to the next/})).not.toBeInTheDocument();expect(button()).toBeEnabled();
    fireEvent.click(button());await waitFor(()=>expect(screen.getByRole('button',{name:'Completed'})).toBeDisabled());expect(complete).toHaveBeenCalledTimes(2);
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
