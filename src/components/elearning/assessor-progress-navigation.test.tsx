import {render,screen,within} from '@testing-library/react';
import {expect,it} from 'vitest';
import {AssessorProgressGuide,AssessorStudyProgressLink} from './assessor-progress-navigation';
import type {OverallProgress} from '@/lib/assessor/overall-certifications';
const progress=(nextStep:string|null):OverallProgress=>({ruleAvailable:true,qualifiedCount:0,requiredCount:3,nextStep,chapters:[],awards:[]});
const chapters=[{key:'chapter-1',title:'Chapter One'},{key:'chapter-2',title:'Chapter Two'},{key:'chapter-3',title:'Chapter Three'}];
function view(step:string|null,locale='en',extra={}) {return render(<AssessorProgressGuide programId="manual" locale={locale} progress={progress(step)} chapters={chapters} readFailed={false} {...extra}/>);}
it.each(['en','fil'])('links a lesson to its own chapter progress, with a distinct study label (%s)',locale=>{
 render(<AssessorStudyProgressLink chapterHref="/training/manual/assessor/chapter-2" locale={locale}/>);
 expect(screen.getByRole('link')).toHaveAttribute('href','/training/manual/assessor/chapter-2#assessor-study-progress');
 expect(screen.getByRole('link')).toHaveTextContent(locale==='en'?'Study progress and lesson list':'Progreso sa pag-aaral at listahan ng mga aralin');
});
it.each(['en','fil'])('explains personal study versus certification and gives a supported next destination (%s)',locale=>{
 view('complete_chapter-2',locale);
 expect(screen.getByText(locale==='en'?'Study progress shows your completed lessons and remaining preparation steps. Certification records show recorded achievement. Completing lessons alone does not authorize formal assessment.':'Ipinapakita ng progreso sa pag-aaral ang natapos mong mga aralin at mga kailangan pang hakbang sa paghahanda. Ipinapakita naman ng sertipikasyon ang naitalang pagkamit. Ang pagtatapos ng mga aralin lamang ay hindi pahintulot sa pormal na pagtatasa.')).toBeVisible();
 expect(screen.getByRole('link',{name:locale==='en'?'Open Chapter 2 study progress':'Buksan ang progreso sa pag-aaral sa Kabanata 2'})).toHaveAttribute('href','/training/manual/assessor/chapter-2#assessor-study-progress');
 const nav=screen.getByRole('navigation',{name:locale==='en'?'Study progress by chapter':'Progreso sa pag-aaral ayon sa kabanata'});
 expect(within(nav).getAllByRole('link')).toHaveLength(2);
 expect(within(nav).queryByRole('link',{name:'Chapter Three'})).toBeNull();
});
it.each(['review_chapter-1','complete_chapter-3'])('routes %s to the existing record rather than inventing a study path',step=>{
 view(step);expect(screen.getByRole('link',{name:/record below/})).toHaveAttribute('href','#chapter-'+step.at(-1));
 expect(screen.queryByRole('link',{name:/Open Chapter 3/})).toBeNull();
});
it.each(['await_rule','await_chapter-3','unknown_server_step',null])('keeps waiting/unknown/complete states informational: %s',step=>{
 view(step);expect(screen.queryByRole('link',{name:/Open Chapter \d study progress|record below/})).toBeNull();
 expect(screen.queryByRole('button')).toBeNull();
});
it('does not send users into an unpublished chapter based only on an overall step',()=>{
 view('complete_chapter-2','en',{chapters:chapters.slice(0,1)});
 expect(screen.getByRole('link',{name:/Review Chapter 2 record/})).toHaveAttribute('href','#chapter-2');
 expect(screen.queryByRole('link',{name:'Chapter Two'})).toBeNull();
});
it.each(['en','fil'])('shows read recovery without inventing a next step or missing evidence (%s)',locale=>{
 view('complete_chapter-2',locale,{readFailed:true});
 expect(screen.getByRole('link',{name:locale==='en'?'Reload status':'Basahin muli ang katayuan'})).toHaveAttribute('href','/training/manual/assessor/qualifications');
 expect(screen.queryByRole('navigation')).toBeNull();expect(screen.queryByText(/Complete Chapter 2 certification/)).toBeNull();
});
it('keeps an empty overall response distinct from incomplete evidence while retaining known study links',()=>{
 view(null,'en',{progress:null});expect(screen.getByRole('link',{name:'Reload status'})).toBeVisible();
 expect(screen.queryByText(/All three compatible chapter awards/)).toBeNull();
 expect(screen.getByRole('navigation',{name:'Study progress by chapter'})).toBeVisible();
});
