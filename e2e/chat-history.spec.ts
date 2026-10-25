import {randomUUID} from 'node:crypto';
import {expect, test, type Page} from '@playwright/test';
import {OTHER_BARANGAY_BHW, STABLE_CITY_ADMIN, STABLE_BHW, getAccessToken, restGet} from './fixtures/auth';

// No pilot writes. Enforce the exact disposable endpoint before signing in
// or creating any records, in addition to the suite's global pilot guard.
test.beforeEach(() => {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321') throw Error('Chat history E2E requires disposable localhost Supabase');
});
async function login(page: Page, account: {username: string; password: string}) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', {name: 'Mag-login'}).click();
  await expect(page).toHaveURL('/home');
}

test('a real saved question reopens after reload; history is personal even for admins and paginates stored messages', async ({page, request, browser}) => {
  // chat-guide.spec deliberately exhausts the stable BHW rate limit.
  // Use the other BHW so this real send is independent of that flood.
  await login(page, OTHER_BARANGAY_BHW);
  const question = 'What is hypertension?';
  const answerResponse = await page.request.post('/api/chat', {data: {question}});
  expect(answerResponse.ok(), await answerResponse.text()).toBe(true);
  const answer = await answerResponse.json();
  expect(answer.session_id).toBeTruthy();
  const id = answer.session_id as string;
  const bhwToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);
  const [owner] = await restGet(request, bhwToken, `users?username=eq.${OTHER_BARANGAY_BHW.username}&select=id`) as Array<{id: string}>;
  const saved = await restGet(request, bhwToken, `chat_messages?session_id=eq.${id}&select=id,sender,text,created_at,kind,route&order=created_at.asc`);
  expect(saved).toHaveLength(2);
  await page.goto('/chat');
  await page.reload();
  await page.getByRole('button', {name: 'Mga nakaraan kong usapan'}).click();
  await page.getByRole('button', {name: new RegExp(question.replace('?', '\\?'))}).first().click();
  const transcript = page.getByRole('list', {name: 'Naka-save na usapan'});
  await expect(transcript).toContainText(question);
  await expect(transcript.getByRole('listitem')).toHaveCount(2);
  const historyRead = await page.request.get(`/api/chat/history?session=${id}`);
  expect(historyRead.headers()['cache-control']).toBe('private, no-store');
  expect((await historyRead.json()).items).toEqual(saved);
  // Reopening never appends a turn or rewrites the stored answer.
  expect(await restGet(request, bhwToken, `chat_messages?session_id=eq.${id}&select=id,sender,text,created_at,kind,route&order=created_at.asc`)).toEqual(saved);

  for (const account of [STABLE_CITY_ADMIN, STABLE_BHW]) {
    const context = await browser.newContext();
    try {
      const other = await context.newPage(); await login(other, account);
      const read = await other.request.get(`/api/chat/history?session=${id}`);
      expect(read.status()).toBe(404);
      const list = await other.request.get('/api/chat/history');
      expect(list.ok(), await list.text()).toBe(true);
      expect((await list.json()).items.map((s: {id: string}) => s.id)).not.toContain(id);
    } finally {await context.close();}
  }

  const sessionIds = Array.from({length: 21}, () => randomUUID());
  const headers = {apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${bhwToken}`, Prefer: 'return=minimal'};
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL! + '/rest/v1';
  try {
    const sessions = await request.post(`${base}/chat_sessions`, {headers, data: sessionIds.map(sessionId => ({id: sessionId,user_id: owner.id}))});
    expect(sessions.ok(), await sessions.text()).toBe(true);
    const messages = await request.post(`${base}/chat_messages`, {headers, data: Array.from({length: 52}, (_, i) => ({
      session_id: sessionIds[0], sender: i % 2 === 0 ? 'user' : 'system', text: `Archived fixture ${i}`, kind: i % 2 === 0 ? 'question' : 'answer',
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    }))});
    expect(messages.ok(), await messages.text()).toBe(true);
    const first = await (await page.request.get(`/api/chat/history?session=${sessionIds[0]}`)).json();
    const second = await (await page.request.get(`/api/chat/history?session=${sessionIds[0]}&page=1`)).json();
    expect(first.items).toHaveLength(50); expect(first.nextPage).toBe(1);
    expect(second.items.map((m: {text: string}) => m.text)).toEqual(['Archived fixture 50','Archived fixture 51']);
    expect(second.nextPage).toBeNull();
    const list = await (await page.request.get('/api/chat/history')).json();
    expect(list.items).toHaveLength(20); expect(list.nextPage).toBe(1);
    expect(list.items.every((s: {chat_messages: unknown[]}) => s.chat_messages.length <= 1)).toBe(true);
  } finally {
    const cleanup = await request.delete(`${base}/chat_sessions?id=in.(${[id,...sessionIds].join(',')})`, {headers});
    expect(cleanup.ok(), await cleanup.text()).toBe(true);
  }
});
