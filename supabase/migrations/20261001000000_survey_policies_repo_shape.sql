-- Bring the pilot's survey child-table policies back to the repo's shape and
-- drop the three helper functions only the pilot has.
--
-- The pilot's fix_surveys_org_unit_rls_composability (history row
-- 20260726082227, never committed) created survey_org_unit_path(uuid),
-- survey_response_org_unit_path(uuid) and survey_status(uuid) as SECURITY
-- DEFINER functions granted to anon and authenticated, and rewrote
-- survey_questions_read, survey_questions_admin_write,
-- survey_responses_admin_read and survey_answers_admin_read to call them.
-- The repo (20260728000000_inc11_surveys.sql) and the CI project use
-- `exists (select 1 from surveys ...)` instead, relying on org_unit_path()
-- for the ancestor lookup. The two shapes admit the same rows: the parent
-- rows the repo's EXISTS reads are visible under exactly the conditions the
-- pilot's helper checks restate. But the helpers are callable directly via
-- /rest/v1/rpc, so anon could read any survey's status and org path, drafts
-- included, and the security advisor flags all three for anon and
-- authenticated.
--
-- The policies below are copied verbatim from inc11_surveys.sql, so on a
-- project already in the repo's shape (CI) this migration changes nothing.
-- The policies are replaced before the functions are dropped, because the
-- pilot's policies depend on them. See docs/deploy-runbook.md, "Migration
-- history notes".

drop policy if exists survey_questions_read on public.survey_questions;
create policy survey_questions_read on public.survey_questions for select
  using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_questions.survey_id
        and (
          (
            s.status = 'published'
            and (select public.current_org_path()) like (select public.org_unit_path(s.org_unit_id)) || '%'
          )
          or (
            (select public.current_app_user()).role = 'admin'
            and (select public.org_unit_path(s.org_unit_id)) like (select public.current_org_path()) || '%'
          )
        )
    )
  );

drop policy if exists survey_questions_admin_write on public.survey_questions;
create policy survey_questions_admin_write on public.survey_questions for all
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.surveys s
      where s.id = survey_questions.survey_id
        and (select public.org_unit_path(s.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.surveys s
      where s.id = survey_questions.survey_id
        and (select public.org_unit_path(s.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists survey_responses_admin_read on public.survey_responses;
create policy survey_responses_admin_read on public.survey_responses for select
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.surveys s
      where s.id = survey_responses.survey_id
        and (select public.org_unit_path(s.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists survey_answers_admin_read on public.survey_answers;
create policy survey_answers_admin_read on public.survey_answers for select
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.survey_responses r
      join public.surveys s on s.id = r.survey_id
      where r.id = survey_answers.response_id
        and (select public.org_unit_path(s.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop function if exists public.survey_org_unit_path(uuid);
drop function if exists public.survey_response_org_unit_path(uuid);
drop function if exists public.survey_status(uuid);
