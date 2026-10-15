import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import type {FormalState} from '@/lib/assessor/formal-attempt';
import {FormalAttemptEditor} from './formal-attempt-editor';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));

const criterion={
  id:'chapter-1:08-osh:lesson:safety-demonstrate:criterion-1',version:'1',
  fil:'Ligtas na demonstrasyon',en:'Safe demonstration',
  rubric:{observable:{fil:'Ipakita ang ligtas na gawain',en:'Demonstrate safe practice'},levels:{
    kaya_na:{fil:'Kaya na',en:'Can do'},
    kailangan_practice:{fil:'Kailangan pa',en:'Needs practice'},
    hindi_pa:{fil:'Hindi pa',en:'Not yet'},
  }},
};
const state:FormalState={requestId:'request',programId:'program',moduleId:'module',
  learnerName:'Apple',moduleTitleFil:'Kaligtasan',moduleTitleEn:'Safety',
  purposeFil:'Pagtatasa',purposeEn:'Assessment',canStart:true,
  attempt:{id:'attempt',status:'draft',revision:0,criteria:[criterion],evidence:[],
    outcome:null,startedAt:'2026-10-15T00:00:00Z',submittedAt:null},
};

afterEach(cleanup);

describe('Chapter 1.8 formal assessment guidance',()=>{
  it('asks for local contact verification and explains the pause rule',()=>{
    render(<FormalAttemptEditor state={state} lang="en"/>);
    expect(screen.getByText(/Use the blank local setup card for this LGU and session/)).toHaveTextContent(
      'primary reporting contact, backup and immediate qualified evaluation route');
    expect(screen.getByText(/Use the blank local setup card/)).toHaveTextContent(
      'choose Not observed');
  });

  it('does not show the safety instructions for another criterion',()=>{
    render(<FormalAttemptEditor state={{...state,attempt:{...state.attempt!,criteria:[{...criterion,id:'other'}]}}} lang="en"/>);
    expect(screen.queryByText(/Use the blank local setup card/)).toBeNull();
  });

  it('shows the local verification instruction in Filipino',()=>{
    render(<FormalAttemptEditor state={state} lang="fil"/>);
    expect(screen.getByText(/Gamitin ang blangkong lokal na setup card/)).toHaveTextContent(
      'Kung may hindi pa kumpirmado, ihinto ang demonstration');
  });
});
