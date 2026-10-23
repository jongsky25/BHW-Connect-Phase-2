import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';
import en from '../../messages/en.json';
import fil from '../../messages/fil.json';
import { OrgUnitPicker } from './org-unit-picker';

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: () => {
  let parent = '';
  const query = {
    select: () => query, eq: (_key: string, id: string) => { parent = id; return query; }, order: () => query,
    returns: async () => ({ data: parent.startsWith('region-') ? [
      { id: `palawan-${parent}`, name: 'Palawan', level: 'provincial' },
      { id: `huc-${parent}`, name: 'City of Puerto Princesa (HUC)', level: 'provincial' },
    ] : parent.startsWith('huc-') ? [{ id: 'puerto-princesa', name: 'City of Puerto Princesa (Capital)', level: 'city_municipal' }] : [], error: null }),
  };
  return query;
} }) }));
afterEach(cleanup);

it.each(['en', 'fil'] as const)('explains and selects the independent-city path without reparenting it (%s)', async locale => {
  const messages = locale === 'en' ? en : fil;
  const change = vi.fn();
  render(<NextIntlClientProvider locale={locale} messages={messages}>
    <OrgUnitPicker root={{ id: `region-${locale}`, name: 'MIMAROPA', level: 'regional' }} maxLevel="city_municipal" onChange={change} />
  </NextIntlClientProvider>);
  const province = screen.getByRole('combobox', { name: messages.orgPicker.levelProvincial });
  await waitFor(() => expect(province).toBeEnabled());
  expect(province).toHaveAccessibleDescription(messages.orgPicker.independentCityHint);
  expect(screen.getByRole('option', { name: 'City of Puerto Princesa (HUC)' })).toBeInTheDocument();
  fireEvent.change(province, { target: { value: `palawan-region-${locale}` } });
  await waitFor(() => expect(screen.getByRole('combobox', { name: messages.orgPicker.levelCityMunicipal })).toBeEnabled());
  expect(screen.queryByRole('option', { name: 'City of Puerto Princesa (Capital)' })).not.toBeInTheDocument();
  fireEvent.change(province, { target: { value: `huc-region-${locale}` } });
  await screen.findByRole('option', { name: 'City of Puerto Princesa (Capital)' });
  fireEvent.change(screen.getByRole('combobox', { name: messages.orgPicker.levelCityMunicipal }), { target: { value: 'puerto-princesa' } });
  expect(change).toHaveBeenLastCalledWith({ id: 'puerto-princesa', name: 'City of Puerto Princesa (Capital)', level: 'city_municipal' });
});
