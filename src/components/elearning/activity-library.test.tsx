import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ActivityLibrary } from './activity-library';
import { activityPlan, type FacilitatorActivity, type ActivityRun } from '@/lib/elearning/activities';
import cards from '../../../content/training/day1-basic-competencies/modules/05-bhw-at-barangay/activities.json';
const activities=cards as FacilitatorActivity[];
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc})}));
beforeEach(()=>{rpc.mockReset();HTMLDialogElement.prototype.showModal=vi.fn(function(this:HTMLDialogElement){this.open=true;});HTMLDialogElement.prototype.close=vi.fn(function(this:HTMLDialogElement){this.open=false;});});
afterEach(cleanup);
it('selects alternative games with timing and materials, without competency evidence',()=>{
  render(<ActivityLibrary activities={activities.slice(0,2)} lang="en"/>);
  screen.getAllByRole('button',{name:'Select activity'}).forEach(b=>fireEvent.click(b));
  expect(screen.getByText(/normally choose one/)).toBeInTheDocument();
  expect(screen.getByText(/for this view only/)).toBeInTheDocument();
  expect(activityPlan(activities,activities.slice(0,2).map(a=>a.id),'en').minutes).toBe(activities[0].minutes+activities[1].minutes);
  expect(rpc).not.toHaveBeenCalled();
});
it('opens a Filipino runner with a printable worksheet',()=>{
  render(<ActivityLibrary activities={[activities[0]]} lang="fil"/>);
  fireEvent.click(screen.getByRole('button',{name:'Buksan ang gawain'}));
  expect(screen.getByText('Patakbuhin ang gawain')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'I-print ang gabay at worksheet'})).toBeInTheDocument();
  expect(screen.getByText(/kathang detalye lamang/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Isara ang gawain'}));
  expect(screen.queryByText('Patakbuhin ang gawain')).not.toBeInTheDocument();
});
it('persists a session selection; retains entries after a failed update',async()=>{
  rpc.mockResolvedValueOnce({data:'r',error:null}).mockResolvedValueOnce({error:{message:'closed'}});
  render(<ActivityLibrary activities={[activities[0]]} lang="en" sessionId="s" moduleId="m"/>);
  fireEvent.click(screen.getByRole('button',{name:'Add to session plan'}));
  await screen.findByText('Activity record saved.');
  expect(rpc).toHaveBeenCalledWith('rpc_course_session_activity_record',expect.objectContaining({p_status:'planned',p_activity_id:activities[0].id,p_activity_version:1}));
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Use pairs next time'}});
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'adapted'}});
  fireEvent.click(screen.getByRole('button',{name:'Save activity record'}));
  await screen.findByRole('alert');
  expect(screen.getByRole('textbox')).toHaveValue('Use pairs next time');
  expect(screen.getByRole('combobox')).toHaveValue('adapted');
  await waitFor(()=>expect(screen.getByRole('button',{name:'Save activity record'})).toBeEnabled());
});
it('reloads the stored record and prevents editing a closed session',()=>{
  const run:ActivityRun={id:'r',session_id:'s',module_id:'m',activity_id:activities[0].id,activity_snapshot:activities[0],status:'run',duration_minutes:12,note:'Done',recorded_at:'2026-09-25'};
  render(<ActivityLibrary activities={[activities[0]]} lang="en" sessionId="s" moduleId="m" sessionOpen={false} initialRuns={[run]}/>);
  expect(screen.getByRole('textbox')).toHaveValue('Done');
  expect(screen.getByRole('button',{name:'Save activity record'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Skip activity'})).toBeDisabled();
});
