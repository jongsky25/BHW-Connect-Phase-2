-- Learners receive stems and options through explicit safe projections.
-- Keep assessor qualification and scoped facilitator key access intact.
create function public.rpc_course_test_question_delivery(p_course_id uuid)
returns table(id uuid, course_id uuid, "position" integer, prompt_fil text, prompt_en text, options jsonb)
language plpgsql security definer set search_path = '' as $$
declare v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'bhw' or v_actor.status <> 'active' then
    raise exception 'not authorized';
  end if;
  if not exists (select 1 from public.courses c join public.org_units o on o.id = c.org_unit_id
    where c.id = p_course_id and c.status = 'published'
      and public.current_org_path() like o.path || '%') then
    raise exception 'course unavailable';
  end if;
  return query select q.id, q.course_id, q.position, q.prompt_fil, q.prompt_en, q.options
    from public.course_test_questions_current q
    where q.course_id = p_course_id order by q.position;
end;
$$;
revoke execute on function public.rpc_course_test_question_delivery(uuid) from public, anon;
grant execute on function public.rpc_course_test_question_delivery(uuid) to authenticated;

create function public.rpc_course_test_bank_available(p_course_ids uuid[])
returns table(course_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'bhw' or v_actor.status <> 'active' then
    raise exception 'not authorized';
  end if;
  if coalesce(pg_catalog.array_length(p_course_ids, 1), 0) > 100 then
    raise exception 'too many courses';
  end if;
  return query select distinct q.course_id from public.course_test_questions_current q
    join public.courses c on c.id = q.course_id
    join public.org_units o on o.id = c.org_unit_id
    where q.course_id = any(p_course_ids) and c.status = 'published'
      and public.current_org_path() like o.path || '%';
end;
$$;
revoke execute on function public.rpc_course_test_bank_available(uuid[]) from public, anon;
grant execute on function public.rpc_course_test_bank_available(uuid[]) to authenticated;

-- The old learner policy exposed correct_option_index through both the raw
-- table and the security-invoker current view. Restrict that policy to
-- non-learners after both learner readers above have been deployed.
drop policy if exists course_test_questions_read on public.course_test_questions;
create policy course_test_questions_read on public.course_test_questions for select to authenticated
  using (
    (select public.current_app_user()).role <> 'bhw'
    and exists (
      select 1 from public.courses c
      where c.id = course_test_questions.course_id
        and ((c.status = 'published'
          and (select public.current_org_path()) like (select public.org_unit_path(c.org_unit_id)) || '%')
          or ((select public.current_app_user()).role = 'admin'
            and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'))
    )
  );
