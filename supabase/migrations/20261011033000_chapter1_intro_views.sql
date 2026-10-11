-- Record the first opening of each major introduction for this learner/course.
-- The RPC returns true exactly once, so direct lesson links and other devices
-- follow the same introduction journey.
create table learner_assessment_private.major_intro_views (
  learner_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  intro_id text not null check (intro_id ~ '^chapter1-major-[1-9]-introduction$'),
  first_opened_at timestamptz not null default now(),
  primary key (learner_id, course_id, intro_id)
);
alter table learner_assessment_private.major_intro_views enable row level security;
revoke all on learner_assessment_private.major_intro_views from public, anon, authenticated;
grant select, insert, delete on learner_assessment_private.major_intro_views to service_role;

create function public.rpc_chapter_intro_open(p_course_id uuid, p_intro_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_count integer;
begin
  v_actor := learner_assessment_private.actor_for_course(p_course_id);
  if p_intro_id is null or p_intro_id !~ '^chapter1-major-[1-9]-introduction$' then
    raise exception 'invalid introduction';
  end if;
  insert into learner_assessment_private.major_intro_views(learner_id,course_id,intro_id)
    values(v_actor,p_course_id,p_intro_id) on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;
revoke execute on function public.rpc_chapter_intro_open(uuid,text) from public,anon;
grant execute on function public.rpc_chapter_intro_open(uuid,text) to authenticated;

-- Resetting course progress should make its introductions available again.
create or replace function public.rpc_course_progress_reset(p_course_id uuid, p_bhw_user_id uuid)
returns table(had_progress boolean, modules_cleared integer, test_attempts_cleared integer)
language plpgsql security definer set search_path = '' as $$
declare v_v2_attempts integer; v_notes integer; v_practice integer; v_intros integer;
begin
  select r.had_progress, r.modules_cleared, r.test_attempts_cleared
    into had_progress, modules_cleared, test_attempts_cleared
    from public.rpc_course_progress_reset_legacy_impl(p_course_id, p_bhw_user_id) r;
  delete from learner_assessment_private.attempts
    where course_id = p_course_id and learner_id = p_bhw_user_id;
  get diagnostics v_v2_attempts = row_count;
  delete from learner_assessment_private.enrollments
    where course_id = p_course_id and learner_id = p_bhw_user_id;
  delete from learner_assessment_private.practice_attempts
    where course_id = p_course_id and learner_id = p_bhw_user_id and state = 'in_progress';
  get diagnostics v_practice = row_count;
  delete from learner_assessment_private.reflection_drafts d
    where d.course_id = p_course_id and d.learner_id = p_bhw_user_id
      and not exists (select 1 from learner_assessment_private.reflection_versions v
        where v.draft_id = d.id);
  get diagnostics v_notes = row_count;
  delete from learner_assessment_private.major_intro_views
    where course_id = p_course_id and learner_id = p_bhw_user_id;
  get diagnostics v_intros = row_count;
  if v_v2_attempts + v_practice + v_notes + v_intros > 0 then had_progress := true; end if;
  return next;
end;
$$;
