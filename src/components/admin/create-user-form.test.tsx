import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import fil from '../../../messages/fil.json';
import { CreateUserForm } from './create-user-form';
import type { OrgUnitNode } from '@/lib/org-units';

const mock = vi.hoisted(() => ({ rpc: vi.fn(), created: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc: mock.rpc }) }));
const city: OrgUnitNode = { id: 'city', name: 'City', level: 'city_municipal' };
vi.mock('@/components/org-unit-picker', () => ({ OrgUnitPicker: ({ onChange }: { onChange: (unit: OrgUnitNode) => void }) =>
  <button type="button" onClick={() => onChange({ id: 'city', name: 'City', level: 'city_municipal' })}>Choose city</button> }));

beforeEach(() => {
  mock.created.mockReset();
  mock.rpc.mockReset().mockResolvedValue({ data: [{ user_id: 'new', temp_password: 'temporary' }], error: null });
});
afterEach(cleanup);

function view(locale: 'en' | 'fil' = 'en', root = city) {
  const messages = locale === 'en' ? en : fil;
  render(<NextIntlClientProvider locale={locale} messages={messages}>
    <CreateUserForm rootOrgUnit={root} onCreated={mock.created} />
  </NextIntlClientProvider>);
  return messages.admin.users;
}
function fill() {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: ' New.User ' } });
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: ' New User ' } });
}
function submit(label = 'Create user') { fireEvent.submit(screen.getByRole('button', { name: label }).closest('form')!); }

it.each(['en', 'fil'] as const)('identifies blank required fields before any RPC (%s)', locale => {
  const t = view(locale);
  fireEvent.change(screen.getByLabelText(t.usernameLabel), { target: { value: '   ' } });
  submit(t.createSubmit);
  const username = screen.getByLabelText(t.usernameLabel);
  expect(username).toHaveAttribute('aria-invalid', 'true');
  expect(username).toHaveAccessibleDescription(t.usernameRequiredError);
  expect(username).toHaveFocus();
  expect(screen.getByLabelText(t.fullNameLabel)).toHaveAttribute('aria-invalid', 'true');
  expect(mock.rpc).not.toHaveBeenCalled();
});

it('identifies an invalid optional email and preserves the entered fields', () => {
  view(); fill();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid-email' } });
  submit();
  expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Email')).toHaveFocus();
  expect(screen.getByLabelText('Full name')).toHaveValue(' New User ');
  expect(mock.rpc).not.toHaveBeenCalled();
});

it('highlights a duplicate username, retains input, and permits a corrected retry', async () => {
  mock.rpc.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "users_email_partial_key"' } });
  const t = view(); fill(); submit();
  await waitFor(() => expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true'));
  expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(t.usernameTakenError);
  expect(screen.getByLabelText('Username')).toHaveFocus();
  expect(screen.getByLabelText('Full name')).toHaveValue(' New User ');
  expect(mock.created).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Other.User' } });
  expect(screen.getByLabelText('Username')).not.toHaveAttribute('aria-invalid', 'true');
  submit();
  await waitFor(() => expect(mock.created).toHaveBeenCalledWith({ username: 'other.user', tempPassword: 'temporary' }));
  expect(mock.rpc).toHaveBeenLastCalledWith('rpc_admin_create_user', expect.objectContaining({ p_username: 'other.user', p_full_name: 'New User', p_org_unit_id: 'city' }));
  expect(screen.getByLabelText('Username')).toHaveValue('');
});

it('keeps an unknown server failure at form level without marking valid fields invalid', async () => {
  mock.rpc.mockResolvedValueOnce({ data: null, error: { message: 'not authorized' } });
  const t = view(); fill(); submit();
  expect(await screen.findByRole('alert')).toHaveTextContent(t.notAuthorizedError);
  expect(screen.getByLabelText('Username')).not.toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Username')).toHaveValue(' New.User ');
  expect(mock.created).not.toHaveBeenCalled();
});

it('focuses invalid placement and clears it after selecting a valid city', async () => {
  view('en', { id: 'root', name: 'National', level: 'national' }); fill(); submit();
  const location = screen.getByRole('group', { name: 'Location (PSGC)' });
  expect(location).toHaveAttribute('aria-invalid', 'true');
  expect(location).toHaveFocus();
  expect(mock.rpc).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Choose city' }));
  expect(location).not.toHaveAttribute('aria-invalid', 'true');
  submit();
  await waitFor(() => expect(mock.created).toHaveBeenCalledOnce());
});
