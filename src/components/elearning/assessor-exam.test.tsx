import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {AssessorExam} from './assessor-exam';

const state=vi.hoisted(()=>({submissions:0,opened:0,refreshes:0}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{state.refreshes++;}})}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc:async(name:string)=>{
  if(name==='rpc_assessor_exam_open'){
    state.opened++;
    return {data:{attempt_id:`attempt-${state.opened}`,phase:'posttest',passing_percent:80,pretest_late:false,
      questions:[{id:'q1',prompt_en:'Question',prompt_fil:'Tanong',options:[{en:'Correct',fil:'Tama'},{en:'Wrong',fil:'Mali'}]}]},error:null};
  }
  state.submissions++;
  return {data:{score_percent:state.submissions===1?79:80,passed:state.submissions>1,phase:'posttest',pretest_late:false},error:null};
}})}));
afterEach(()=>{cleanup();state.submissions=0;state.opened=0;state.refreshes=0;});

it('shows a failed result, permits retry, and stops after a passing attempt',async()=>{
  render(<AssessorExam chapterId="chapter" phase="posttest" locale="en" chapterHref="/chapter"/>);
  fireEvent.click(screen.getByRole('button',{name:'Start exam'}));
  await screen.findByRole('radio',{name:'Correct'});
  fireEvent.click(screen.getByRole('radio',{name:'Correct'}));
  fireEvent.click(screen.getByRole('button',{name:'Submit answers'}));
  await screen.findByText('Score: 79%');
  expect(screen.getByRole('button',{name:'Retry exam'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Retry exam'}));
  await screen.findByRole('radio',{name:'Correct'});
  fireEvent.click(screen.getByRole('radio',{name:'Correct'}));
  fireEvent.click(screen.getByRole('button',{name:'Submit answers'}));
  await screen.findByText('Score: 80%');
  expect(screen.getByRole('link',{name:'Start orientation'})).toHaveAttribute('href','/chapter/orientation');
  expect(screen.queryByRole('button',{name:'Retry exam'})).toBeNull();
  expect(state.refreshes).toBe(2);
});

it('requires every answer and renders the diagnostic in Filipino',async()=>{
  render(<AssessorExam chapterId="chapter" phase="pretest" locale="fil" chapterHref="/chapter"/>);
  expect(screen.getByText('Walang pasadong marka. Kumuha nito bago simulan ang mga aralin.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Simulan ang pagsusulit'}));
  await screen.findByRole('radio',{name:'Tama'});
  fireEvent.click(screen.getByRole('button',{name:'Isumite ang mga sagot'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Sagutin ang bawat tanong.'));
  expect(state.submissions).toBe(0);
});
