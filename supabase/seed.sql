-- Local / CI seed for the throwaway Supabase that `supabase start` builds from
-- migrations/. NEVER run this against a hosted project: it sets the fixture
-- accounts' passwords to the public, well-known value below.
--
-- It recreates the state the E2E suite expects of the pilot project, so CI
-- can run every spec against a local database instead of writing into the
-- pilot (see docs/deploy-runbook.md's "E2E database" section):
--   * the four stable fixture accounts, fully onboarded, on the same org
--     chain and with the same profile fields as on the pilot;
--   * the pilot's resting feature-flag values (captured 28 Sep 2026);
--   * the Phase 1 `mch` KB category with one published entry. On the pilot
--     it was authored by hand and isn't in content/; onboarding.spec.ts
--     visits /kb/mch. The HHP-NCD corpus the Chat Guide specs rely on is
--     loaded separately, by `npm run kb:load -- --project local` (ci.yml).
--
-- admin.city.stable is already created by the INC-6 migration with a random
-- password; only its password is reset here.

do $$
declare
  v_password constant text := 'local-e2e-password';
  v_account record;
  v_auth_user_id uuid;
begin
  for v_account in
    select * from (values
      ('admin.stable', 'Stable Pilot Admin', 'admin', '00000000-0000-0000-0000-000000000005'::uuid, '{}'::jsonb),
      ('bhw.stable', 'Stable Pilot BHW', 'bhw', '00000000-0000-0000-0000-000000000005'::uuid, '{"chat":true}'::jsonb),
      ('bhw.other', 'Other Barangay BHW', 'bhw', '00000000-0000-0000-0000-000000000006'::uuid, '{}'::jsonb)
    ) as t(username, full_name, role, org_unit_id, onboarding_progress)
  loop
    if exists (select 1 from public.users where username = v_account.username) then
      continue;
    end if;

    v_auth_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new,
      email_change_token_current, phone_change_token, email_change,
      phone_change, reauthentication_token, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_auth_user_id, 'authenticated', 'authenticated',
      v_account.username || '@bhw.local', crypt(v_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false,
      '', '', '', '', '', '', '', '', now(), now()
    );

    insert into public.users (
      auth_user_id, username, full_name, role, org_unit_id, status,
      must_change_password, consented_at, language, onboarding_progress,
      onboarding_completed_at
    ) values (
      v_auth_user_id, v_account.username, v_account.full_name, v_account.role,
      v_account.org_unit_id, 'active', false, now(), 'fil',
      v_account.onboarding_progress, now()
    );
  end loop;

  update auth.users
     set encrypted_password = crypt(v_password, gen_salt('bf'))
   where email = 'admin.city.stable@bhw.local';

  update public.users
     set onboarding_completed_at = coalesce(onboarding_completed_at, now())
   where username = 'admin.city.stable';
end;
$$;

update public.feature_flags f
   set enabled = v.enabled
  from (values
    ('ai_external', true),
    ('ai_gap_draft', true),
    ('announcements', true),
    ('chat_conversation', true),
    ('course_sessions', false),
    ('elearning', true),
    ('flipcharts', true),
    ('forum', true),
    ('kb_articles', true),
    ('notifications', true),
    ('offline_pwa', false),
    ('reports_export', true),
    ('surveys', true)
  ) as v(key, enabled)
 where f.key = v.key;

insert into public.kb_categories (name_fil, name_en, slug, sort_order)
values ('Kalusugan ng Ina at Bata', 'Maternal & Child Health', 'mch', 1)
on conflict do nothing;

insert into public.kb_entries (
  category_id, question_fil, question_en, answer_fil, answer_en, keywords,
  status, owner_user_id, review_due_on
)
select c.id,
       'Puwede bang magpasuso ang inang may banayad na sipon o lagnat?',
       'Can a mother with a mild cold or fever continue breastfeeding?',
       'Oo. Ituloy ang pagpapasuso; maghugas ng kamay at magsuot ng mask kung may ubo o sipon.',
       'Yes. Keep breastfeeding; wash hands and wear a mask if coughing or sneezing.',
       array['pagpapasuso', 'breastfeeding', 'lagnat', 'sipon'],
       'published', u.id, current_date + 365
  from public.kb_categories c, public.users u
 where c.slug = 'mch'
   and u.username = 'admin.stable'
   and not exists (select 1 from public.kb_entries e where e.category_id = c.id);
