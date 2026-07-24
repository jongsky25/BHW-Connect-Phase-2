-- ---------------------------------------------------------------------
-- INC-11: Survey Tool (delivery-plan.md §6.8 / requirements-and-vision.md
-- §6.8), built as a later-phase module ahead of the pilot launch gate —
-- see the INC-10 note in delivery-plan.md §7 for why.
--
-- Question types: single_choice, multi_choice, rating (fixed 1-5 scale),
-- text (open comment box). Each survey_question stores its options as
-- jsonb (an array of {fil, en} label pairs for choice types; unused for
-- rating/text) so question sets are variable-length without a join table
-- per option. Each survey_answer stores a single jsonb `value` whose
-- shape depends on the question's type (string for single_choice/text,
-- string[] for multi_choice, integer for rating) rather than several
-- nullable typed columns.
--
-- Visibility follows the same downward-cascading org-scope pattern as
-- INC-10's announcements (a survey posted at a city level reaches every
-- barangay beneath it), gated additionally on status: BHWs only ever see
-- `published` surveys; admins managing their own scope see every status
-- so they can build/review before publishing.
--
-- Anonymity (per-survey, admin's choice at creation): rpc_survey_respond
-- only stores respondent_user_id when the survey is NOT anonymous — for
-- an anonymous survey it is never written in the first place, not merely
-- hidden in the UI, so there's no column to accidentally expose later.
-- For the same reason, response submission does NOT write an
-- audit_events row: audit_events.actor_user_id would itself be a
-- re-identification channel for an "anonymous" response, defeating the
-- point. Only the admin governance actions (create/publish/close/delete)
-- are audited, matching how the rest of the §5.6 taxonomy is scoped to
-- admin actions rather than routine BHW usage events.
--
-- Ships behind the `surveys` feature flag, defaulted to false (dark
-- launch), same convention as `announcements`.
--
-- Known v1 gap: nothing prevents the same identified respondent from
-- submitting a survey more than once (no unique constraint on
-- (survey_id, respondent_user_id) — anonymous responses have no
-- respondent_user_id to key off of anyway). Out of scope for this pass;
-- flagged here rather than silently accepted.
-- ---------------------------------------------------------------------

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  org_unit_id uuid not null references public.org_units (id),
  author_user_id uuid not null references public.users (id),
  title_fil text not null,
  title_en text not null,
  description_fil text not null default '',
  description_en text not null default '',
  is_anonymous boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists surveys_org_unit_id_idx on public.surveys using btree (org_unit_id);

drop trigger if exists surveys_set_updated_at on public.surveys;
create trigger surveys_set_updated_at
  before update on public.surveys
  for each row execute function public.set_updated_at();

alter table public.surveys enable row level security;

create table if not exists public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  position integer not null default 0,
  type text not null check (type in ('single_choice', 'multi_choice', 'rating', 'text')),
  prompt_fil text not null,
  prompt_en text not null,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists survey_questions_survey_id_idx on public.survey_questions using btree (survey_id);

alter table public.survey_questions enable row level security;

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  respondent_user_id uuid references public.users (id),
  created_at timestamptz not null default now()
);

create index if not exists survey_responses_survey_id_idx on public.survey_responses using btree (survey_id);

alter table public.survey_responses enable row level security;

create table if not exists public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.survey_responses (id) on delete cascade,
  question_id uuid not null references public.survey_questions (id) on delete cascade,
  value jsonb not null
);

create index if not exists survey_answers_response_id_idx on public.survey_answers using btree (response_id);
create index if not exists survey_answers_question_id_idx on public.survey_answers using btree (question_id);

alter table public.survey_answers enable row level security;

-- ---------------------------------------------------------------------
-- RLS
--
-- org_units_read_own_scope only grants a viewer visibility into their own
-- org unit and its descendants — never ancestors. A raw `exists (select 1
-- from org_units o where ...)` inside another table's RLS policy runs as
-- the querying role, so it inherits that restriction: a barangay BHW's
-- lookup of a city-level org_units row returns nothing, silently
-- collapsing any "does this survey's org unit sit at-or-above mine" check
-- to false regardless of the actual path logic (found and fixed the same
-- way for INC-10's announcements — see that migration's org_unit_path
-- comment). Re-declared here (create or replace is idempotent) so this
-- migration doesn't depend on INC-10 having already run.
-- ---------------------------------------------------------------------

create or replace function public.org_unit_path(p_org_unit_id uuid)
returns text
language sql
stable security definer
set search_path = public
as $$
  select path from public.org_units where id = p_org_unit_id;
$$;

grant execute on function public.org_unit_path(uuid) to anon, authenticated;

drop policy if exists surveys_read_scope on public.surveys;
create policy surveys_read_scope on public.surveys for select
  using (
    (
      status = 'published'
      and (select public.current_org_path()) like (select public.org_unit_path(surveys.org_unit_id)) || '%'
    )
    or (
      (select public.current_app_user()).role = 'admin'
      and (select public.org_unit_path(surveys.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists surveys_admin_write on public.surveys;
create policy surveys_admin_write on public.surveys for all
  using (
    (select public.current_app_user()).role = 'admin'
    and (select public.org_unit_path(surveys.org_unit_id)) like (select public.current_org_path()) || '%'
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and (select public.org_unit_path(surveys.org_unit_id)) like (select public.current_org_path()) || '%'
  );

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

insert into public.feature_flags (key, enabled, description)
values ('surveys', false, 'Survey tool: multi-format questions, per-survey anonymity, admin results view.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------

create or replace function public.rpc_survey_create(
  p_org_unit_id uuid,
  p_title_fil text,
  p_title_en text,
  p_description_fil text,
  p_description_en text,
  p_is_anonymous boolean,
  p_questions jsonb -- [{type, prompt_fil, prompt_en, options}]
)
returns table (survey_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_survey_id uuid;
  v_question jsonb;
  v_position integer := 0;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if trim(coalesce(p_title_fil, '')) = '' or trim(coalesce(p_title_en, '')) = '' then
    raise exception 'title is required';
  end if;

  if jsonb_array_length(coalesce(p_questions, '[]'::jsonb)) = 0 then
    raise exception 'at least one question is required';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = p_org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'org unit out of scope';
  end if;

  insert into public.surveys (org_unit_id, author_user_id, title_fil, title_en, description_fil, description_en, is_anonymous)
  values (p_org_unit_id, v_actor.id, p_title_fil, p_title_en, coalesce(p_description_fil, ''), coalesce(p_description_en, ''), p_is_anonymous)
  returning id into v_survey_id;

  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    if not (v_question ->> 'type' in ('single_choice', 'multi_choice', 'rating', 'text')) then
      raise exception 'invalid question type';
    end if;

    insert into public.survey_questions (survey_id, position, type, prompt_fil, prompt_en, options)
    values (
      v_survey_id,
      v_position,
      v_question ->> 'type',
      v_question ->> 'prompt_fil',
      v_question ->> 'prompt_en',
      coalesce(v_question -> 'options', '[]'::jsonb)
    );
    v_position := v_position + 1;
  end loop;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'survey.created', 'survey', v_survey_id,
    format('Gumawa si %s ng bagong survey.', v_actor.username),
    format('%s created a new survey.', v_actor.username));

  return query select v_survey_id;
end;
$$;

create or replace function public.rpc_survey_set_status(p_survey_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_survey public.surveys;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if p_status not in ('draft', 'published', 'closed') then
    raise exception 'invalid status';
  end if;

  select * into v_survey from public.surveys where id = p_survey_id;
  if v_survey is null then
    raise exception 'survey not found';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_survey.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'not authorized';
  end if;

  update public.surveys set status = p_status, updated_at = now() where id = p_survey_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (
    v_actor.id,
    case p_status when 'published' then 'survey.published' when 'closed' then 'survey.closed' else 'survey.updated' end,
    'survey', p_survey_id,
    format('Binago ni %s ang status ng survey tungong "%s".', v_actor.username, p_status),
    format('%s changed a survey''s status to "%s".', v_actor.username, p_status)
  );
end;
$$;

create or replace function public.rpc_survey_delete(p_survey_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_survey public.surveys;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_survey from public.surveys where id = p_survey_id;
  if v_survey is null then
    raise exception 'survey not found';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_survey.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'not authorized';
  end if;

  delete from public.surveys where id = p_survey_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'survey.deleted', 'survey', p_survey_id,
    format('Nagtanggal si %s ng isang survey.', v_actor.username),
    format('%s deleted a survey.', v_actor.username));
end;
$$;

create or replace function public.rpc_survey_respond(
  p_survey_id uuid,
  p_answers jsonb -- [{question_id, value}]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_survey public.surveys;
  v_response_id uuid;
  v_answer jsonb;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  select * into v_survey from public.surveys where id = p_survey_id and status = 'published';
  if v_survey is null then
    raise exception 'survey not found';
  end if;

  if not exists (
    select 1 from public.org_units o
    where o.id = v_survey.org_unit_id
      and (select public.current_org_path()) like o.path || '%'
  ) then
    raise exception 'not authorized';
  end if;

  if jsonb_array_length(coalesce(p_answers, '[]'::jsonb)) = 0 then
    raise exception 'at least one answer is required';
  end if;

  insert into public.survey_responses (survey_id, respondent_user_id)
  values (p_survey_id, case when v_survey.is_anonymous then null else v_actor.id end)
  returning id into v_response_id;

  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    if not exists (select 1 from public.survey_questions where id = (v_answer ->> 'question_id')::uuid and survey_id = p_survey_id) then
      raise exception 'invalid question';
    end if;

    insert into public.survey_answers (response_id, question_id, value)
    values (v_response_id, (v_answer ->> 'question_id')::uuid, v_answer -> 'value');
  end loop;

  -- Deliberately no audit_events row here — see the migration header
  -- comment on why response submission stays out of the audit trail.
end;
$$;

revoke execute on function public.rpc_survey_create(uuid, text, text, text, text, boolean, jsonb) from public, anon;
revoke execute on function public.rpc_survey_set_status(uuid, text) from public, anon;
revoke execute on function public.rpc_survey_delete(uuid) from public, anon;
revoke execute on function public.rpc_survey_respond(uuid, jsonb) from public, anon;
grant execute on function public.rpc_survey_create(uuid, text, text, text, text, boolean, jsonb) to authenticated;
grant execute on function public.rpc_survey_set_status(uuid, text) to authenticated;
grant execute on function public.rpc_survey_delete(uuid) to authenticated;
grant execute on function public.rpc_survey_respond(uuid, jsonb) to authenticated;
