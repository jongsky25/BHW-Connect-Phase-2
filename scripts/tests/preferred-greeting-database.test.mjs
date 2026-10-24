// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from 'vitest';
const read = p => readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let db;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.users(id uuid primary key,auth_user_id uuid unique,role text,status text,full_name text);
    create table public.saved_grades(user_id uuid,score numeric);`);
  const baseline = read('supabase/migrations/20260720000000_baseline_captured_from_remote.sql');
  const start = baseline.indexOf('create or replace function public.current_app_user(');
  await db.exec(baseline.slice(start,baseline.indexOf('$$;',start)+3));
  await db.exec(read('supabase/migrations/20261024101555_fb33d_preferred_greeting_name.sql'));
});
afterAll(async () => db.close());
beforeEach(async () => {
  await db.exec('begin');
  for (const [n,role,status] of [[1,'bhw','active'],[2,'assessor','active'],[3,'admin','active'],[4,'designer','active'],[5,'bhw','deactivated']]) {
    await db.query('insert into public.users values($1,$1,$2,$3,$4)',[uid(n),role,status,'Official name '+n]);
    await db.query('insert into public.saved_grades values($1,80)',[uid(n)]);
  }
});
afterEach(async () => db.exec('rollback'));
async function asUser(n, sql, params=[]) {
  await db.exec('savepoint actor_call');
  try {
    await db.exec('set local role '+(n?'authenticated':'anon'));
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[n?uid(n):'']);
    const result=await db.query(sql,params);
    await db.exec('reset role; release savepoint actor_call');
    return result.rows;
  } catch(error) { await db.exec('rollback to savepoint actor_call; release savepoint actor_call'); throw error; }
}
const get = async n => (await asUser(n,'select public.rpc_my_greeting_name() as name'))[0].name;
const set = async (n,name) => (await asUser(n,'select public.rpc_set_my_greeting_name($1) as name',[name]))[0].name;
it('defaults to no preference and persists an explicitly chosen name for all active roles', async () => {
  for (const n of [1,2,3,4]) { expect(await get(n)).toBeNull(); expect(await set(n,'  RJ '+n+'  ')).toBe('RJ '+n); expect(await get(n)).toBe('RJ '+n); }
});
it('isolates owners including admins and clears only the current preference', async () => {
  await set(1,'Rosa'); await set(2,'Justin'); await set(3,'Admin');
  expect(await get(1)).toBe('Rosa'); expect(await get(3)).toBe('Admin');
  expect(await set(1,'')).toBeNull(); expect(await get(1)).toBeNull(); expect(await get(2)).toBe('Justin');
  expect(await set(2,null)).toBeNull(); expect(await get(3)).toBe('Admin');
});
it('accepts Unicode names and trims ordinary/nonbreaking boundary spaces', async () => {
  expect(await set(1,'\u00a0Élaine Peña-Santos\u00a0')).toBe('Élaine Peña-Santos');
  expect(await set(1,'美玲')).toBe('美玲');
});
it('rejects oversize/control input without overwriting the saved name', async () => {
  await set(1,'Rosa');
  for (const name of ['x'.repeat(81),'Rosa\nSantos','Rosa\tSantos']) await expect(set(1,name)).rejects.toThrow('invalid preferred name');
  expect(await get(1)).toBe('Rosa'); expect(await set(1,'x'.repeat(80))).toHaveLength(80);
});
it('denies anonymous, inactive and unregistered sessions', async () => {
  for (const n of [0,5,99]) { await expect(get(n)).rejects.toThrow(); await expect(set(n,'No')).rejects.toThrow(); }
  expect((await db.query('select count(*)::int as n from user_preferences_private.greeting_names')).rows[0].n).toBe(0);
});
it('denies direct table access and pins authenticated-only definer functions with empty search paths', async () => {
  await expect(asUser(1,'select * from user_preferences_private.greeting_names')).rejects.toThrow();
  const rows=(await db.query(`select p.proname,p.prosecdef,p.proconfig,
    has_function_privilege('anon',p.oid,'execute') as anon_execute,
    has_function_privilege('authenticated',p.oid,'execute') as auth_execute
    from pg_proc p where p.proname in ('rpc_my_greeting_name','rpc_set_my_greeting_name') order by p.proname`)).rows;
  expect(rows).toHaveLength(2);
  for (const row of rows) { expect(row.prosecdef).toBe(true); expect(row.proconfig).toEqual(['search_path=""']); expect(row.anon_execute).toBe(false); expect(row.auth_execute).toBe(true); }
  expect((await db.query("select relrowsecurity as enabled from pg_class where oid='user_preferences_private.greeting_names'::regclass")).rows[0].enabled).toBe(true);
});
it('does not update official names, profile identities or saved grades', async () => {
  const snapshot=async()=>JSON.stringify((await db.query('select to_jsonb(u) as profile,g.score from public.users u join public.saved_grades g on g.user_id=u.id order by u.id')).rows);
  const before=await snapshot(); await set(1,'RJ'); await set(1,'Revised'); await set(1,null); await get(1);
  expect(await snapshot()).toBe(before);
});
it('does not add a caller-selected owner argument and permits account cleanup by FK cascade', async () => {
  const args=(await db.query("select proname,pronargs from pg_proc where proname in ('rpc_my_greeting_name','rpc_set_my_greeting_name') order by proname")).rows;
  expect(args.map(row=>row.pronargs)).toEqual([0,1]);
  await set(1,'Rosa'); await db.query('delete from public.users where id=$1',[uid(1)]);
  expect((await db.query('select count(*)::int as n from user_preferences_private.greeting_names')).rows[0].n).toBe(0);
});
