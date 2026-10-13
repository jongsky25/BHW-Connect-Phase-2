import {readFileSync} from 'node:fs';
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it} from 'vitest';
import {Chapter1LessonFlow} from './chapter1-lesson-flow';
import lesson from '../../../content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/lesson.json';
import competency from '../../../content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/competency.json';

const guide=(lang:'en'|'fil')=>readFileSync(`content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/facilitator.${lang}.md`,'utf8');
const props={baseHref:'/training/manual/chapter-1/module/lesson',returnHref:'/training/manual/assessor/workspace?q=Maria&learner=123',
  indicators:competency.observation_indicators,activities:[]};
afterEach(cleanup);

describe('1.6.2 lesson flow',()=>{
  it.each(['en','fil'] as const)('uses the published objective and criterion in Prepare and Run (%s)',lang=>{
    const notesMarkdown=guide(lang);
    const objectives=lang==='en'?lesson.manifest.objectives_en:lesson.manifest.objectives_fil;
    const criterion=lang==='en'?competency.observation_indicators[0].observable_en:competency.observation_indicators[0].observable_fil;
    const {rerender}=render(<Chapter1LessonFlow {...props} lang={lang} view="prepare" notesMarkdown={notesMarkdown} objectives={objectives}/>);
    expect(screen.getAllByText(objectives[0]).length).toBeGreaterThan(0);
    expect(screen.getAllByText(criterion).length).toBeGreaterThan(0);
    expect(screen.getByRole('link',{name:lang==='en'?'Run':'Patakbuhin'}).getAttribute('href')).toContain('returnTo=');
    expect(screen.getByRole('link',{name:lang==='en'?'Show BHW presentation':'Ipakita sa BHW'}).getAttribute('href')).toContain('view=lesson');
    expect(screen.getByRole('link',{name:lang==='en'?'Back to working area':'Bumalik sa working area'})).toHaveAttribute('href',props.returnHref);
    rerender(<Chapter1LessonFlow {...props} lang={lang} view="run" notesMarkdown={notesMarkdown} objectives={objectives}/>);
    expect(screen.getAllByText(criterion).length).toBeGreaterThan(0);
    expect(screen.getAllByText(objectives[0]).length).toBeGreaterThan(0);
    expect(screen.getByText(lang==='en'?'Complete published guide and references':'Buong inilathalang gabay at mga sanggunian')).toBeInTheDocument();
  });
  it('shows missing published content honestly without media',()=>{
    render(<Chapter1LessonFlow {...props} lang="en" view="run" notesMarkdown={null} objectives={[]} indicators={[]}/>);
    expect(screen.getByText('No published criterion. Do not rate performance.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
  it.each(['en','fil'] as const)('offers a keyboard accessible plan handoff in %s',lang=>{
    render(<Chapter1LessonFlow {...props} lang={lang} view="run" notesMarkdown={guide(lang)} objectives={[]}
      lessonId="33333333-3333-4333-8333-333333333333" moduleId="22222222-2222-4222-8222-222222222222" planningEnabled
      sessions={[{id:'44444444-4444-4444-8444-444444444444',status:'draft',scheduled_at:null}]}/>);
    expect(screen.getByRole('combobox',{name:'Session'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:lang==='en'?'Create or open draft':'Gumawa o buksan ang draft'})).toBeInTheDocument();
    expect(screen.getByText(lang==='en'?/no attendance, delivery, or grade is recorded/i:/walang attendance, delivery, o marka/i)).toBeInTheDocument();
  });
});
