import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {AssessorBriefingAcknowledgement} from './assessor-briefing-acknowledgement';
import {AssessorNavigationTour} from './assessor-navigation-tour';
import {CHAPTER1_BRIEFING_VERSION, CHAPTER1_REQUIREMENTS_VERSION, type BriefingState} from '@/lib/assessor/briefing';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({createClient: () => ({rpc})}));
const state: BriefingState = {actorId:'alex',programInstanceId:'manual',chapterKey:'chapter-1',
  requirementsVersion:CHAPTER1_REQUIREMENTS_VERSION,briefingVersion:CHAPTER1_BRIEFING_VERSION,acknowledgedAt:null};
const saved = {...state, acknowledgedAt:'2026-10-11T00:00:00Z'};
const props = {locale:'en',programId:'manual',actorId:'alex',chapterHref:'/training/manual/assessor/chapter-1',initial:state};
beforeEach(() => {rpc.mockReset().mockResolvedValue({data:saved,error:null});});
afterEach(cleanup);
describe('explicit briefing acknowledgement and recovery', () => {
  it.each(['en','fil'])('requires explicit confirmation and enables study only after a valid saved receipt (%s)', async locale => {
    const user = userEvent.setup();render(<AssessorBriefingAcknowledgement {...props} locale={locale}/>);
    const name = locale==='en'?'Save my acknowledgement':'Itala ang aking pagkilala';
    expect(screen.getByRole('button',{name})).toBeDisabled();expect(rpc).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox'));await user.click(screen.getByRole('button',{name}));
    expect(rpc).toHaveBeenCalledExactlyOnceWith('rpc_assessor_briefing_acknowledge',{
      p_program_id:'manual',p_expected_actor_id:'alex',p_requirements_version:CHAPTER1_REQUIREMENTS_VERSION,
      p_briefing_version:CHAPTER1_BRIEFING_VERSION,p_acknowledged:true,p_language:locale,
    });
    expect(screen.getByRole('link')).toHaveAttribute('href',props.chapterHref);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
  it('restores a returning assessor without a write and replay does not remove acknowledgement', async () => {
    const user = userEvent.setup();render(<><AssessorNavigationTour locale="en"/><AssessorBriefingAcknowledgement {...props} initial={saved}/></>);
    const ack = screen.getByRole('region',{name:'Acknowledge the opening briefing'});
    expect(within(ack).getByRole('status')).toHaveTextContent('You do not need to repeat it');
    await user.click(screen.getByRole('button',{name:'Replay walkthrough'}));
    expect(within(ack).getByRole('link')).toBeInTheDocument();expect(rpc).not.toHaveBeenCalled();
  });
  it('recovers an unknown read status before offering a save', async () => {
    const user = userEvent.setup();rpc.mockResolvedValue({data:state,error:null});
    render(<AssessorBriefingAcknowledgement {...props} initial={null}/>);
    expect(screen.queryByRole('checkbox')).toBeNull();expect(screen.queryByRole('link')).toBeNull();
    await user.click(screen.getByRole('button',{name:'Check status again'}));
    expect(rpc).toHaveBeenCalledExactlyOnceWith('rpc_assessor_briefing_state',{p_program_id:'manual'});
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('resolves an ambiguous save by reading its receipt without a second write', async () => {
    const user = userEvent.setup();rpc.mockRejectedValueOnce(new Error('connection lost')).mockResolvedValueOnce({data:saved,error:null});
    render(<AssessorBriefingAcknowledgement {...props}/>);
    await user.click(screen.getByRole('checkbox'));await user.click(screen.getByRole('button',{name:'Save my acknowledgement'}));
    expect(screen.getByRole('alert')).toHaveTextContent('It may already be recorded');expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('checkbox')).toBeChecked();
    await user.click(screen.getByRole('button',{name:'Check status again'}));
    expect(screen.getByRole('link')).toBeInTheDocument();expect(screen.queryByRole('alert')).toBeNull();
    expect(rpc.mock.calls.map(call=>call[0])).toEqual(['rpc_assessor_briefing_acknowledge','rpc_assessor_briefing_state']);
  });
  it.each([null,{...saved,actorId:'other'},{...saved,briefingVersion:'old'},{...saved,programInstanceId:'foreign'},{...state}, {...saved,acknowledgedAt:'invalid'}])
    ('rejects unconfirmed or foreign save results %#',async data=>{
      const user=userEvent.setup();rpc.mockResolvedValue({data,error:null});render(<AssessorBriefingAcknowledgement {...props}/>);
      await user.click(screen.getByRole('checkbox'));await user.click(screen.getByRole('button',{name:'Save my acknowledgement'}));
      expect(screen.getByRole('alert')).toBeInTheDocument();expect(screen.queryByRole('link')).toBeNull();
    });
  it('prevents duplicate submissions while saving', async () => {
    const user=userEvent.setup();let complete!:(value:unknown)=>void;
    rpc.mockReturnValue(new Promise(resolve=>{complete=resolve;}));render(<AssessorBriefingAcknowledgement {...props}/>);
    await user.click(screen.getByRole('checkbox'));await user.dblClick(screen.getByRole('button',{name:'Save my acknowledgement'}));
    expect(rpc).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Saving…'})).toBeDisabled();
    complete({data:saved,error:null});expect(await screen.findByRole('link')).toBeInTheDocument();
  });
});
