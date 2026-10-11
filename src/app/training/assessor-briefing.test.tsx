import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import BriefingPage from './[programId]/assessor/[chapterKey]/briefing/page';
const state = vi.hoisted(() => ({role: 'assessor', actual: 'assessor', active: true, preview: false,
  ui: true, learning: true, locale: 'en', policy: null as unknown, acknowledgement: null as unknown, program: true, chapter: true, error: false,
  queries: [] as string[], rpc: vi.fn()}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({redirect: (url: string) => {throw new Error('REDIRECT ' + url);}, notFound: () => {throw new Error('NOT_FOUND');}}));
vi.mock('next-intl/server', () => ({getLocale: async () => state.locale}));
vi.mock('@/lib/auth/viewer', () => ({getViewer: async () => ({appUser: {id: 'self', role: state.actual, status: state.active ? 'active' : 'deactivated'}, role: state.role, isPreview: state.preview})}));
vi.mock('@/lib/supabase/request', () => ({getRequestFeatureFlags: async () => ({elearning: state.learning, assessor_flow_ui: state.ui, assessor_flow_writes: false, assessor_flow_awards: false})}));
vi.mock('@/lib/supabase/server', () => ({createClient: async () => ({rpc: state.rpc, from: (table: string) => {
  state.queries.push(table);
  const query = {select: () => query, eq: () => query, maybeSingle: async () => ({
    data: (table === 'training_programs' ? state.program : state.chapter) ? {id: 'valid'} : null,
    error: state.error ? {message: 'unavailable'} : null,
  })}; return query;
}})}));
beforeEach(() => {
  Object.assign(state, {role: 'assessor', actual: 'assessor', active: true, preview: false, ui: true, learning: true,
    locale: 'en', program: true, chapter: true, error: false, queries: [], policy: {
      programInstanceId: 'manual', programKey: 'bhw-reference-manual', chapterKey: 'chapter-1',
      requirementsVersion: 'chapter-1:c1af.draft-1', actorId: 'self', cohortId: 'group',
      uiEnabled: true, writesEnabled: false, awardsEnabled: false, authorityCutoverAt: null,
    }});
  state.acknowledgement={actorId:'self',programInstanceId:'manual',chapterKey:'chapter-1',requirementsVersion:'chapter-1:c1af.draft-1',briefingVersion:'chapter-1:briefing.v1',acknowledgedAt:'2026-10-11T00:00:00Z'};
  state.rpc.mockReset().mockImplementation(async (name:string) => ({data: name==='rpc_assessor_flow_policy'?state.policy:state.acknowledgement, error: null}));
});
afterEach(cleanup);
const page = (chapterKey = 'chapter-1') => BriefingPage({params: Promise.resolve({programId: 'manual', chapterKey})});
describe('Chapter 1 objectives and responsibilities briefing', () => {
  it('shows both responsibilities and chapter coverage without touching learner or candidate records', async () => {
    render(await page());
    expect(screen.getByRole('heading', {name: 'Objectives of your preparation'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'As facilitator: support learning'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'As assessor: evaluate evidence'})).toBeInTheDocument();
    fireEvent.click(screen.getByText('Coverage: 9 topics and 42 required lessons'));
    expect(screen.getByText('RA 7883: Benefits, Rights, Accreditation')).toBeInTheDocument();
    expect(screen.getByText(/Reading this briefing is not certification/)).toBeInTheDocument();
    expect(screen.getByText(/This is not automatically a failure/)).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Continue my Chapter 1 study'})).toHaveAttribute('href', '/training/manual/assessor/chapter-1');
    expect(state.queries).toEqual(['training_programs', 'training_program_chapters']);
    expect(state.rpc).toHaveBeenCalledWith('rpc_assessor_flow_policy', {p_program_id: 'manual', p_chapter_key: 'chapter-1'});
    expect(state.rpc).toHaveBeenCalledWith('rpc_assessor_briefing_state', {p_program_id: 'manual'});
    // The walkthrough's controls are local demonstrations. Opening it must
    // not add RPC calls or touch learner/candidate tables.
    const tour = screen.getByRole('region', {name: 'Platform walkthrough with Alex and Rosa'});
    fireEvent.click(within(tour).getByRole('button', {name: 'Record practice observation'}));
    fireEvent.click(within(tour).getByRole('button', {name: 'Record demo observation'}));
    expect(within(tour).getByText(/no real record is saved/)).toBeInTheDocument();
    expect(state.rpc).toHaveBeenCalledTimes(2);
    expect(state.queries).toEqual(['training_programs', 'training_program_chapters']);
  });
  it('renders Filipino responsibilities and expectations', async () => {
    state.locale = 'fil'; render(await page());
    expect(screen.getByRole('heading', {name: 'Bilang facilitator: gabayan ang pagkatuto'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Bilang assessor: suriin ang ebidensiya'})).toBeInTheDocument();
    expect(screen.getByText(/Ang pagbasa sa briefing ay hindi sertipikasyon/)).toBeInTheDocument();
  });
  it.each(['en', 'fil'])('explains the required sequence and pending release without inventing personal completion (%s)', async locale => {
    state.locale = locale; render(await page());
    const en = locale === 'en';
    const sequence = screen.getByRole('region', {name: en ? 'Your preparation and certification' : 'Ang iyong paghahanda at sertipikasyon'});
    expect(within(sequence).getAllByRole('heading', {level: 3}).slice(0, 7).map(item => item.textContent)).toEqual(en
      ? ['Opening briefing', 'Diagnostic pretest', 'Personal study', 'Chapter post-test', 'Scoring orientation', 'Platform competency simulation', 'Chapter 1 certification']
      : ['Panimulang briefing', 'Diagnostic pretest', 'Sariling pag-aaral', 'Pangwakas na pagsusulit', 'Oryentasyon sa pagmamarka', 'Pagsasanay sa paggamit ng platform', 'Sertipikasyon para sa Kabanata 1']);
    expect(within(sequence).getByText(en ? /It is not pass\/fail/ : /Hindi ito pass\/fail/)).toBeInTheDocument();
    expect(within(sequence).getByText(en ? /all 42 required lessons across 9 topics/ : /42 kinakailangang aralin sa 9 paksa/)).toBeInTheDocument();
    expect(within(sequence).getByText(/80%/)).toBeInTheDocument();
    expect(within(sequence).getByText(en ? /No real BHW records are changed/ : /Walang totoong tala ng BHW na babaguhin/)).toBeInTheDocument();
    expect(within(sequence).getByText(en ? /revised certification issuance are not yet available/ : /pagbibigay ng binagong sertipikasyon/)).toBeInTheDocument();
    expect(within(sequence).getByText(en ? /Chapter 3 certification pathway is not yet available/ : /Hindi pa available ang landas ng sertipikasyon para sa Kabanata 3/)).toBeInTheDocument();
    expect(within(sequence).queryByRole('link')).toBeNull();
    expect(within(sequence).queryByRole('progressbar')).toBeNull();
    expect(state.rpc).toHaveBeenCalledTimes(2);
  });
  it.each(['bhw', 'designer'])('excludes %s before database access', async role => {
    state.role = role; state.actual = role;
    await expect(page()).rejects.toThrow('REDIRECT /home');
    expect(state.queries).toEqual([]); expect(state.rpc).not.toHaveBeenCalled();
  });
  it('keeps disabled UI free of new reads', async () => {
    state.ui = false; await expect(page()).rejects.toThrow('REDIRECT /training/manual/assessor/chapter-1');
    expect(state.queries).toEqual([]); expect(state.rpc).not.toHaveBeenCalled();
  });
  it.each([null, {}, {actorId: 'other'}, {uiEnabled: false}])('does not expose the screen for missing or invalid cohort policy %#', async policy => {
    state.policy = policy; await expect(page()).rejects.toThrow('REDIRECT /training/manual/assessor/chapter-1');
  });
  it('allows actual admin preview with no candidate policy or study controls', async () => {
    state.actual = 'admin'; state.role = 'assessor'; state.preview = true; state.ui = false;
    render(await page()); expect(screen.getByText(/^Admin preview only/)).toHaveAttribute('role', 'status');
    expect(state.rpc).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', {name: 'Continue my Chapter 1 study'})).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
  it('denies inactive, preview assessor, and disabled learning before reads', async () => {
    state.active = false; await expect(page()).rejects.toThrow('REDIRECT /login');
    state.active = true; state.preview = true; await expect(page()).rejects.toThrow('REDIRECT /home');
    state.preview = false; state.learning = false; await expect(page()).rejects.toThrow('REDIRECT /home');
    expect(state.queries).toEqual([]);
  });
  it('rejects other chapters and unavailable program chapters', async () => {
    await expect(page('chapter-2')).rejects.toThrow('NOT_FOUND');
    state.program = false; await expect(page()).rejects.toThrow('NOT_FOUND');
    state.program = true; state.chapter = false; await expect(page()).rejects.toThrow('NOT_FOUND');
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it('reports publication read errors rather than presenting invalid content', async () => {
    state.error = true; await expect(page()).rejects.toThrow('Unable to load assessor briefing');
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
