import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({claims: true, user: {id: 'owner', status: 'active', role: 'admin'}, results: [] as unknown[], calls: [] as unknown[][]}));
vi.mock('@/lib/supabase/app-user', () => ({forwardedAppUser: () => null, getAppUser: async () => mock.user}));
vi.mock('@/lib/supabase/server', () => ({createClient: async () => ({
  auth: {getClaims: async () => ({data: mock.claims ? {claims: {sub: 'auth'}} : null})},
  from: (table: string) => {
    const result = mock.results.shift();
    const query: Record<string, unknown> = {then: (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve)};
    for (const method of ['select','eq','order','limit','range','maybeSingle']) query[method] = (...args: unknown[]) => {
      mock.calls.push([table, method, ...args]); return query;
    };
    return query;
  },
})}));
const { GET } = await import('./route');
const session = '11111111-1111-4111-8111-111111111111';
const get = (query = '') => GET(new NextRequest(`http://localhost/api/chat/history${query}`));
beforeEach(() => {mock.claims = true; mock.user = {id: 'owner', status: 'active', role: 'admin'}; mock.results = []; mock.calls = [];});
it('rejects anonymous and deactivated callers before any history read', async () => {
  mock.claims = false; expect((await get()).status).toBe(401);
  mock.claims = true; mock.user.status = 'deactivated'; expect((await get()).status).toBe(401);
  expect(mock.calls).toEqual([]);
});
it.each(['?page=-1','?page=1.5','?page=10001','?session=bad','?page=NaN'])('rejects malformed pagination or session: %s', async query => {
  expect((await get(query)).status).toBe(400); expect(mock.calls).toEqual([]);
});
it('scopes even an admin list to the authenticated owner and bounds its preview and pagination', async () => {
  mock.results.push({data: Array.from({length: 21}, (_, i) => ({id: String(i)})), error: null});
  const response = await get('?page=2');
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  const body = await response.json(); expect(body.items).toHaveLength(20); expect(body.nextPage).toBe(3);
  expect(mock.calls).toContainEqual(['chat_sessions','eq','user_id','owner']);
  expect(mock.calls).toContainEqual(['chat_sessions','limit',1,{referencedTable: 'chat_messages'}]);
  expect(mock.calls).toContainEqual(['chat_sessions','range',40,60]);
});
it('returns the same 404 for absent and other-owner sessions without querying their messages', async () => {
  mock.results.push({data: null, error: null});
  expect((await get(`?session=${session}`)).status).toBe(404);
  expect(mock.calls).toContainEqual(['chat_sessions','eq','user_id','owner']);
  expect(mock.calls.some(call => call[0] === 'chat_messages')).toBe(false);
});
it('returns stored transcript text without reading or recomputing any knowledge entry', async () => {
  const saved = {id: 'm', text: 'An old saved answer', sender: 'system'};
  mock.results.push({data: {id: session}, error: null}, {data: [saved], error: null});
  const response = await get(`?session=${session}&page=1`);
  expect(await response.json()).toEqual({items: [saved], nextPage: null});
  expect(mock.calls).toContainEqual(['chat_messages','eq','session_id',session]);
  expect(mock.calls).toContainEqual(['chat_messages','range',50,100]);
  expect(mock.calls.every(call => ['chat_sessions','chat_messages'].includes(String(call[0])))).toBe(true);
});
it.each(['ownership','messages','list'])('fails closed on %s database errors', async stage => {
  if (stage === 'messages') mock.results.push({data: {id: session}, error: null});
  mock.results.push({data: null, error: {message: 'private database details'}});
  const response = await get(stage === 'list' ? '' : `?session=${session}`);
  expect(response.status).toBe(500); expect(await response.text()).not.toContain('private database');
});
