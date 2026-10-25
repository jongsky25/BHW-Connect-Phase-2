import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {ChatHistory} from './chat-history';
import {PreviewProvider} from '@/components/preview/preview-provider';
import {historyText} from '@/lib/chat/history';
import en from '../../../messages/en.json';
import fil from '../../../messages/fil.json';
const fetchMock = vi.fn();
const session = {id: 'session', last_message_at: '2026-10-25T10:00:00Z', chat_messages: [{text: 'My previous question', sender: 'user'}]};
function mount(locale = 'en', preview = false) {return render(<NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : fil}><PreviewProvider isPreview={preview}><ChatHistory/></PreviewProvider></NextIntlClientProvider>);}
function respond(items: unknown[], nextPage: number | null = null) {return {ok: true, json: async () => ({items, nextPage})};}
beforeEach(() => {vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset();});
afterEach(() => {vi.unstubAllGlobals();});
it.each(['en','fil'])('opens stored text read only, closes and refreshes on reopen (%s)', async locale => {
  fetchMock.mockResolvedValueOnce(respond([session])).mockResolvedValueOnce(respond([{id: 'm',sender: 'system',text: 'Original saved answer.'}])).mockResolvedValueOnce(respond([]));
  mount(locale);
  const heading = locale === 'en' ? 'My chat history' : 'Mga nakaraan kong usapan';
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: heading}));
  fireEvent.click(await screen.findByRole('button', {name: /My previous question/}));
  expect(await screen.findByText('Original saved answer.')).toBeVisible();
  expect(fetchMock.mock.calls.every(([, options]) => options.cache === 'no-store' && !options.method)).toBe(true);
  fireEvent.click(screen.getByRole('button', {name: heading}));
  expect(screen.queryByText('Original saved answer.')).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: heading}));
  expect(await screen.findByText(locale === 'en' ? 'No saved conversations yet.' : 'Wala pang naka-save na usapan.')).toBeVisible();
});
it('preserves loaded rows when a subsequent page fails and retries that page', async () => {
  fetchMock.mockResolvedValueOnce(respond([session],1)).mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce(respond([{...session,id: 'two',chat_messages: [{text: 'Second conversation'}]}]));
  mount(); fireEvent.click(screen.getByRole('button', {name: 'My chat history'}));
  fireEvent.click(await screen.findByRole('button', {name: 'Load more'}));
  await screen.findByRole('alert'); expect(screen.getByRole('button', {name: /My previous question/})).toBeVisible();
  fireEvent.click(screen.getByRole('button', {name: 'Retry history'}));
  await screen.findByRole('button', {name: /Second conversation/});
  expect(fetchMock.mock.calls[2][0]).toContain('page=1');
});
it('ignores an old transcript response after returning to the conversation list', async () => {
  let resolve!: (value: unknown) => void;
  fetchMock.mockResolvedValueOnce(respond([session])).mockImplementationOnce(() => new Promise(r => {resolve = r;})).mockResolvedValueOnce(respond([session]));
  mount(); fireEvent.click(screen.getByRole('button', {name: 'My chat history'}));
  fireEvent.click(await screen.findByRole('button', {name: /My previous question/}));
  fireEvent.click(screen.getByRole('button', {name: 'Back to conversations'}));
  await screen.findByRole('button', {name: /My previous question/});
  resolve(respond([{id: 'old',text: 'Stale private transcript',sender: 'system'}]));
  await waitFor(() => expect(screen.queryByText('Stale private transcript')).toBeNull());
});
it('does not fetch an admin’s history in role preview', () => {
  mount('en',true); expect(screen.getByRole('button', {name: 'My chat history'})).toBeDisabled(); expect(fetchMock).not.toHaveBeenCalled();
});
it.each(['en','fil'])('explains measurement and internal placeholders without inventing answers (%s)', locale => {
  for (const text of ['[bp measurement]','[bmi measurement]','measurement:bmi:result','measurement:bp:invalid']) {
    expect(historyText({sender: 'system',text},locale)).toBe(locale === 'en' ? 'Measurement details were not saved.' : 'Hindi itinabi ang mga detalye ng pagsukat.');
  }
  expect(historyText({sender:'system',text:'did_you_mean'},locale)).not.toBe('did_you_mean');
  expect(historyText({sender:'system',text:'no_answer'},locale)).not.toBe('no_answer');
  expect(historyText({sender:'user',text:'no_answer'},locale)).toBe('no_answer');
});
