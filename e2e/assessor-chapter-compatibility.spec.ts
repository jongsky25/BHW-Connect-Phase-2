import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {STABLE_CITY_ADMIN,createThrowawayAssessor,getAccessToken,restGet} from './fixtures/auth';

test('C1AF-23 rehearses Chapter 2 and future Chapter 3 against all migrated tables', async ({request}) => {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  test.skip(!['127.0.0.1','localhost'].includes(url.hostname) || url.port !== '54321', 'Disposable local Supabase required');
  const adminToken = await getAccessToken(request, STABLE_CITY_ADMIN.username, STABLE_CITY_ADMIN.password);
  const assessor = await createThrowawayAssessor(request, adminToken, '00000000-0000-0000-0000-000000000004');
  const [actor] = await restGet(request, adminToken, `users?select=id&username=eq.${assessor.username}`) as Array<{id:string}>;
  expect(actor.id).toMatch(/^[0-9a-f-]{36}$/);
  const sql = readFileSync(new URL('./fixtures/c1af23-real-schema.sql', import.meta.url), 'utf8').replaceAll('__ACTOR_ID__', actor.id);
  const result = execFileSync('docker', ['exec','-i','supabase_db_bhw-connect-phase-2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],
    {input:sql,encoding:'utf8',timeout:30000});
  expect(result).toContain('C1AF-23 real schema rehearsal passed');
});
