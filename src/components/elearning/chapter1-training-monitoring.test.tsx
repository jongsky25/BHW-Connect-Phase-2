import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {LearnerTrainingMonitoring,TrainingPageSummary,type TrainingMonitoring} from './chapter1-training-monitoring';
const empty={state:'not_started' as const,score:null,form_id:null,release_id:null,source:null,submitted_at:null,submitted_count:0};
const data:TrainingMonitoring={lessons_done:2,lessons_total:42,practice_completed:1,
  tests:{pretest:empty,posttest:{...empty,state:'submitted',score:0,form_id:'post-v1',release_id:'r1',source:'snapshot',submitted_count:2}},
  topics_available:true,topics:[{lesson_key:'safe',title_en:'Safety',title_fil:'Kaligtasan',missed:2,total:3}]};
afterEach(cleanup);
it('reconciles page-only denominators and distinguishes absent data from not started',()=>{
  render(<TrainingPageSummary locale="en" rows={[{training:data},{training:{...data,tests:{pretest:empty,posttest:empty}}},
    {training:{...data,tests:{pretest:empty,posttest:{...empty,state:'incomplete'}}}},{}]}/>);
  expect(screen.getByText(/3\/4 displayed BHWs/)).toBeInTheDocument();
  expect(screen.getByText('Not started: 1 · Incomplete: 1 · Submitted: 1')).toBeInTheDocument();
  expect(screen.getByText(/not the whole catchment/)).toBeInTheDocument();
});
it('shows zero as a submitted score and keeps first retained results and practice distinct',()=>{
  render(<LearnerTrainingMonitoring data={data} locale="en"/>);
  expect(screen.getByText(/Submitted · 0%/)).toBeInTheDocument();
  expect(screen.getByText('Retained submissions: 2')).toBeInTheDocument();
  expect(screen.getByText(/Completed practice checkpoints/)).toHaveTextContent(': 1');
  expect(screen.getByText('Safety').parentElement).toHaveTextContent('2/3');
  expect(screen.getByText(/do not add topic counts together/)).toBeInTheDocument();
});
it('labels unavailable historical mappings without fabricating follow-up topics',()=>{
  render(<LearnerTrainingMonitoring locale="en" data={{...data,topics_available:false,topics:[],tests:{pretest:empty,posttest:{...data.tests.posttest,source:'legacy'}}}}/>);
  expect(screen.getByText('Original topic mapping is unavailable for this result.')).toBeInTheDocument();
  expect(screen.queryByText('Safety')).toBeNull();
});
it('localizes the follow-up count and shows draft scores as unavailable',()=>{
  render(<LearnerTrainingMonitoring locale="fil" data={{...data,tests:{...data.tests,pretest:{...empty,state:'incomplete'}}}}/>);
  expect(screen.getByText('Hindi pa tapos — wala pang naisumiteng iskor')).toBeInTheDocument();
  expect(screen.getByText('Mga paksang dapat balikan (1)')).toBeInTheDocument();
  expect(screen.getByText('Kaligtasan').parentElement).toHaveTextContent('2/3');
});
