-- The survey_questions/survey_responses/survey_answers RLS policies scope
-- access via `exists (select 1 from public.surveys s where ...)`. That
-- subquery runs against `surveys`, which is itself RLS-protected, so each
-- of these policies implicitly re-evaluates surveys_read_scope /
-- surveys_admin_write inside its own qual. This is the same composability
-- hazard fixed for announcements in fix_announcements_org_unit_rls_composability:
-- replace the nested RLS-protected-table subquery with stable
-- security definer helper functions (which bypass RLS the same way
-- org_unit_path() already does for org_units).

create or replace function public.survey_org_unit_path(p_survey_id uuid)
returns text
language sql
stable security definer
set search_path = public
as $$
  select public.org_unit_path(org_unit_id) from public.surveys where id = p_survey_id;
$$;

grant execute on function public.survey_org_unit_path(uuid) to anon, authenticated;

create or replace function public.survey_status(p_survey_id uuid)
returns text
language sql
stable security definer
set search_path = public
as $$
  select status from public.surveys where id = p_survey_id;
$$;

grant execute on function public.survey_status(uuid) to anon, authenticated;

create or replace function public.survey_response_org_unit_path(p_response_id uuid)
returns text
language sql
stable security definer
set search_path = public
as $$
  select public.survey_org_unit_path(survey_id) from public.survey_responses where id = p_response_id;
$$;

grant execute on function public.survey_response_org_unit_path(uuid) to anon, authenticated;

drop policy if exists survey_questions_read on public.survey_questions;
create policy survey_questions_read on public.survey_questions for select
  using (
    (
      (select public.survey_status(survey_questions.survey_id)) = 'published'
      and (select public.current_org_path()) like (select public.survey_org_unit_path(survey_questions.survey_id)) || '%'
    )
    or (
      (select public.current_app_user()).role = 'admin'
      and (select public.survey_org_unit_path(survey_questions.survey_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists survey_questions_admin_write on public.survey_questions;
create policy survey_questions_admin_write on public.survey_questions for all
  using (
    (select public.current_app_user()).role = 'admin'
    and (select public.survey_org_unit_path(survey_questions.survey_id)) like (select public.current_org_path()) || '%'
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and (select public.survey_org_unit_path(survey_questions.survey_id)) like (select public.current_org_path()) || '%'
  );

drop policy if exists survey_responses_admin_read on public.survey_responses;
create policy survey_responses_admin_read on public.survey_responses for select
  using (
    (select public.current_app_user()).role = 'admin'
    and (select public.survey_org_unit_path(survey_responses.survey_id)) like (select public.current_org_path()) || '%'
  );

drop policy if exists survey_answers_admin_read on public.survey_answers;
create policy survey_answers_admin_read on public.survey_answers for select
  using (
    (select public.current_app_user()).role = 'admin'
    and (select public.survey_response_org_unit_path(survey_answers.response_id)) like (select public.current_org_path()) || '%'
  );
